"""Concurrent lazy-page and COW faults while host wakeups interrupt workers."""
import ctypes
import mmap
import os
import signal
import struct
import threading
import time
from pathlib import Path

if os.uname().sysname != 'Linux' or os.uname().machine != 'aarch64' or not Path('/etc/alpine-release').is_file():
    raise SystemExit('memory-fault must run inside the ARM64 Alpine Linux guest')


libc = ctypes.CDLL(None, use_errno=True)
libc.mmap.argtypes = (ctypes.c_void_p, ctypes.c_size_t, ctypes.c_int, ctypes.c_int, ctypes.c_int, ctypes.c_long)
libc.mmap.restype = ctypes.c_void_p
libc.mprotect.argtypes = (ctypes.c_void_p, ctypes.c_size_t, ctypes.c_int)
libc.munmap.argtypes = (ctypes.c_void_p, ctypes.c_size_t)
PAGE = 4096
WORKERS = 8
PAGES = 128
RESERVATION = 256 * 1024 * 1024
signal.signal(signal.SIGUSR1, lambda *_: None)

# STR X3,[X0]; ADD X0,X0,X2; SUBS X1,X1,#1; B.NE loop; RET.
# ctypes releases the GIL while each guest CPU touches its own pages.
code = mmap.mmap(-1, PAGE, prot=mmap.PROT_READ | mmap.PROT_WRITE | mmap.PROT_EXEC)
code.write(struct.pack('<5I', 0xF9000003, 0x8B020000, 0xF1000421, 0x54FFFFA1, 0xD65F03C0))
touch = ctypes.CFUNCTYPE(None, ctypes.c_void_p, ctypes.c_uint64, ctypes.c_uint64, ctypes.c_uint64)(
    ctypes.addressof(ctypes.c_char.from_buffer(code)))


def exercise(address, label, seed=0):
    barrier = threading.Barrier(WORKERS + 1)
    tids = []
    failures = []

    def worker(index):
        try:
            tids.append(threading.get_native_id())
            barrier.wait(timeout=10)
            touch(address + index * PAGE, PAGES, WORKERS * PAGE, seed + index + 1)
        except BaseException as error:
            failures.append(repr(error))

    workers = [threading.Thread(target=worker, args=(index,), daemon=True) for index in range(WORKERS)]
    for thread in workers:
        thread.start()
    barrier.wait(timeout=10)
    deadline = time.monotonic() + 12
    while any(thread.is_alive() for thread in workers):
        if time.monotonic() >= deadline:
            raise AssertionError(f'{label}: concurrent first-touch timed out')
        for tid in tids:
            # Linux/aarch64 tgkill; the emulated kernel wakes the targeted host
            # pthread with SIGUSR1. ESRCH is normal after a worker finishes.
            result = libc.syscall(ctypes.c_long(131), ctypes.c_int(os.getpid()),
                                  ctypes.c_int(tid), ctypes.c_int(signal.SIGUSR1))
            if result != 0 and ctypes.get_errno() != 3:
                raise OSError(ctypes.get_errno(), 'tgkill')
        time.sleep(0.001)
    for thread in workers:
        thread.join()
    if failures:
        raise AssertionError(failures)
    for page in range(WORKERS * PAGES):
        actual = ctypes.c_uint64.from_address(address + page * PAGE).value
        if actual != seed + page % WORKERS + 1:
            raise AssertionError(f'{label}: page={page}, actual={actual}')
    print(f'memory_fault_case_ok case={label} pages={WORKERS * PAGES}', flush=True)


for iteration in range(4):
    address = libc.mmap(None, RESERVATION, 0, 0x4022, -1, 0)  # PRIVATE|ANONYMOUS|NORESERVE
    if address in (None, ctypes.c_void_p(-1).value):
        raise OSError(ctypes.get_errno(), 'mmap reservation')
    try:
        if libc.mprotect(address, RESERVATION, mmap.PROT_READ | mmap.PROT_WRITE):
            raise OSError(ctypes.get_errno(), 'mprotect reservation')
        exercise(address, f'lazy-{iteration}')
        child = os.fork()
        if child == 0:
            try:
                # Different child values distinguish a real COW write from
                # silently retaining the parent's already-populated contents.
                exercise(address, f'cow-{iteration}', seed=100)
            except BaseException:
                import traceback
                traceback.print_exc()
                os._exit(1)
            os._exit(0)
        _, status = os.waitpid(child, 0)
        if status != 0:
            raise AssertionError(f'COW child failed: {status}')
        for page in range(WORKERS * PAGES):
            if ctypes.c_uint64.from_address(address + page * PAGE).value != page % WORKERS + 1:
                raise AssertionError('COW child changed parent memory')
    finally:
        if libc.munmap(address, RESERVATION):
            raise OSError(ctypes.get_errno(), 'munmap reservation')
print('memory_fault_ok', flush=True)
