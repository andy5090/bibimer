#!/usr/bin/env python3
"""Fixed-build OpenCode ShellTool output-drain compatibility patch for iOS.

Only the published ARM64-musl 1.19.3 ELF and this exact audited patch are
accepted. No credential, command, tool result, or permission is fabricated.

Upstream source (MIT):
https://github.com/anomalyco/opencode/blob/v1.19.3/packages/opencode/src/tool/shell.ts
https://github.com/anomalyco/opencode/blob/v1.19.3/LICENSE
The accompanying LICENSE.OPENCODE preserves the upstream notice. This build
keeps output collection inside the original abort/timeout race until EOF.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import secrets
import stat

SOURCE_SIZE = 195014520
SOURCE_SHA256 = "37c7de554c2ba7bf456e4fe6faf7705141b0ccb3a7b1dd6e1046d52cd8269ecd"
PATCHED_SHA256 = '04023b8024bdab3cde5c84ca509c7a9ec9492b7a308175740449fd62e6e438d6'
OFFSET = 92462036
LENGTH = 2310
REGION_SHA256 = "a638c190411eaa687117ef115817a69df542c6d400f785a98b97fb7bbb6366ef"
PATCHED_REGION_SHA256 = 'f7f15e3e8b79856d59e8827924021f5687bcdcbf317397210db801f24186ac2f'
CHUNK_SIZE = 1024 * 1024
ORIGINAL_REGION = b'g=s.fn("ShellTool.run")(function*(c,h){let b=yield*t.limits(),T=b.maxBytes*2,d="",w="",O=[],U=0,q="",R,N=!1,K=!1,G=!1,W=s.fnUntraced(function*(){let D=R;if(!D)return;if(R=void 0,D.destroyed||D.closed)return;yield*s.promise(()=>new Promise((Q)=>{let Y=!1,Z=()=>{if(Y)return;Y=!0,D.off("close",Z),D.off("error",Z),D.off("finish",Z),Q()};D.once("close",Z),D.once("error",Z),D.once("finish",Z),D.end(Z)})).pipe(s.catch(()=>s.void))});yield*h.metadata({metadata:{output:""}});let I=yield*s.scoped(s.gen(function*(){yield*s.addFinalizer(W);let D=yield*e.spawn(ss(c.shell,c.command,c.cwd,c.env));yield*s.forkScoped(Go.runForEach(Go.decodeText(D.all),(A)=>{let F=Buffer.byteLength(A,"utf-8");O.push({text:A,size:F}),U+=F;while(U>T&&O.length>1){let ro=O.shift();if(!ro)break;U-=ro.size,N=!0}if(w=Ze(w+A),q)R?.write(A);else if(d+=A,Buffer.byteLength(d,"utf-8")>b.maxBytes)return t.write(d).pipe(s.andThen((ro)=>s.sync(()=>{q=ro,N=!0,R=Xi(ro,{flags:"a"}),d=""})),s.andThen(h.metadata({metadata:{output:w}})));return h.metadata({metadata:{output:w}})}));let Q=s.callback((A)=>{if(h.abort.aborted)return A(s.void);let F=()=>A(s.void);return h.abort.addEventListener("abort",F,{once:!0}),s.sync(()=>h.abort.removeEventListener("abort",F))}),Y=s.sleep(`${c.timeout+100} millis`),Z=yield*s.raceAll([D.exitCode.pipe(s.map((A)=>({kind:"exit",code:A}))),Q.pipe(s.map(()=>({kind:"abort",code:null}))),Y.pipe(s.map(()=>({kind:"timeout",code:null})))]);if(Z.kind==="abort")G=!0,yield*D.kill({forceKillAfter:"3 seconds"}).pipe(s.orDie);if(Z.kind==="timeout")K=!0,yield*D.kill({forceKillAfter:"3 seconds"}).pipe(s.orDie);return Z.kind==="exit"?Z.code:null})).pipe(s.orDie),k=[];if(K)k.push(`shell tool terminated command after exceeding timeout ${c.timeout} ms. If this command is expected to take longer and is not waiting for interactive input, retry with a larger timeout value in milliseconds.`);if(G)k.push("User aborted the command");let oo=O.map((D)=>D.text).join(""),f=es(oo,b.maxLines,b.maxBytes);if(f.cut)N=!0;if(!q&&f.cut)q=yield*t.write(oo);let B=f.text;if(!B)B="(no output)";if(N&&q)B=`...output truncated...\n\nFull output saved to: ${q}\n\n`+B;if(k.length>0)B+=`\n\n<shell_metadata>\n`+k.join(`\n`)+`\n</shell_metadata>`;return{title:c.command,metadata:{output:w||Ze(B),exit:I,truncated:N,...N&&q?{outputPath:q}:{}},output:B}});'
REPLACEMENTS = ((b'let D=yield*e.spawn(ss(c.shell,c.command,c.cwd,c.env));yield*s.forkScoped(', b'let D=yield*e.spawn(ss(c.shell,c.command,c.cwd,c.env)),L=yield*s.forkScoped('), (b'return h.metadata({metadata:{output:w}})}));let Q=', b'return h.metadata({metadata:{output:w}})}),{startImmediately:!0});let Q='), (b'Z=yield*s.raceAll([D.exitCode.pipe(s.map((A)=>({kind:"exit",code:A}))),Q.pipe(s.map(()=>({kind:"abort",code:null}))),Y.pipe(s.map(()=>({kind:"timeout",code:null})))]);if(Z.kind==="abort")G=!0,yield*D.kill({forceKillAfter:"3 seconds"}).pipe(s.orDie);if(Z.kind==="timeout")K=!0,yield*D.kill({forceKillAfter:"3 seconds"}).pipe(s.orDie);return Z.kind==="exit"?Z.code:null})).pipe(s.orDie),k=[];', b'Z=yield*s.raceAllFirst([D.exitCode.pipe(s.flatMap(A=>s.as(s.callback(F=>s.sync(L.addObserver(F))),{kind:"exit",code:A}))),Q.pipe(s.map(()=>({kind:"abort",code:null}))),Y.pipe(s.map(()=>({kind:"timeout",code:null})))]);if(Z.kind!=="exit")G=Z.kind==="abort",K=!G,yield*D.kill({forceKillAfter:"3 seconds"}).pipe(s.orDie);return Z.code})).pipe(s.orDie),k=[];'))


class PatchError(ValueError):
    """The fixed-build patch cannot be applied safely."""


def _patched_region():
    region = ORIGINAL_REGION
    if len(region) != LENGTH or hashlib.sha256(region).hexdigest() != REGION_SHA256:
        raise PatchError("Invalid original region contract")
    if len(REPLACEMENTS) != 3:
        raise PatchError("Invalid replacement contract")
    for before, after in REPLACEMENTS:
        if region.count(before) != 1:
            raise PatchError("Nonunique replacement contract")
        region = region.replace(before, after)
    if len(region) > LENGTH:
        raise PatchError("Patch exceeds the embedded region")
    region += b" " * (LENGTH - len(region))
    if hashlib.sha256(region).hexdigest() != PATCHED_REGION_SHA256:
        raise PatchError("Invalid patched region contract")
    return region


def _signature(info):
    return (info.st_dev, info.st_ino, info.st_size, info.st_mtime_ns,
            info.st_ctime_ns, info.st_mode)


def _regular(info):
    if not stat.S_ISREG(info.st_mode):
        raise PatchError("Only regular files are accepted")
    return info


def _inspect(descriptor, patched_region):
    os.lseek(descriptor, 0, os.SEEK_SET)
    digest = hashlib.sha256()
    counts = [0, 0]
    carry, length, found = b"", 0, None
    while True:
        block = os.read(descriptor, CHUNK_SIZE)
        if not block:
            break
        digest.update(block)
        window = carry + block
        for index, needle in enumerate((ORIGINAL_REGION, patched_region)):
            counts[index] += window.count(needle)
        if length <= OFFSET < length + len(block):
            found = block[OFFSET - length:OFFSET - length + LENGTH]
        elif found is not None and len(found) < LENGTH:
            found += block[:LENGTH - len(found)]
        length += len(block)
        carry = window[-(LENGTH - 1):] if LENGTH > 1 else b""
    return {"size": length, "sha256": digest.hexdigest(), "counts": counts, "region": found}


def _validate(info, patched_region):
    if info["size"] != SOURCE_SIZE:
        raise PatchError("Unsupported executable size")
    if info["sha256"] == SOURCE_SHA256:
        expected, counts = ORIGINAL_REGION, [1, 0]
        state = "original"
    elif info["sha256"] == PATCHED_SHA256:
        expected, counts = patched_region, [0, 1]
        state = "patched"
    else:
        raise PatchError("Unsupported executable SHA256")
    if info["counts"] != counts or info["region"] != expected:
        raise PatchError("Embedded region is not unique at the fixed offset")
    return state


def _write_all(descriptor, data):
    data = memoryview(data)
    while data:
        count = os.write(descriptor, data)
        if count <= 0:
            raise OSError("Incomplete temporary-file write")
        data = data[count:]


def _entry_signature(directory, name):
    try:
        return _signature(_regular(os.stat(name, dir_fd=directory, follow_symlinks=False)))
    except FileNotFoundError:
        return None


def patch_executable(source, destination=None):
    """Atomically patch the exact ELF, or write a patched copy to destination.

    Returns fixed-build metadata only. Unknown/changed files are rejected and
    any existing destination is preserved until every verification succeeds.
    Already-patched input is accepted without changing its embedded bytes.
    """
    patched_region = _patched_region()
    source = Path(os.path.abspath(os.fspath(source)))
    destination = source if destination is None else Path(os.path.abspath(os.fspath(destination)))
    descriptor = os.open(source, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
    directory = temporary = target_descriptor = None
    try:
        before = _signature(_regular(os.fstat(descriptor)))
        if before[2] != SOURCE_SIZE:
            raise PatchError("Unsupported executable size")
        if _signature(_regular(os.lstat(source))) != before:
            raise PatchError("Source path changed before inspection")
        initial = _inspect(descriptor, patched_region)
        state = _validate(initial, patched_region)
        if _signature(os.fstat(descriptor)) != before or _signature(os.lstat(source)) != before:
            raise PatchError("Source changed during inspection")
        metadata = {"format": 1, "version": "1.19.3", "compatibilityPatch": "ios-shell-output-drain-v1",
                    "sourceSha256": initial["sha256"], "patchedSha256": PATCHED_SHA256,
                    "size": SOURCE_SIZE, "offset": OFFSET, "length": LENGTH,
                    "regionSha256": REGION_SHA256, "patchedRegionSha256": PATCHED_REGION_SHA256,
                    "alreadyPatched": state == "patched"}
        if state == "patched" and destination == source:
            return metadata
        parent = destination.parent.resolve(strict=True)
        directory = os.open(parent, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
        previous_destination = _entry_signature(directory, destination.name)
        temporary = ".bibimer-opencode-compat-" + secrets.token_hex(16)
        target_descriptor = os.open(temporary, os.O_RDWR | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW,
                                    0o600, dir_fd=directory)
        os.lseek(descriptor, 0, os.SEEK_SET)
        source_digest, output_digest, position = hashlib.sha256(), hashlib.sha256(), 0
        while True:
            block = os.read(descriptor, CHUNK_SIZE)
            if not block:
                break
            source_digest.update(block)
            if state == "original":
                start = min(max(OFFSET - position, 0), len(block))
                end = min(max(OFFSET + LENGTH - position, 0), len(block))
                if end > start:
                    region_start = position + start - OFFSET
                    block = block[:start] + patched_region[region_start:region_start + end - start] + block[end:]
            _write_all(target_descriptor, block)
            output_digest.update(block)
            position += len(block)
        if position != SOURCE_SIZE or source_digest.hexdigest() != initial["sha256"]:
            raise PatchError("Source changed during copy")
        if output_digest.hexdigest() != PATCHED_SHA256:
            raise PatchError("Unexpected copied output SHA256")
        if _signature(os.fstat(descriptor)) != before or _signature(os.lstat(source)) != before:
            raise PatchError("Source path or file changed during copy")
        os.fchmod(target_descriptor, stat.S_IMODE(os.fstat(descriptor).st_mode))
        os.fsync(target_descriptor)
        if _validate(_inspect(target_descriptor, patched_region), patched_region) != "patched":
            raise PatchError("Temporary output verification failed")
        if _signature(os.fstat(descriptor)) != before or _signature(os.lstat(source)) != before:
            raise PatchError("Source changed before publication")
        if _entry_signature(directory, destination.name) != previous_destination:
            raise PatchError("Destination changed before publication")
        os.replace(temporary, destination.name, src_dir_fd=directory, dst_dir_fd=directory)
        temporary = None
        return metadata
    finally:
        if target_descriptor is not None:
            os.close(target_descriptor)
        if temporary is not None and directory is not None:
            os.unlink(temporary, dir_fd=directory)
        if directory is not None:
            os.close(directory)
        os.close(descriptor)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("--output", type=Path)
    arguments = parser.parse_args()
    try:
        result = patch_executable(arguments.source, arguments.output)
    except (OSError, PatchError):
        print(json.dumps({"format": 1, "compatibilityPatch": "ios-shell-output-drain-v1", "error": "fixed_build_patch_rejected"}))
        return 1
    print(json.dumps(result, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
