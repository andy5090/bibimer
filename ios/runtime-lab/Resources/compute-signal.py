"""Guest ARM64 compute loops must be preemptible without guest syscalls."""
import ctypes
import mmap
import os
import select
import signal
import struct
import threading
import time
from pathlib import Path

if os.uname().sysname != 'Linux' or os.uname().machine != 'aarch64' or not Path('/etc/alpine-release').is_file():
    raise SystemExit('compute-signal must run inside the ARM64 Alpine Linux guest')


# B .; BR x0; BL leaf / RET / leaf: RET. The last case stays in the return
# cache after warmup. These are guest instructions, never native host code.
PROGRAMS = ((0x14000000,), (0xD61F0000,), (0x94000002, 0xD65F03C0, 0xD65F03C0))


def compute(write_fd, mode):
    code = mmap.mmap(-1, mmap.PAGESIZE, prot=mmap.PROT_READ | mmap.PROT_WRITE | mmap.PROT_EXEC)
    raw = b''.join(struct.pack('<I', word) for word in PROGRAMS[mode])
    code.write(raw)
    address = ctypes.addressof(ctypes.c_char.from_buffer(code))
    function = ctypes.CFUNCTYPE(None, ctypes.c_void_p)(address)
    os.write(write_fd, (str(threading.get_native_id()) + '\n').encode())
    function(address)
    os._exit(90)  # An infinite guest loop must never return normally.


def spawn_group(process_count, thread_count, exit_leader=False):
    read_fd, write_fd = os.pipe()
    leader = os.fork()
    if leader == 0:
        os.close(read_fd)
        os.setsid()
        # Fork before creating Python threads, avoiding inherited GIL locks.
        position = 0
        for index in range(1, process_count):
            if os.fork() == 0:
                position = index
                break
        for index in range(1, thread_count):
            threading.Thread(target=compute, args=(write_fd, (position + index) % 3), daemon=True).start()
        if exit_leader:
            os.write(write_fd, (str(threading.get_native_id()) + '\n').encode())
            # Raw Linux SYS_exit ends only this thread. libc _exit/os._exit
            # would call exit_group and invalidate the regression.
            ctypes.CDLL(None).syscall(ctypes.c_long(93), ctypes.c_int(0))
        else:
            compute(write_fd, position % 3)
        os._exit(91)
    os.close(write_fd)
    return leader, read_fd, process_count * thread_count


def collect_ready(group):
    leader, read_fd, count = group
    data = b''
    deadline = time.monotonic() + 12
    try:
        while data.count(b'\n') < count and time.monotonic() < deadline:
            if select.select([read_fd], [], [], 0.1)[0]:
                chunk = os.read(read_fd, 4096)
                if not chunk:
                    break
                data += chunk
    finally:
        os.close(read_fd)
    tasks = [int(line) for line in data.splitlines()]
    if len(tasks) != count or len(set(tasks)) != count:
        raise AssertionError(f'compute group {leader} did not start: {tasks}, expected {count}')
    return tasks


def exists(tid):
    try:
        os.kill(tid, 0)
        return True
    except ProcessLookupError:
        return False


def stop(group, tasks, direct=False):
    leader = group[0]
    started = time.monotonic()
    (os.kill if direct else os.killpg)(leader, signal.SIGKILL)
    status = None
    remaining = tasks
    while time.monotonic() - started < 5:
        if status is None:
            pid, value = os.waitpid(leader, os.WNOHANG)
            if pid:
                status = value
        remaining = [tid for tid in tasks if exists(tid)]
        if status is not None and not remaining:
            break
        time.sleep(0.01)
    elapsed = time.monotonic() - started
    if status is None or remaining:
        raise AssertionError(f'SIGKILL exceeded 5s: leader={leader}, status={status}, remaining={remaining}')
    if not os.WIFSIGNALED(status) or os.WTERMSIG(status) != signal.SIGKILL:
        raise AssertionError(f'Unexpected compute exit status: {status}')
    print(f'compute_killpg_ok tasks={len(tasks)} elapsed={elapsed:.3f}', flush=True)


# Missing process groups must return ESRCH without corrupting pids_lock.
try:
    os.killpg(2147483647, 0)
except ProcessLookupError:
    pass
else:
    raise AssertionError('Nonexistent process group accepted')

groups = []
try:
    # All groups descend from the same CPU. Before the fix they inherit the
    # same poke pointer and can consume a sibling's wakeup while computing.
    for dimensions in ((1, 3), (3, 3), (1, 3)):
        group = spawn_group(*dimensions)
        groups.append((group, []))
        groups[-1] = (group, collect_ready(group))
    time.sleep(0.15)  # Allow direct/indirect/return paths to become cached.
    stop(*groups[1])
    groups.pop(1)
    for group, tasks in groups:
        if not all(exists(tid) for tid in tasks):
            raise AssertionError('Killing one process group affected a competing group')
    print('compute_sibling_groups_survived_ok', flush=True)
    while groups:
        stop(*groups[-1])
        groups.pop()
    for direct in (False, True):
        group = spawn_group(1, 3, exit_leader=True)
        groups.append((group, []))
        tasks = collect_ready(group)
        groups[-1] = (group, tasks)
        deadline = time.monotonic() + 5
        while time.monotonic() < deadline:
            try:
                state = Path(f'/proc/{group[0]}/stat').read_text().rsplit(')', 1)[1].split()[0]
            except (FileNotFoundError, ProcessLookupError):
                break  # Embedded procfs hides a task after its thread exits.
            if state == 'Z':
                break  # Linux keeps the dead leader as a zombie until group exit.
            time.sleep(0.01)
        else:
            raise AssertionError('Leader SYS_exit did not finish')
        if os.waitpid(group[0], os.WNOHANG)[0] != 0:
            raise AssertionError('Leader exit terminated its live worker group')
        if not all(exists(tid) for tid in tasks if tid != group[0]):
            raise AssertionError('No live workers after leader exit')
        stop(group, tasks, direct=direct)
        groups.pop()
        print('compute_dead_leader_' + ('kill' if direct else 'killpg') + '_ok', flush=True)
    print('compute_signal_ok', flush=True)
finally:
    for group, tasks in groups:
        try:
            os.killpg(group[0], signal.SIGKILL)
        except ProcessLookupError:
            pass
