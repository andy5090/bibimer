"""Linux guest epoll regression: fd-number/OFD keys and registration lifetime."""
import ctypes
import errno
import os
import select
import socket
import threading
import time
import tty

libc = ctypes.CDLL(None, use_errno=True)


class Event(ctypes.Structure):
    # Linux arm64 epoll_event is naturally aligned; x86-64 uses packed layout.
    _fields_ = [('events', ctypes.c_uint32), ('data', ctypes.c_uint64)]


libc.epoll_create1.argtypes = [ctypes.c_int]
libc.epoll_create1.restype = ctypes.c_int
libc.epoll_ctl.argtypes = [ctypes.c_int, ctypes.c_int, ctypes.c_int, ctypes.POINTER(Event)]
libc.epoll_ctl.restype = ctypes.c_int
libc.epoll_wait.argtypes = [ctypes.c_int, ctypes.POINTER(Event), ctypes.c_int, ctypes.c_int]
libc.epoll_wait.restype = ctypes.c_int
ADD, DELETE, MODIFY = 1, 2, 3
READ, WRITE, ONESHOT = 1, 4, 1 << 30


def expect(condition, message):
    if not condition:
        raise AssertionError(message)


def create():
    fd = libc.epoll_create1(0)
    expect(fd >= 0, f'epoll_create1: {ctypes.get_errno()}')
    return fd


def ctl(ep, op, fd, mask=READ, data=0, error=0):
    event = Event(mask, data)
    result = libc.epoll_ctl(ep, op, fd, None if op == DELETE else ctypes.byref(event))
    observed = ctypes.get_errno() if result < 0 else 0
    expect(observed == error, f'ctl({op}, {fd}, {mask:#x}): errno {observed}, expected {error}')


def wait(ep, timeout=1000, maximum=16):
    events = (Event * maximum)()
    count = libc.epoll_wait(ep, events, maximum, timeout)
    expect(count >= 0, f'epoll_wait: {ctypes.get_errno()}')
    return [(events[i].data, events[i].events) for i in range(count)]


def both(ep, expected):
    found = wait(ep)
    expect({data for data, mask in found} == set(expected), f'events {found!r}, wanted {expected!r}')
    expect(all(mask & READ for data, mask in found), f'missing EPOLLIN: {found!r}')


def aliases(kind, make):
    read_fd, write_fd, release = make()
    duplicate = os.dup(read_fd)
    ep = create()
    try:
        a, b, c = 0x123456789abcdef0, 0xfedcba9876543210, 0x1122334455667788
        ctl(ep, ADD, read_fd, data=a)
        ctl(ep, ADD, duplicate, data=b)
        ctl(ep, ADD, read_fd, error=errno.EEXIST)
        # Sleep in the host poll before readiness changes. A shared kqueue key
        # would let MOD on one alias silently remove the other's host watch.
        for disabled, expected in [(duplicate, a), (read_fd, b)]:
            ctl(ep, MODIFY, read_fd, data=a)
            ctl(ep, MODIFY, duplicate, data=b)
            ctl(ep, MODIFY, disabled, mask=0, data=a if disabled == read_fd else b)
            def delayed_write():
                time.sleep(0.03)
                os.write(write_fd, b'w')
            writer = threading.Thread(target=delayed_write)
            writer.start()
            found = wait(ep, 500)
            writer.join(2)
            expect({data for data, mask in found} == {expected},
                   f'{kind} host alias watch lost: {found!r}')
            expect(os.read(duplicate, 1) == b'w', kind + ' delayed data')
        ctl(ep, MODIFY, read_fd, data=a)
        ctl(ep, MODIFY, duplicate, data=b)
        os.write(write_fd, b'x')
        both(ep, [a, b])
        ctl(ep, MODIFY, duplicate, mask=0, data=c)
        both(ep, [a])
        ctl(ep, MODIFY, duplicate, data=c)
        both(ep, [a, c])
        ctl(ep, DELETE, duplicate)
        ctl(ep, DELETE, duplicate, error=errno.ENOENT)
        both(ep, [a])
        ctl(ep, ADD, duplicate, data=b)
        os.close(read_fd)
        read_fd = -1
        both(ep, [a, b])  # Original numeric key survives while its OFD has aliases.
        ctl(ep, DELETE, duplicate)
        both(ep, [a])
        expect(os.read(duplicate, 1) == b'x', kind + ' data')
        os.close(duplicate)
        duplicate = -1
        expect(wait(ep, 0) == [], kind + ' final OFD close left registration')
    finally:
        for fd in (read_fd, duplicate, ep):
            if fd >= 0:
                os.close(fd)
        release()
    print('epoll_alias_' + kind + '_ok', flush=True)


def pipe_pair():
    read_fd, write_fd = os.pipe()
    return read_fd, write_fd, lambda: os.close(write_fd)


def socket_pair():
    first, second = socket.socketpair()
    read_fd, write_fd = first.detach(), second.detach()
    return read_fd, write_fd, lambda: os.close(write_fd)


def pty_pair():
    master, slave = os.openpty()
    tty.setraw(slave)
    return master, slave, lambda: os.close(slave)


