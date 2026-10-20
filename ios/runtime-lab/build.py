#!/usr/bin/env python3
"""Build an isolated ARM64 iOS runtime probe; no Android or global tool changes."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import plistlib
import shutil
import subprocess
import urllib.request

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
WORK = REPO / '.tools/ios-runtime'
PIN = 'c8e9dcb954963b0d9f359b3ad9da871f19b28652'
ALPINE = 'alpine-minirootfs-3.21.0-aarch64.tar.gz'
ALPINE_SHA = 'f31202c4070c4ef7de9e157e1bd01cb4da3a2150035d74ea5372c5e86f1efac1'


def run(*args, **kwargs):
    print('+', ' '.join(map(str, args)), flush=True)
    return subprocess.run(list(map(str, args)), check=True, **kwargs)


def output(*args):
    return subprocess.check_output(list(map(str, args)), text=True).strip()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--sdk', choices=['iphonesimulator', 'iphoneos'], default='iphonesimulator')
    args = parser.parse_args()
    os.environ.setdefault('DEVELOPER_DIR', '/Applications/Xcode.app/Contents/Developer')
    WORK.mkdir(parents=True, exist_ok=True)
    src = WORK / 'ios-linuxkit'
    if not src.exists():
        run('git', 'clone', '--no-checkout', 'https://github.com/dnakov/litter-ish.git', src)
        run('git', '-C', src, 'checkout', '--detach', PIN)
    if output('git', '-C', src, 'rev-parse', 'HEAD') != PIN:
        raise SystemExit('Runtime checkout does not match pinned revision; use a separate clean cache.')
    patch = HERE / 'patches/embedded-runtime.patch'
    already_applied = subprocess.run(['git', '-C', str(src), 'apply', '--reverse', '--check', str(patch)],
                                     stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode == 0
    if not already_applied:
        run('git', '-C', src, 'apply', '--check', patch)
        run('git', '-C', src, 'apply', patch)
    runtime_diff = subprocess.check_output(['git', '-C', str(src), 'diff', 'HEAD', '--'])
    if runtime_diff != patch.read_bytes() or output('git', '-C', src, 'ls-files', '--others', '--exclude-standard'):
        raise SystemExit('Runtime checkout has changes beyond the approved patch; refusing an untracked build.')

    venv = WORK / 'build-venv'
    if not (venv / 'bin/meson').exists():
        python = '/opt/homebrew/bin/python3' if Path('/opt/homebrew/bin/python3').exists() else '/usr/bin/python3'
        run(python, '-m', 'venv', venv)
        run(venv / 'bin/pip', 'install', 'meson==1.9.1', 'ninja==1.13.0')
    llvm = next((p for p in ['/opt/homebrew/opt/llvm@21/bin', '/opt/homebrew/opt/llvm/bin',
                              '/usr/local/opt/llvm/bin'] if Path(p, 'clang').exists()), None)
    if not llvm:
        raise SystemExit('LLVM with AArch64 ELF support is required; set up LLVM before building.')
    os.environ['PATH'] = os.pathsep.join([str(venv / 'bin'), llvm, '/opt/homebrew/opt/lld@21/bin', os.environ['PATH']])
    sdk = output('xcrun', '--sdk', args.sdk, '--show-sdk-path')
    clang = output('xcrun', '--find', 'clang')
    target = 'arm64-apple-ios16.0' + ('-simulator' if args.sdk == 'iphonesimulator' else '')
    flags = ['-target', target, '-isysroot', sdk, '-DBIBIMER_EMBEDDED=1']
    cross = WORK / f'{args.sdk}.ini'
    cross.write_text("[binaries]\nc = " + repr(clang) + "\nobjc = " + repr(clang) +
                     "\nar = " + repr(output('xcrun', '--find', 'ar')) +
                     "\n[host_machine]\nsystem = 'darwin'\ncpu_family = 'aarch64'\ncpu = 'aarch64'\nendian = 'little'\n"
                     "[properties]\nneeds_exe_wrapper = true\n[built-in options]\nc_args = " + repr(flags) +
                     '\nc_link_args = ' + repr(flags) + '\nobjc_args = ' + repr(flags) + '\n')
    build = WORK / f'engine-{args.sdk}'
    if not (build / 'build.ninja').exists():
        run('meson', 'setup', build, src, '--cross-file', cross, '--buildtype=debugoptimized',
            '-Dapple_ui=true', '-Db_ndebug=false', '-Dlog_handler=stderr')
    run('meson', 'configure', build, '-Dlog_handler=stderr')
    run('ninja', '-C', build, 'libish.a', 'libish_emu.a', 'libfakefs.a')
    if not (build / 'vdso/arm64/libvdso.so.elf').stat().st_size:
        raise SystemExit('Empty VDSO: LLVM/lld not configured correctly.')

    archive = WORK / ALPINE
    if not archive.exists():
        urllib.request.urlretrieve('https://dl-cdn.alpinelinux.org/alpine/v3.21/releases/aarch64/' + ALPINE, archive)
    if hashlib.sha256(archive.read_bytes()).hexdigest() != ALPINE_SHA:
        raise SystemExit('Alpine checksum mismatch')
    fs = WORK / 'base-rootfs'
    if not fs.exists():
        converter = WORK / 'fakefsify'
        host_sdk = output('xcrun', '--sdk', 'macosx', '--show-sdk-path')
        archive_prefix = Path('/opt/homebrew/opt/libarchive')
        if not (archive_prefix / 'include/archive.h').exists():
            raise SystemExit('Host libarchive headers are required to convert the rootfs.')
        run(clang, '-isysroot', host_sdk, '-O2', '-DGUEST_ARM64=1', '-I', src,
            '-I', archive_prefix / 'include', '-L', archive_prefix / 'lib',
            *[src / f for f in ['tools/fakefsify.c', 'tools/fakefs.c', 'fs/fake-db.c',
                                'fs/fake-migrate.c', 'fs/fake-rebuild.c', 'util/fchdir.c']],
            HERE / 'Sources/HostLog.c', '-larchive', '-lsqlite3', '-o', converter)
        run(converter, archive, fs)
        run('sqlite3', fs / 'meta.db', 'PRAGMA wal_checkpoint(TRUNCATE);')

    app = WORK / args.sdk / 'BibimerRuntimeLab.app'
    app.mkdir(parents=True, exist_ok=True)
    objects = []
    for source in [HERE / 'Sources/main.m', HERE / 'Sources/RuntimeSupport.c', src / 'embed/ffi.c']:
        obj = build / (source.name + '.o')
        extra = ['-fobjc-arc', '-fblocks'] if source.suffix == '.m' else []
        run(clang, *flags, '-O2', '-g', '-DGUEST_ARM64=1', '-I', src, '-I', HERE / 'Sources',
            *extra, '-c', source, '-o', obj)
        objects.append(obj)
    run(clang, *flags, *objects, build / 'libish.a', build / 'libish_emu.a', build / 'libfakefs.a',
        '-framework', 'UIKit', '-framework', 'Foundation', '-framework', 'CoreFoundation',
        '-lsqlite3', '-lresolv', '-o', app / 'BibimerRuntimeLab')
    if not (app / 'rootfs').exists():
        shutil.copytree(fs, app / 'rootfs', symlinks=True)
    for resource in (HERE / 'Resources').iterdir():
        if resource.is_file():
            shutil.copy2(resource, app / resource.name)
    for source, name in [(REPO / 'ios/bridge/provider_gemini.py', 'provider_gemini.py'),
                         (REPO / 'ios/bridge/tests/probe_gemini_runtime.py', 'probe-gemini-acp.py'),
                         (REPO / 'ios/bridge/tests/probe_claude_runtime.py', 'probe-claude-sdk.py'),
                         (REPO / 'ios/bridge/tests/probe_bun_process.py', 'probe-bun-process.py'),
                         (REPO / 'ios/bridge/experimental-stdio-retention.cjs', 'experimental-stdio-retention.cjs'),
                         (REPO / 'ios/bridge/opencode_compat.py', 'opencode-compat.py'),
                         (REPO / 'ios/bridge/tests/stdio-retention-trace.cjs', 'stdio-retention-trace.cjs'),
                         (REPO / 'ios/bridge/tests/probe_opencode_runtime.py', 'probe-opencode-provider.py'),
                         (REPO / 'ios/bridge/tests/probe_opencode_shell_edges.py', 'probe-opencode-shell-edges.py'),
                         (REPO / 'bridge/provider_claude.mjs', 'provider_claude.mjs'),
                         (REPO / 'bridge/provider_opencode.py', 'provider_opencode.py')]:
        shutil.copy2(source, app / name)
    shutil.copy2(src / 'app/RootfsPatch.bundle/files/lib/wasm-polyfill.js', app / 'wasm-polyfill.js')
    for name in ['LICENSE.md', 'LICENSE.IOS']:
        shutil.copy2(src / name, app / ('Runtime-' + name))
    info = dict(CFBundleIdentifier='app.bibimer.runtime-lab', CFBundleExecutable='BibimerRuntimeLab',
                CFBundleName='Bibimer Runtime Lab', CFBundleDisplayName='Bibimer Lab', CFBundlePackageType='APPL',
                CFBundleVersion='1', CFBundleShortVersionString='0.1.0', MinimumOSVersion='16.0',
                UIDeviceFamily=[1, 2], UILaunchScreen={}, UISupportedInterfaceOrientations=['UIInterfaceOrientationPortrait'],
                UIFileSharingEnabled=True, LSSupportsOpeningDocumentsInPlace=True)
    (app / 'Info.plist').write_bytes(plistlib.dumps(info))
    diff = subprocess.check_output(['git', '-C', str(src), 'diff', 'HEAD', '--'])
    manifest = dict(runtimeCommit=PIN, runtimeDiffSHA256=hashlib.sha256(diff).hexdigest(),
                    patchSHA256=hashlib.sha256(patch.read_bytes()).hexdigest(),
                    alpineArchive=ALPINE, alpineSHA256=ALPINE_SHA, sdk=args.sdk, target=target,
                    preSigningBinarySHA256=hashlib.sha256((app / 'BibimerRuntimeLab').read_bytes()).hexdigest(),
                    probeSHA256=hashlib.sha256((app / 'probe.sh').read_bytes()).hexdigest(),
                    resourcesSHA256={resource.name: hashlib.sha256(resource.read_bytes()).hexdigest()
                                     for resource in sorted((HERE / 'Resources').iterdir()) if resource.is_file()})
    for name in ['provider_gemini.py', 'probe-gemini-acp.py', 'probe-claude-sdk.py',
                 'probe-opencode-provider.py', 'probe-opencode-shell-edges.py', 'probe-bun-process.py', 'opencode-compat.py', 'experimental-stdio-retention.cjs', 'stdio-retention-trace.cjs', 'provider_claude.mjs', 'provider_opencode.py', 'wasm-polyfill.js']:
        manifest['resourcesSHA256'][name] = hashlib.sha256((app / name).read_bytes()).hexdigest()
    (app / 'build-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    if args.sdk == 'iphonesimulator':
        run('codesign', '--force', '--sign', '-', app)
    print(app)


if __name__ == '__main__':
    main()
