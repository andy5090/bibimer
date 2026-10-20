"""Guest regression for prctl parent-death signals required by Codex helpers."""
import ctypes
import errno
import os
import select
import signal
import threading
import time

libc = ctypes.CDLL(None, use_errno=True)
libc.prctl.restype = ctypes.c_int


def setting():
    result = ctypes.c_int(-1)
    if libc.prctl(2, ctypes.byref(result), 0, 0, 0):
        raise RuntimeError('PR_GET_PDEATHSIG failed')
    return result.value


def expect(condition, message):
    if not condition:
        raise RuntimeError(message)


for invalid in (64, 65, -1):
    expect(libc.prctl(1, invalid, 0, 0, 0) == -1 and ctypes.get_errno() == errno.EINVAL, 'invalid or unsupported signal')
expect(libc.prctl(2, 0, 0, 0, 0) == -1 and ctypes.get_errno() == errno.EFAULT, 'invalid output pointer')
expect(libc.prctl(1, signal.SIGTERM, 0, 0, 0) == 0 and setting() == signal.SIGTERM, 'set/get')
child = os.fork()
if child == 0:
    os._exit(0 if setting() == 0 else 1)
expect(os.waitpid(child, 0)[1] == 0, 'fork did not clear setting')
expect(libc.prctl(1, 0, 0, 0, 0) == 0 and setting() == 0, 'clear')
child = os.fork()
if child == 0:
    libc.prctl(1, signal.SIGTERM, 0, 0, 0)
    os.seteuid(65534)
    os._exit(0 if setting() == 0 else 1)
expect(os.waitpid(child, 0)[1] == 0, 'credential change did not clear setting')


def death_case(thread_parent=False):
    output_r, output_w = os.pipe()

    def creator():
        ready_r, ready_w = os.pipe()
        child = os.fork()
        if child == 0:
            os.close(ready_r)
            def died(*_):
                os.write(output_w, b'signal\n')
                os._exit(0)
            signal.signal(signal.SIGUSR1, died)
            previous_mask = signal.pthread_sigmask(signal.SIG_BLOCK, {signal.SIGUSR1})
            expect(libc.prctl(1, signal.SIGUSR1, 0, 0, 0) == 0, 'child set failed')
            os.write(ready_w, b'r')
            # Python's C handler only marks its Python callback as pending.
            # An unblocked signal just before pause() can therefore leave the
            # callback deferred forever. Atomically unblock and wait instead.
            suspend_mask = (ctypes.c_ulong * 16)()  # Linux sigset_t, 128 bytes
            expect(libc.sigemptyset(ctypes.byref(suspend_mask)) == 0, 'empty signal mask')
            for blocked_signal in previous_mask:
                if blocked_signal != signal.SIGUSR1:
                    expect(libc.sigaddset(ctypes.byref(suspend_mask), blocked_signal) == 0,
                           'restore signal mask')
            expect(libc.sigsuspend(ctypes.byref(suspend_mask)) == -1 and
                   ctypes.get_errno() == errno.EINTR, 'atomic signal wait')
            time.sleep(0)  # Give CPython a signal-check boundary after ctypes.
            os._exit(2)
        os.close(ready_w)
        expect(os.read(ready_r, 1) == b'r', 'child not ready')
        os.close(ready_r)

    if thread_parent:
        parent = threading.Thread(target=creator)
        parent.start()
        parent.join(timeout=10)
        expect(not parent.is_alive(), 'creator thread did not exit')
    else:
        parent = os.fork()
        if parent == 0:
            creator()
            os._exit(0)
        expect(os.waitpid(parent, 0)[1] == 0, 'creator process failed')
    try:
        expect(bool(select.select([output_r], [], [], 8)[0]), 'parent-death signal missing')
        expect(os.read(output_r, 20) == b'signal\n', 'unexpected parent-death result')
    finally:
        os.close(output_r)
        os.close(output_w)


death_case()
death_case(thread_parent=True)


def wait_child(pid, timeout=8):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        waited, status = os.waitpid(pid, os.WNOHANG)
        if waited:
            return status
        time.sleep(0.01)
    os.kill(pid, signal.SIGKILL)
    os.waitpid(pid, 0)
    raise RuntimeError('child failed to exit before deadline')