def validation():
    ep = create()
    alias = os.dup(ep)
    read_fd, write_fd = os.pipe()
    try:
        ctl(ep, 0, read_fd, error=errno.EINVAL)
        ctl(ep, 4, read_fd, error=errno.EINVAL)
        ctl(ep, ADD, ep, error=errno.EINVAL)
        ctl(ep, ADD, alias, error=errno.EINVAL)
        ctl(ep, ADD, -1, error=errno.EBADF)
        ctl(read_fd, ADD, write_fd, error=errno.EINVAL)
        ctl(ep, MODIFY, read_fd, error=errno.ENOENT)
    finally:
        for fd in (ep, alias, read_fd, write_fd):
            os.close(fd)
    print('epoll_validation_ok', flush=True)


def reused_number():
    ep = create()
    original, writer = os.pipe()
    alias = os.dup(original)
    second, writer2 = os.pipe()
    try:
        ctl(ep, ADD, original, data=11)
        os.dup2(second, original)  # Same numeric fd, different OFD.
        ctl(ep, ADD, original, data=22)
        os.write(writer, b'a')
        os.write(writer2, b'b')
        both(ep, [11, 22])
        ctl(ep, MODIFY, original, data=33)
        both(ep, [11, 33])
        ctl(ep, DELETE, original)
        both(ep, [11])
        os.close(alias)
        alias = -1
        expect(wait(ep, 0) == [], 'old OFD survived final alias close')
    finally:
        for fd in (ep, original, writer, alias, second, writer2):
            if fd >= 0:
                os.close(fd)
    print('epoll_number_reuse_ok', flush=True)


def oneshot():
    ep = create()
    read_fd, write_fd = os.pipe()
    try:
        ctl(ep, ADD, read_fd, READ | ONESHOT, 123)
        os.write(write_fd, b'x')
        both(ep, [123])
        expect(wait(ep, 0) == [], 'ONESHOT delivered twice')
        ctl(ep, ADD, read_fd, error=errno.EEXIST)
        ctl(ep, MODIFY, read_fd, READ | ONESHOT, 456)
        both(ep, [456])
        expect(wait(ep, 0) == [], 'rearmed ONESHOT delivered twice')
        ctl(ep, DELETE, read_fd)
    finally:
        for fd in (ep, read_fd, write_fd):
            os.close(fd)
    print('epoll_oneshot_ok', flush=True)


def concurrent_add():
    for same_key in (True, False):
        ep = create()
        read_fd, write_fd = os.pipe()
        alias = os.dup(read_fd)
        barrier = threading.Barrier(3)
        outcomes = []

        def add(fd, data):
            event = Event(READ, data)
            barrier.wait()
            result = libc.epoll_ctl(ep, ADD, fd, ctypes.byref(event))
            outcomes.append(ctypes.get_errno() if result < 0 else 0)

        threads = [threading.Thread(target=add, args=(read_fd, 1)),
                   threading.Thread(target=add, args=(read_fd if same_key else alias, 2))]
        try:
            for thread in threads:
                thread.start()
            barrier.wait()
            for thread in threads:
                thread.join(5)
                expect(not thread.is_alive(), 'concurrent ADD deadlock')
            expect(sorted(outcomes) == ([0, errno.EEXIST] if same_key else [0, 0]),
                   f'concurrent ADD outcomes: {outcomes}')
            os.write(write_fd, b'x')
            events = wait(ep)
            expect(len(events) == (1 if same_key else 2), f'concurrent ADD events: {events}')
            if not same_key:
                expect({data for data, mask in events} == {1, 2}, 'concurrent userdata')
        finally:
            for fd in (ep, read_fd, write_fd, alias):
                os.close(fd)
    print('epoll_concurrent_add_ok', flush=True)


def concurrent_wait_close():
    # Exercise stale host event pointers while registrations are removed/reused.
    ep = create()
    errors = []
    stop = threading.Event()

    def waiter():
        try:
            while not stop.is_set():
                wait(ep, 10)
        except BaseException as error:
            errors.append(repr(error))

    workers = [threading.Thread(target=waiter) for _ in range(2)]
    for worker in workers:
        worker.start()
    try:
        for index in range(80):
            read_fd, write_fd = os.pipe()
            alias = os.dup(read_fd)
            ctl(ep, ADD, read_fd, data=index * 2)
            ctl(ep, ADD, alias, data=index * 2 + 1)
            os.write(write_fd, b'x')
            ctl(ep, DELETE, alias)
            os.close(read_fd)
            os.close(alias)
            os.close(write_fd)
    finally:
        stop.set()
        for worker in workers:
            worker.join(5)
            expect(not worker.is_alive(), 'wait/close deadlock')
        os.close(ep)
    expect(not errors, f'wait/close errors: {errors}')
    print('epoll_concurrent_wait_close_ok', flush=True)


validation()
for kind, make in [('pipe', pipe_pair), ('socket', socket_pair), ('pty', pty_pair)]:
    aliases(kind, make)
reused_number()
oneshot()
concurrent_add()
concurrent_wait_close()
print('epoll_runtime_ok', flush=True)
