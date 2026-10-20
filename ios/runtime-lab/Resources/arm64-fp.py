"""Instruction-level FP regressions; execute only in the Alpine ARM64 guest."""
import ctypes
import math
import mmap
import os
import struct
from pathlib import Path

if os.uname().sysname != 'Linux' or os.uname().machine != 'aarch64' or not Path('/etc/alpine-release').is_file():
    raise SystemExit('arm64-fp must run inside the ARM64 Alpine Linux guest')


RET = 0xD65F03C0
# Every function has its own address; never overwrite translated instructions.
code = mmap.mmap(-1, 131072, prot=mmap.PROT_READ | mmap.PROT_WRITE | mmap.PROT_EXEC)
base = ctypes.addressof(ctypes.c_char.from_buffer(code))


def function(words, result, *arguments):
    offset = code.tell()
    raw = b''.join(struct.pack('<I', word) for word in (*words, RET))
    code.write(raw + bytes((-len(raw)) % 16))
    return ctypes.CFUNCTYPE(result, *arguments)(base + offset)


def assert_equal(actual, expected, label):
    if actual != expected:
        raise AssertionError(f'{label}: actual={actual!r}, expected={expected!r}')


# Independent numerical oracle: sign * (16+fraction) * 2**exponent.
# The implementation under test instead expands the IEEE exponent bit fields.
forms = ('s', 'd', '2s', '4s', '2d')
for form in forms:
    for imm in range(256):
        exponent = ((imm >> 4) & 3) - (7 if imm & 0x40 else 3)
        value = math.ldexp(16 + (imm & 15), exponent)
        if imm & 0x80:
            value = -value
        single = form in ('s', '2s', '4s')
        element = struct.pack('<f' if single else '<d', value)
        lanes = {'s': 1, 'd': 1, '2s': 2, '4s': 4, '2d': 2}[form]
        expected = (element * lanes).ljust(16, b'\0')
        if form in ('s', 'd'):
            instruction = 0x1E201000 | ((form == 'd') << 22) | (imm << 13)
        else:
            instruction = (0x0F00F400 | ((form != '2s') << 30)
                           | ((form == '2d') << 29)
                           | ((imm >> 5) << 16) | ((imm & 31) << 5))
        # Seed all128 bits, FMOV V0, then store Q0 to check lane clearing too.
        run = function((0x3DC00000, instruction, 0x3D800000), None, ctypes.c_void_p)
        output = (ctypes.c_ubyte * 16)(*([255] * 16))
        run(ctypes.addressof(output))
        assert_equal(bytes(output), expected, f'FMOV {form} imm={imm:02x}')
    print(f'arm64_fp_immediate_ok form={form} count=256', flush=True)


values = (-float('inf'), -1e30, -4294967296.0, -2147483649.0,
          -2147483648.0, -2147483647.0, -7.75, -7.0, -0.75, -0.0,
          0.0, 0.75, 7.75, 2147483647.0, 2147483648.0, 4294967295.0,
          4294967296.0, 1e30, float('inf'), float('nan'))
conversion_count = 0
for single in (False, True):
    argument = ctypes.c_float if single else ctypes.c_double
    for width in (32, 64):
        for unsigned in (False, True):
            for fractional_bits in (0, 1, 16, 32):
                # FCVTZ{S,U} W0/X0,S0/D0[,#fbits].
                instruction = (0x1E000000 | ((width == 64) << 31)
                               | ((not single) << 22) | (3 << 19)
                               | (unsigned << 16))
                if fractional_bits:
                    instruction |= (64 - fractional_bits) << 10
                else:
                    instruction |= 1 << 21
                run = function((instruction,), ctypes.c_uint64, argument)
                minimum = 0 if unsigned else -(1 << (width - 1))
                maximum = (1 << (width if unsigned else width - 1)) - 1
                for original in values:
                    value = argument(original).value
                    scaled = math.ldexp(value, fractional_bits)
                    if math.isnan(scaled):
                        expected = 0
                    elif scaled <= minimum:
                        expected = minimum
                    elif scaled >= maximum:
                        expected = maximum
                    else:
                        expected = math.trunc(scaled)
                    # W writes zero upper32 even when the signed result <0.
                    expected &= (1 << width) - 1
                    assert_equal(run(value), expected,
                                 f'FCVTZ unsigned={unsigned} width={width} single={single} '
                                 f'fbits={fractional_bits} value={value}')
                    conversion_count += 1
print(f'arm64_fp_conversion_ok count={conversion_count}', flush=True)


# Negative int32 number boxing must preserve the tag in the upper32 bits.
# FCVTZS W0,D0; MOVZ X1,#0xfffe,LSL#48; ORR X0,X0,X1.
box = function((0x1E780000, 0xD2FFFFC1, 0xAA010000), ctypes.c_uint64, ctypes.c_double)
assert_equal(box(-7.0), 0xFFFE0000FFFFFFF9, 'negative int32 tag composition')
# FCVTZS W0,D0; SCVTF D0,W0: the zero-extended W bits still convert signed.
roundtrip = function((0x1E780000, 0x1E620000), ctypes.c_double, ctypes.c_double)
assert_equal(roundtrip(-7.0), -7.0, 'negative int32 roundtrip')
# SXTW is explicit when the caller needs a signed64-bit value.
extend = function((0x1E780000, 0x93407C00), ctypes.c_int64, ctypes.c_double)
assert_equal(extend(-7.0), -7, 'explicit SXTW after FCVTZS W')
print('arm64_fp_negative_box_ok', flush=True)
print('arm64_fp_ok', flush=True)
