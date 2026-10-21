#!/usr/bin/env python3
"""Package the shared Bibimer UI with the same-device iOS Linux bridge."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import plistlib
import shutil
import subprocess
import sys

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
ENGINE_WORK = REPO / '.tools/ios-runtime'
WORK = REPO / '.tools/ios-app'


def run(*args):
    print('+', ' '.join(map(str, args)), flush=True)
    subprocess.run(list(map(str, args)), check=True)


def output(*args):
    return subprocess.check_output(list(map(str, args)), text=True).strip()


def package_web(destination):
    source = REPO / 'android/app/src/main/assets'
    if destination.exists():
        shutil.rmtree(destination)
    shutil.copytree(source, destination)
    for name in ['platform.js', 'terminal-tools.js', 'terminal-tools.css']:
        shutil.copy2(HERE / 'Resources' / name, destination / name)
    index = (destination / 'index.html').read_text()
    index = index.replace('<script src="app.js" defer>', '<script src="platform.js" defer></script>\n  <script src="terminal-tools.js" defer></script>\n  <link rel="stylesheet" href="terminal-tools.css">\n  <script src="app.js" defer>')
    # iOS zooms small text fields on focus. Keep the shared Android sizing intact.
    index = index.replace('</head>', '''<style>
.ios-unavailable { display:none !important; }
:root input:not([type="checkbox"]):not([type="radio"]), :root textarea, #handoff-context { font-size:16px !important; }
</style>
</head>''')
    (destination / 'index.html').write_text(index)
    app = (destination / 'app.js').read_text()
    metadata_timeout = '}, path === "/native/open-file" ? 120000 : 35000);'
    if app.count(metadata_timeout) != 1:
        raise RuntimeError('Shared API timeout contract changed; review iOS metadata deadlines.')
    app = app.replace(metadata_timeout, '}, path === "/native/open-file" ? 120000 : ["/v1/models", "/v1/commands", "/v1/session-history"].includes(path) ? 150000 : 35000);')
    end = app.rfind('})();')
    if end < 0:
        raise RuntimeError('Shared application closure changed; review the iOS integration hooks.')
    app = app[:end] + (HERE / 'Resources/ui-hooks.js').read_text() + '\n' + app[end:]
    (destination / 'app.js').write_text(app)


def package_guest(destination):
    if destination.exists():
        shutil.rmtree(destination)
    for tree, target in [(REPO / 'bridge', 'bridge'), (REPO / 'ios/bridge', 'ios')]:
        (destination / target).mkdir(parents=True)
        for source in tree.iterdir():
            if source.is_file() and source.suffix in {'.py', '.mjs', '.sh'}:
                shutil.copy2(source, destination / target / source.name)
    opencode_license = REPO / 'ios/bridge/LICENSE.OPENCODE'
    if opencode_license.is_file():
        shutil.copy2(opencode_license, destination / 'ios/LICENSE.OPENCODE')
    wasm = ENGINE_WORK / 'ios-linuxkit/app/RootfsPatch.bundle/files/lib/wasm-polyfill.js'
    if not wasm.is_file():
        raise RuntimeError('Pinned runtime HTTP parser polyfill is missing.')
    (destination / 'runtime').mkdir()
    shutil.copy2(wasm, destination / 'runtime/wasm-polyfill.js')
    for required in ['ios/bootstrap.sh', 'ios/run.py', 'ios/opencode_compat.py', 'ios/LICENSE.OPENCODE', 'bridge/bibimer_bridge.py']:
        if not (destination / required).exists():
            raise RuntimeError(f'Missing guest resource: {required}')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--sdk', choices=['iphonesimulator', 'iphoneos'], default='iphonesimulator')
    parser.add_argument('--skip-runtime-build', action='store_true', help='Use the already verified lab engine build')
    args = parser.parse_args()
    os.environ.setdefault('DEVELOPER_DIR', '/Applications/Xcode.app/Contents/Developer')
    if not args.skip_runtime_build:
        run(sys.executable, REPO / 'ios/runtime-lab/build.py', '--sdk', args.sdk)
    engine = ENGINE_WORK / f'engine-{args.sdk}'
    runtime = ENGINE_WORK / 'ios-linuxkit'
    lab_manifest_path = ENGINE_WORK / args.sdk / 'BibimerRuntimeLab.app/build-manifest.json'
    lab_manifest = json.loads(lab_manifest_path.read_text())
    runtime_diff = subprocess.check_output(['git', '-C', str(runtime), 'diff', 'HEAD', '--'])
    if hashlib.sha256(runtime_diff).hexdigest() != lab_manifest['runtimeDiffSHA256']:
        raise SystemExit('Runtime source changed since its verified build. Build the lab engine first.')
    if runtime_diff != (REPO / 'ios/runtime-lab/patches/embedded-runtime.patch').read_bytes():
        raise SystemExit('Runtime source does not match the approved embedded patch.')
    build = WORK / args.sdk
    build.mkdir(parents=True, exist_ok=True)
    app = build / 'Bibimer.app'
    app.mkdir(exist_ok=True)
    sdk = output('xcrun', '--sdk', args.sdk, '--show-sdk-path')
    clang = output('xcrun', '--find', 'clang')
    target = 'arm64-apple-ios16.0' + ('-simulator' if args.sdk == 'iphonesimulator' else '')
    flags = ['-target', target, '-isysroot', sdk, '-DBIBIMER_EMBEDDED=1', '-DGUEST_ARM64=1']
    sources = [HERE / 'Sources/main.m', HERE / 'Sources/AppSupport.c',
               REPO / 'ios/runtime-lab/Sources/RuntimeSupport.c', runtime / 'embed/ffi.c']
    objects = []
    for source in sources:
        obj = build / (source.name + '.o')
        extra = ['-fobjc-arc', '-fblocks'] if source.suffix == '.m' else []
        run(clang, *flags, '-O2', '-g', '-Wall', '-Wextra', '-I', runtime,
            '-I', REPO / 'ios/runtime-lab/Sources', *extra, '-c', source, '-o', obj)
        objects.append(obj)
    run(clang, *flags, *objects, engine / 'libish.a', engine / 'libish_emu.a', engine / 'libfakefs.a',
        '-framework', 'UIKit', '-framework', 'Foundation', '-framework', 'CoreFoundation', '-framework', 'CoreGraphics', '-framework', 'WebKit',
        '-lsqlite3', '-lresolv', '-o', app / 'Bibimer')
    if (app / 'rootfs').exists():
        shutil.rmtree(app / 'rootfs')
    shutil.copytree(ENGINE_WORK / 'base-rootfs', app / 'rootfs', symlinks=True)
    package_web(app / 'Web')
    package_guest(app / 'Guest')
    for resource in (HERE / 'Resources').iterdir():
        if resource.is_file():
            shutil.copy2(resource, app / resource.name)
    for name in ['LICENSE.md', 'LICENSE.IOS']:
        shutil.copy2(runtime / name, app / ('Runtime-' + name))
    info = dict(CFBundleIdentifier='app.bibimer.ios', CFBundleExecutable='Bibimer',
                CFBundleName='Bibimer', CFBundleDisplayName='BIBIMER', CFBundlePackageType='APPL',
                CFBundleVersion='1', CFBundleShortVersionString='0.1.0', MinimumOSVersion='16.0',
                UIDeviceFamily=[1, 2], UILaunchScreen={},
                UISupportedInterfaceOrientations=['UIInterfaceOrientationPortrait', 'UIInterfaceOrientationLandscapeLeft', 'UIInterfaceOrientationLandscapeRight'],
                UIFileSharingEnabled=True, LSSupportsOpeningDocumentsInPlace=True,
                NSAppTransportSecurity=dict(NSAllowsLocalNetworking=True))
    (app / 'Info.plist').write_bytes(plistlib.dumps(info))
    hashes = {}
    for folder in ['Web', 'Guest', 'rootfs']:
        hashes[folder] = {str(file.relative_to(app / folder)): ('symlink:' + os.readlink(file) if file.is_symlink() else hashlib.sha256(file.read_bytes()).hexdigest())
                          for file in sorted((app / folder).rglob('*')) if file.is_file() or file.is_symlink()}
    hashes['Native'] = {resource.name: hashlib.sha256((app / resource.name).read_bytes()).hexdigest()
                        for resource in (HERE / 'Resources').iterdir() if resource.is_file()}
    manifest = dict(sdk=args.sdk, target=target, runtime=lab_manifest, resourceSHA256=hashes,
                    appSourceSHA256={str(source.relative_to(REPO)): hashlib.sha256(source.read_bytes()).hexdigest() for source in sources if source.is_relative_to(REPO / 'ios')},
                    preSigningBinarySHA256=hashlib.sha256((app / 'Bibimer').read_bytes()).hexdigest())
    (app / 'build-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    if args.sdk == 'iphonesimulator':
        run('codesign', '--force', '--sign', '-', app)
    print(app)


if __name__ == '__main__':
    main()
