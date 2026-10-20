"""ARM64 single-structure lanes and the pinned Codex rustls gather sequence."""
import ctypes
import mmap
import os
from pathlib import Path
import struct

if os.uname().sysname != 'Linux' or os.uname().machine != 'aarch64' or not Path('/etc/alpine-release').is_file():
    raise SystemExit('arm64-simd-lanes requires the bundled ARM64 Alpine guest')

code = mmap.mmap(-1, 1048576, prot=mmap.PROT_READ | mmap.PROT_WRITE | mmap.PROT_EXEC)
base = ctypes.addressof(ctypes.c_char.from_buffer(code))


def function(words):
    offset = code.tell()
    raw = struct.pack('<' + 'I' * (len(words) + 1), *words, 0xD65F03C0)
    code.write(raw + bytes((-len(raw)) % 16))
    return ctypes.CFUNCTYPE(ctypes.c_uint64, ctypes.c_void_p, ctypes.c_void_p, ctypes.c_uint64)(base + offset)


def single(load, size, lane, count, rt, post):
    if size == 1:
        q, s, field, opcode = lane >> 3, (lane >> 2) & 1, lane & 3, 0
    elif size == 2:
        q, s, field, opcode = lane >> 2, (lane >> 1) & 1, (lane & 1) << 1, 2
    elif size == 4:
        q, s, field, opcode = lane >> 1, lane & 1, 0, 4
    else:
        q, s, field, opcode = lane, 0, 1, 4
    opcode += count >= 3
    word = (0x0D000000 | q << 30 | load << 22 | ((count - 1) & 1) << 21
            | opcode << 13 | s << 12 | field << 10 | rt)
    if post:
        word |= 1 << 23 | (31 if post == 'immediate' else 2) << 16
    return word


failures, checks = [], 0
for load in (False, True):
    for size in (1, 2, 4, 8):
        for count in (1, 2, 3, 4):
            for rt in (0, 31):
                for lane in range(16 // size):
                    for post in (None, 'immediate', 'register'):
                        registers = [(rt + i) % 32 for i in range(count)]
                        words = [0x3DC00000 | i << 10 | 1 << 5 | r for i, r in enumerate(registers)]
                        words.append(single(load, size, lane, count, rt, post))
                        words += [0x3D800000 | i << 10 | 1 << 5 | r for i, r in enumerate(registers)]
                        run = function(words)
                        memory = (ctypes.c_ubyte * 96)(*(i + 31 for i in range(96)))
                        vectors = (ctypes.c_ubyte * (16 * count))(*(i + 151 for i in range(16 * count)))
                        expected_memory, expected_vectors = bytearray(memory), bytearray(vectors)
                        # Unaligned base checks byte addressing independently of lane numbering.
                        address = ctypes.addressof(memory) + 1
                        for i in range(count):
                            v = i * 16 + lane * size
                            m = 1 + i * size
                            if load:
                                expected_vectors[v:v + size] = expected_memory[m:m + size]
                            else:
                                expected_memory[m:m + size] = expected_vectors[v:v + size]
                        result = run(address, ctypes.addressof(vectors), 37)
                        increment = 0 if post is None else count * size if post == 'immediate' else 37
                        checks += 1
                        if bytes(memory) != expected_memory or bytes(vectors) != expected_vectors or result != address + increment:
                            label = f'load={load} size={size} registers={count} rt={rt} lane={lane} post={post}'
                            failures.append(label)
                            if len(failures) <= 12:
                                print('arm64_simd_lane_mismatch', label, flush=True)

# Exact LDUR/LD1/ST2 instruction sequence from the official Codex0.163.0
# Linux ARM64 musl ELF at 0xa928dcc..0xa928e48 (loop counter removed).
# supported_schemes gathers the first4 bytes of eight24-byte enum mappings;
# its subsequent scalar contains loop checks discriminant7 (P521).
gather_words = (
    0x91018009, 0xAA0103EA,  # add x9,x0,#96; mov x10,x1
    0x7C5A0120, 0xD101212C, 0x9100612D,
    0x0D404980, 0xD100C12C, 0x0D405180, 0xD100612C, 0x0D405980,
    0xAA0903EC, 0x4DDF4180, 0x4D4049A0, 0x9100C12D, 0x4D4051A0,
    0x9101212D, 0x4D4059A0, 0xD101192D, 0x7C5A2121, 0x0D4049A1,
    0xD100B92D, 0x0D4051A1, 0xD100592D, 0x0D4059A1, 0x4D404181,
    0x9100692C, 0x4D404981, 0x9100C92C, 0x4D405181, 0x9101292C,
    0x91030129, 0x4D405981, 0x4C9F8540,
)
gather = function(gather_words)
source = (ctypes.c_ubyte * 192)(*([0xA5] * 192))
output = (ctypes.c_ubyte * 32)(*([0xCC] * 32))
expected = bytearray()
for i, tag in enumerate((11, 5, 7, 3, 9, 1, 6, 4)):
    item = struct.pack('<HH', tag, 0x8100 + i)
    expected.extend(item)
    for j, value in enumerate(item):
        source[i * 24 + j] = value
gather(ctypes.addressof(source), ctypes.addressof(output), 0)
tags = struct.unpack('<16H', bytes(output))[::2]
gather_ok = bytes(output) == expected
print('arm64_simd_codex_gather', 'ok=' + str(gather_ok), 'P521=' + str(7 in tags), 'tags=' + repr(tags), flush=True)
print('arm64_simd_lane_summary', 'checks=' + str(checks), 'failures=' + str(len(failures)), flush=True)
if failures or not gather_ok:
    raise AssertionError('ARM64 lane/gather mismatch: ' + repr(failures[:3]))
print('arm64_simd_lanes_ok', flush=True)