def threaded_death_case(mode):
    """A creating pthread exits while its process remains to reap the child."""
    parent = os.fork()
    if parent == 0:
        children = []
        errors = []
        creator_tid = []
        pending_r, pending_w = os.pipe()
        release_r, release_w = os.pipe()

        def child_process(ready_w):
            signal.signal(signal.SIGUSR1, signal.SIG_DFL)
            signal.pthread_sigmask(signal.SIG_BLOCK, {signal.SIGUSR1})
            if mode != 'worker_only':
                expect(libc.prctl(1, signal.SIGUSR1, 0, 0, 0) == 0, 'leader set')
            received = []
            if mode == 'coalesce':
                signal.signal(signal.SIGUSR1, lambda *_: received.append(1))
            worker_ready = threading.Event()
            late = mode in ('late_unblock', 'coalesce')

            def worker():
                if mode in ('worker_only', 'coalesce'):
                    expect(libc.prctl(1, signal.SIGUSR1, 0, 0, 0) == 0, 'worker set')
                if not late:
                    signal.pthread_sigmask(signal.SIG_UNBLOCK, {signal.SIGUSR1})
                worker_ready.set()
                if late:
                    expect(os.read(release_r, 1) == b'u', 'unblock gate')
                    signal.pthread_sigmask(signal.SIG_UNBLOCK, {signal.SIGUSR1})
                while True:
                    time.sleep(0.02)

            threading.Thread(target=worker, daemon=True).start()
            expect(worker_ready.wait(3), 'worker not ready')
            os.write(ready_w, b'r')
            if late:
                deadline = time.monotonic() + 5
                while signal.SIGUSR1 not in signal.sigpending():
                    expect(time.monotonic() < deadline, 'shared pending signal missing')
                    time.sleep(0.01)
                os.write(pending_w, b'p')
            deadline = time.monotonic() + 6
            while time.monotonic() < deadline:
                if received:
                    # Both threads installed the same standard signal while
                    # blocked; one delivery must consume the shared record.
                    time.sleep(0.2)
                    os._exit(0 if len(received) == 1 else 92)
                time.sleep(0.01)
            os._exit(93)

        def creator():
            try:
                creator_tid.append(threading.get_native_id())
                ready_r, ready_w = os.pipe()
                child = os.fork()
                if child == 0:
                    try:
                        os.close(ready_r)
                        child_process(ready_w)
                    except BaseException:
                        os._exit(94)
                children.append(child)
                os.close(ready_w)
                expect(bool(select.select([ready_r], [], [], 5)[0]), 'child readiness timeout')
                expect(os.read(ready_r, 1) == b'r', 'child readiness failed')
                os.close(ready_r)
            except BaseException as error:
                errors.append(str(error))

        try:
            thread = threading.Thread(target=creator, daemon=True)
            thread.start()
            thread.join(timeout=7)
            expect(not thread.is_alive() and not errors, 'creator failed: ' + str(errors))
            expect(len(children) == 1, 'child PID missing')
            # Python's join can finish just before the guest pthread exits.
            # AArch64 tgkill(0) confirms kernel task teardown, so coalescing is
            # tested only after both settings have generated their signals.
            deadline = time.monotonic() + 5
            while libc.syscall(131, os.getpid(), creator_tid[0], 0) != -1:
                expect(time.monotonic() < deadline, 'creator task still alive')
                time.sleep(0.01)
            expect(ctypes.get_errno() == errno.ESRCH, 'tgkill teardown check')
            if mode in ('late_unblock', 'coalesce'):
                expect(bool(select.select([pending_r], [], [], 5)[0]), 'no process pending report')
                expect(os.read(pending_r, 1) == b'p', 'bad process pending report')
                os.write(release_w, b'u')
            status = wait_child(children.pop())
            if mode == 'coalesce':
                expect(os.WIFEXITED(status) and os.WEXITSTATUS(status) == 0, 'duplicate standard signal')
            else:
                expect(os.WIFSIGNALED(status) and os.WTERMSIG(status) == signal.SIGUSR1,
                       'wrong process death status: ' + str(status))
            os._exit(0)
        except BaseException as error:
            os.write(2, ('PDEATH ' + mode + ': ' + str(error) + '\n').encode())
            for child in children:
                try:
                    os.kill(child, signal.SIGKILL)
                    os.waitpid(child, 0)
                except OSError:
                    pass
            os._exit(95)
    expect(wait_child(parent, timeout=20) == 0, mode + ' regression failed')


for mode in ('worker_only', 'blocked_leader', 'late_unblock', 'coalesce'):
    threaded_death_case(mode)
print('prctl: validation, set/get/clear, fork reset, credential reset, process/thread parent death, '
      'worker setting, worker delivery, late unblock, standard coalescing OK')
