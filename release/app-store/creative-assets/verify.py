#!/usr/bin/env python3
"""Validate generated artwork using Python's standard library only."""
import hashlib
import json
from pathlib import Path
import struct
import zlib

BASE = Path(__file__).resolve().parent
ROOT = BASE.parents[2]


def check_png(path, expected_size):
    data = path.read_bytes()
    assert data.startswith(b'\x89PNG\r\n\x1a\n'), path
    offset, packed, header = 8, bytearray(), None
    while offset < len(data):
        size = struct.unpack_from('>I', data, offset)[0]
        kind = data[offset + 4:offset + 8]
        payload = data[offset + 8:offset + 8 + size]
        checksum = struct.unpack_from('>I', data, offset + 8 + size)[0]
        assert zlib.crc32(kind + payload) & 0xffffffff == checksum, path
        if kind == b'IHDR':
            header = struct.unpack('>IIBBBBB', payload)
        elif kind == b'IDAT':
            packed.extend(payload)
        offset += size + 12
    assert header[:2] == expected_size, (path, header)
    assert header[2:] == (8, 2, 0, 0, 0), (path, 'Expected opaque 8-bit RGB PNG', header)
    raw = zlib.decompress(packed)
    row = 1 + expected_size[0] * 3
    assert len(raw) == row * expected_size[1], path
    assert all(raw[n] in range(5) for n in range(0, len(raw), row)), path
    return {'file':str(path.relative_to(ROOT)), 'sha256':hashlib.sha256(data).hexdigest(),
            'bytes':len(data), 'width':header[0], 'height':header[1], 'mode':'RGB',
            'alpha':False, 'crcVerified':True, 'pixelPayloadVerified':True}


manifest = json.loads((BASE / 'manifest.json').read_text())
results = []
for asset in manifest['assets']:
    full = check_png(ROOT / asset['file'], (5244, 2950))
    assert full['sha256'] == asset['sha256']
    source = ROOT / asset['sourceScreenshot']
    assert hashlib.sha256(source.read_bytes()).hexdigest() == asset['sourceScreenshotSha256']
    assert asset['coreInsideSafeArea'] and asset['wordmarkFontLoaded'] and not asset['jsErrors']
    safe = asset['safeArea']
    for box in asset['coreBounds']:
        assert box['x'] >= safe['x'] and box['y'] >= safe['y']
        assert box['x'] + box['width'] <= safe['x'] + safe['width']
        assert box['y'] + box['height'] <= safe['y'] + safe['height']
    results.extend([full, check_png(ROOT / asset['previews']['safeCrop'], (1402, 962)),
                    check_png(ROOT / asset['previews']['full'], (1600, 900))])
report = {'passed':True, 'files':results, 'sourceCapturesUnmodified':True,
          'coreArtInsideAppleSafeArea':True, 'spaceGroteskWordmarkLoaded':True}
(BASE / 'verification.json').write_text(json.dumps(report, indent=2) + '\n')
print('PASS: 6 opaque RGB PNGs, CRC/pixel payloads, checksums, source captures, font and safe bounds')
