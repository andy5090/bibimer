"""Check actual ARM64 handler SPs, not Python's deferred signal callbacks."""
import ctypes
import mmap
import os
import struct
from pathlib import Path

if os.uname().sysname != 'Linux' or os.uname().machine != 'aarch64' or not Path('/etc/alpine-release').is_file():
    raise SystemExit('signal-stack must run inside the ARM64 Alpine Linux guest')


SA_SIGINFO = 4
SA_ONSTACK = 0x08000000
SA_RESTORER = 0x04000000
SS_ONSTACK = 1
SS_DISABLE = 2
libc = ctypes.CDLL(None, use_errno=True)
libc.syscall.restype = ctypes.c_long


class Stack(ctypes.Structure):
    _fields_ = [('base', ctypes.c_void_p), ('flags', ctypes.c_int), ('size', ctypes.c_size_t)]


class Action(ctypes.Structure):
    # Linux AArch64 kernel ABI, deliberately independent of libc sigaction.
    _fields_ = [(name, ctypes.c_uint64) for name in ('handler', 'flags', 'restorer', 'mask')]


class Capture(ctypes.Structure):
    _fields_ = [('sp', ctypes.c_uint64), ('disable_result', ctypes.c_int64),
                ('stack', Stack), ('query_result', ctypes.c_int64), ('disable', Stack)]


def syscall(number, *args):
    result = libc.syscall(ctypes.c_long(number), *(ctypes.c_ulong(value) for value in args))
    if result == -1:
        raise OSError(ctypes.get_errno(), f'syscall {number}')
    return result


code = mmap.mmap(-1, 16384, prot=mmap.PROT_READ | mmap.PROT_WRITE | mmap.PROT_EXEC)
code_base = ctypes.addressof(ctypes.c_char.from_buffer(code))
alternate = mmap.mmap(-1, 131072, prot=mmap.PROT_READ | mmap.PROT_WRITE)
alternate_base = ctypes.addressof(ctypes.c_char.from_buffer(alternate))
alternate_end = alternate_base + len(alternate)


def emit(words):
    offset = code.tell()
    raw = b''.join(struct.pack('<I', word) for word in words)
    code.write(raw + bytes((-len(raw)) % 16))
    return code_base + offset


def constant(register, value):
    return [0xD2800000 | ((value & 65535) << 5) | register] + [
        0xF2800000 | (shift << 21) | (((value >> (shift * 16)) & 65535) << 5) | register
        for shift in (1, 2, 3)]


restorer = emit((0xD2801168, 0xD4000001))  # MOV X8,#139; SVC #0 (rt_sigreturn)
read_sp = ctypes.CFUNCTYPE(ctypes.c_uint64)(emit((0x910003E0, 0xD65F03C0)))
pid, tid = os.getpid(), syscall(178)


def handler(capture, *, nested=False, try_disable=False):
    words = [0x910003E9, 0xA9BF7BF3]  # Entry SP in X9; save X19 and LR.
    words += constant(19, ctypes.addressof(capture))
    words += [0xF9000269, 0xD2800000, 0x91004261, 0xD2801088,
              0xD4000001, 0xF9001660]  # Store SP; sigaltstack(NULL,&capture.stack).
    if try_disable:
        words += [0x9100C260, 0xD2800001, 0xD2801088, 0xD4000001, 0xF9000660]
    if nested:
        words += constant(0, pid) + constant(1, tid) + constant(2, 12)
        words += [0xD2801068, 0xD4000001]  # tgkill(pid,tid,SIGUSR2)
    words += [0xA8C17BF3, 0xD65F03C0]
    return emit(words)


old_actions = {}
old_stack = Stack()
syscall(132, 0, ctypes.addressof(old_stack))
for sig in (10, 12):
    old_actions[sig] = Action()
    syscall(134, sig, 0, ctypes.addressof(old_actions[sig]), 8)


def install(sig, address, onstack):
    action = Action(address, SA_SIGINFO | SA_RESTORER | (SA_ONSTACK if onstack else 0), restorer, 0)
    syscall(134, sig, ctypes.addressof(action), 0, 8)


def configure(enabled):
    stack = Stack(alternate_base if enabled else None, 0 if enabled else SS_DISABLE,
                  len(alternate) if enabled else 0)
    syscall(132, ctypes.addressof(stack), 0)


def check(capture, expected_alt, enabled, normal_sp):
    assert capture.sp, 'handler never ran'
    assert capture.query_result == 0, capture.query_result
    on_alt = alternate_base <= capture.sp < alternate_end
    assert on_alt == expected_alt, f'handler SP={capture.sp:#x}; expected_alt={expected_alt}'
    if not expected_alt:
        assert abs(capture.sp - normal_sp) < 65536, 'handler is not near the normal stack'
    assert capture.stack.flags == (SS_ONSTACK if expected_alt else (0 if enabled else SS_DISABLE))
    if enabled:
        assert capture.stack.base == alternate_base and capture.stack.size == len(alternate)


try:
    # Each invocation records the live handler SP before making any syscall.
    for enabled, onstack in ((True, False), (True, True), (False, False), (False, True)):
        configure(enabled)
        capture = Capture()
        capture.disable.flags = SS_DISABLE
        expected_alt = enabled and onstack
        install(10, handler(capture, try_disable=expected_alt), onstack)
        normal_sp = read_sp()
        syscall(131, pid, tid, 10)
        check(capture, expected_alt, enabled, normal_sp)
        if expected_alt:
            assert capture.disable_result == -1, 'disabling an active altstack must return -EPERM'
        after = Stack()
        syscall(132, 0, ctypes.addressof(after))
        assert after.flags == (0 if enabled else SS_DISABLE), 'sigreturn changed stack state'
        print(f'signal_stack_case_ok enabled={enabled} onstack={onstack}', flush=True)

    # While already on altstack, nested handlers stay below the outer frame,
    # whether or not the nested action asks for SA_ONSTACK. Never reset to top.
    for nested_onstack in (False, True):
        configure(True)
        outer, inner = Capture(), Capture()
        install(12, handler(inner), nested_onstack)
        install(10, handler(outer, nested=True), True)
        normal_sp = read_sp()
        syscall(131, pid, tid, 10)
        check(outer, True, True, normal_sp)
        check(inner, True, True, normal_sp)
        assert inner.sp < outer.sp - 16, 'nested signal overwrote outer frame'
        after = Stack()
        syscall(132, 0, ctypes.addressof(after))
        assert after.flags == 0 and after.base == alternate_base
        print(f'signal_stack_nested_ok nested_onstack={nested_onstack}', flush=True)
finally:
    for sig, action in old_actions.items():
        syscall(134, sig, ctypes.addressof(action), 0, 8)
    syscall(132, ctypes.addressof(old_stack), 0)

print('signal_stack_ok cases=6', flush=True)
