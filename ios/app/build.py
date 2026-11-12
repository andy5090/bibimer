#!/usr/bin/env python3
"""Package the shared Bibimer UI with the same-device iOS Linux bridge."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import plistlib
import re
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
    for name in ['platform.js', 'terminal-tools.js', 'terminal-tools.css', 'speech-text.js', 'text-gestures.js']:
        shutil.copy2(HERE / 'Resources' / name, destination / name)
    locales=json.loads((HERE / 'Resources/ios-locales.json').read_text())
    (destination / 'ios-locales.js').write_text('window.BibimerIOSLocales='+json.dumps(locales,ensure_ascii=False)+';\n')
    index = (destination / 'index.html').read_text()
    index = index.replace('<script src="app.js" defer>', '<script src="ios-locales.js" defer></script>\n  <script src="speech-text.js" defer></script>\n  <script src="text-gestures.js" defer></script>\n  <script src="platform.js" defer></script>\n  <script src="terminal-tools.js" defer></script>\n  <link rel="stylesheet" href="terminal-tools.css">\n  <script src="app.js" defer>')
    index = index.replace('width=device-width, initial-scale=1, viewport-fit=cover',
                          'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover')
    reconnect_row = re.search(r'<div class="button-row"><button id="reconnect-settings".*?</div>', index)
    if not reconnect_row:
        raise RuntimeError('Shared reconnect markup changed; review the iOS connection status.')
    index = index[:reconnect_row.end()] + '\n      <p id="ios-reconnect-status" class="hint" role="status" aria-live="polite" aria-atomic="true"></p>' + index[reconnect_row.end():]
    if index.count('<div id="announcements">') != 1:
        raise RuntimeError('Shared announcements markup changed; review iOS recovery progress.')
    index = index.replace('<div id="announcements">', '''<div id="announcements">
    <aside id="ios-recovery-progress" class="ios-recovery-progress" role="status" aria-live="polite" aria-atomic="true" hidden>
      <span id="ios-recovery-spinner" class="ios-recovery-spinner" aria-hidden="true"></span>
      <div><strong id="ios-recovery-title"></strong><p id="ios-recovery-detail"></p></div>
    </aside>''')
    if index.count('<section id="connection-settings"') != 1:
        raise RuntimeError('Shared Settings markup changed; review the iOS screen controls.')
    index = index.replace('<section id="connection-settings"', '''<section id="ios-screen-settings" class="card preference-card">
      <h2 data-i18n="ios_screen_title">App screen</h2>
      <div class="preference-row"><label for="ios-keep-awake" data-i18n="ios_keep_awake">Prevent automatic locking</label><input id="ios-keep-awake" class="settings-switch" type="checkbox" role="switch" aria-describedby="ios-keep-awake-hint"></div>
      <p id="ios-keep-awake-hint" class="hint" data-i18n="ios_keep_awake_hint"></p>
      <div class="preference-row"><label for="ios-defer-home" data-i18n="ios_defer_home">Reduce accidental Home gestures</label><input id="ios-defer-home" class="settings-switch" type="checkbox" role="switch" aria-describedby="ios-defer-home-hint"></div>
      <p id="ios-defer-home-hint" class="hint" data-i18n="ios_defer_home_hint"></p>
      <p class="hint" data-i18n="ios_screen_background_hint"></p>
    </section>
    <section id="ios-background-settings" class="card preference-card">
      <h2 data-i18n="ios_background_title">Background work</h2>
      <div class="preference-row"><label for="ios-background-enabled" data-i18n="ios_background_enable">Continue active work</label><input id="ios-background-enabled" class="settings-switch" type="checkbox" role="switch" aria-describedby="ios-background-hint ios-background-status"></div>
      <p id="ios-background-hint" class="hint" data-i18n="ios_background_hint"></p>
      <p id="ios-background-status" class="hint" role="status" aria-live="polite"></p>
    </section>
    <section id="ios-connection-diagnostics" class="card preference-card">
      <h2 data-i18n="ios_connection_diagnostics">Connection diagnostics</h2>
      <p class="hint" data-i18n="ios_connection_diagnostics_hint"></p>
      <button id="ios-connection-diagnostics-copy" class="secondary" data-i18n="ios_connection_diagnostics_copy">Copy diagnostics</button>
    </section>
    <section id="connection-settings"''')
    # iOS zooms small text fields on focus. Keep the shared Android sizing intact.
    index = index.replace('</head>', '''<style>
.ios-unavailable { display:none !important; }
.ios-recovery-progress { display:flex; align-items:center; gap:10px; margin:6px 12px; padding:10px; border:1px solid var(--line); border-radius:8px; background:var(--raised); font-size:12px; }
.ios-recovery-progress>div { min-width:0; overflow-wrap:anywhere; }
.ios-recovery-progress p { margin:4px 0 0; font-size:11px; }
.ios-recovery-spinner { flex:none; width:16px; height:16px; border:2px solid var(--line); border-top-color:var(--accent); border-radius:50%; animation:ios-recovery-spin 1s linear infinite; }
@keyframes ios-recovery-spin { to { transform:rotate(360deg); } }
@media (prefers-reduced-motion:reduce) { .ios-recovery-spinner { animation:none; } }
/* Native constraints size the WebView; keep navigation inside that height. */
html, body { width:100%; max-width:100%; height:100%; overflow:hidden; touch-action:pan-x pan-y; overscroll-behavior-x:none; }
:root #app { height:100%; }
:root input:not([type="checkbox"]):not([type="radio"]), :root textarea, #handoff-context { font-size:16px !important; }
#conversation .markdown { font-size:calc(15px * var(--ios-chat-text-scale, 1)); }
#conversation .plain-message { font-size:calc(14px * var(--ios-chat-text-scale, 1)); }
#conversation .markdown h1 { font-size:calc(30px * var(--ios-chat-text-scale, 1)); }
#conversation .markdown h2 { font-size:calc(19px * var(--ios-chat-text-scale, 1)); }
#conversation .markdown h3 { font-size:calc(17px * var(--ios-chat-text-scale, 1)); }
#conversation .markdown h4, #conversation .markdown h5, #conversation .markdown h6 { font-size:calc(15px * var(--ios-chat-text-scale, 1)); }
#conversation .code-block pre, #conversation .markdown table { font-size:calc(13px * var(--ios-chat-text-scale, 1)); }
#conversation .code-block pre code { font-size:inherit; }
#conversation .markdown code { font-size:.87em; }
#conversation .markdown .literal-html { font-size:calc(12px * var(--ios-chat-text-scale, 1)); }
#conversation .command .activity-title, #conversation .file-change>summary .activity-title { font-size:calc(11px * var(--ios-chat-text-scale, 1)); }
#conversation .diff-viewport { font-size:calc(11px * var(--ios-chat-text-scale, 1)); }
#conversation .diff-line code { font-size:inherit; }
#conversation .diff-numbers { font-size:calc(10px * var(--ios-chat-text-scale, 1)); }
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
    for required in ['ios/bootstrap.sh', 'ios/supervisor.sh', 'ios/run.py', 'ios/opencode_compat.py', 'ios/browser_native.py', 'ios/LICENSE.OPENCODE', 'bridge/bibimer_bridge.py']:
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
    sources = [HERE / 'Sources/main.m', HERE / 'Sources/VoiceService.m', HERE / 'Sources/BrowserService.m', HERE / 'Sources/CompletionNotifications.m', HERE / 'Sources/BackgroundExecution.m', HERE / 'Sources/AppSupport.c',
               REPO / 'ios/runtime-lab/Sources/RuntimeSupport.c', runtime / 'embed/ffi.c']
    objects = []
    for source in sources:
        obj = build / (source.name + '.o')
        extra = ['-fobjc-arc', '-fblocks'] if source.suffix == '.m' else []
        run(clang, *flags, '-O2', '-g', '-Wall', '-Wextra', '-I', runtime,
            '-I', REPO / 'ios/runtime-lab/Sources', *extra, '-c', source, '-o', obj)
        objects.append(obj)
    run(clang, *flags, *objects, engine / 'libish.a', engine / 'libish_emu.a', engine / 'libfakefs.a',
        '-framework', 'UIKit', '-framework', 'Foundation', '-framework', 'CoreFoundation', '-framework', 'CoreGraphics', '-framework', 'WebKit', '-framework', 'AVFoundation', '-framework', 'Speech', '-framework', 'Security', '-framework', 'UserNotifications',
        '-framework', 'BackgroundTasks', '-lsqlite3', '-lresolv', '-o', app / 'Bibimer')
    if (app / 'rootfs').exists():
        shutil.rmtree(app / 'rootfs')
    shutil.copytree(ENGINE_WORK / 'base-rootfs', app / 'rootfs', symlinks=True)
    package_web(app / 'Web')
    package_guest(app / 'Guest')
    for resource in (HERE / 'Resources').iterdir():
        if resource.is_file():
            shutil.copy2(resource, app / resource.name)
    for locale,strings in json.loads((HERE / 'Resources/ios-locales.json').read_text()).items():
        folder=app/(locale+'.lproj');folder.mkdir(exist_ok=True)
        info_strings={'NSMicrophoneUsageDescription':strings[0],'NSSpeechRecognitionUsageDescription':strings[1]}
        native_strings={'Chat response completed.':strings[2],'Browser':strings[3],'Background work':strings[16]}
        for name,values in [('InfoPlist.strings',info_strings),('Localizable.strings',native_strings)]:
            (folder/name).write_text('\n'.join(json.dumps(k,ensure_ascii=False)+' = '+json.dumps(v,ensure_ascii=False)+';' for k,v in values.items())+'\n')
    for name in ['LICENSE.md', 'LICENSE.IOS']:
        shutil.copy2(runtime / name, app / ('Runtime-' + name))
    bridge_version=re.search(r'^VERSION = "([0-9.]+)"$',(REPO/'bridge/bibimer_bridge.py').read_text(),re.M).group(1)
    info = dict(BibimerBridgeVersion=bridge_version,CFBundleIdentifier='app.bibimer.ios', CFBundleExecutable='Bibimer',
                CFBundleName='Bibimer', CFBundleDisplayName='BIBIMER', CFBundlePackageType='APPL',
                CFBundleVersion='1', CFBundleShortVersionString='0.1.0', MinimumOSVersion='16.0',
                UIDeviceFamily=[1, 2], UILaunchScreen={},
                UIApplicationSceneManifest=dict(UIApplicationSupportsMultipleScenes=False,
                    UISceneConfigurations={'UIWindowSceneSessionRoleApplication': [dict(
                        UISceneConfigurationName='Bibimer', UISceneDelegateClassName='BibimerSceneDelegate')]}),
                UISupportedInterfaceOrientations=['UIInterfaceOrientationPortrait', 'UIInterfaceOrientationLandscapeLeft', 'UIInterfaceOrientationLandscapeRight'],
                UIFileSharingEnabled=True, LSSupportsOpeningDocumentsInPlace=True,
                BGTaskSchedulerPermittedIdentifiers=['app.bibimer.ios.work.*'], UIBackgroundModes=['processing'],
                NSMicrophoneUsageDescription='Record speech when you tap the microphone to add text to your draft.',
                NSSpeechRecognitionUsageDescription='Convert speech into a draft. Apple speech recognition may use the network.',
                NSAppTransportSecurity=dict(NSAllowsLocalNetworking=True))
    (app / 'Info.plist').write_bytes(plistlib.dumps(info))
    hashes = {}
    for folder in ['Web', 'Guest', 'rootfs']:
        hashes[folder] = {str(file.relative_to(app / folder)): ('symlink:' + os.readlink(file) if file.is_symlink() else hashlib.sha256(file.read_bytes()).hexdigest())
                          for file in sorted((app / folder).rglob('*')) if file.is_file() or file.is_symlink()}
    hashes['Native'] = {resource.name: hashlib.sha256((app / resource.name).read_bytes()).hexdigest()
                        for resource in (HERE / 'Resources').iterdir() if resource.is_file()}
    hashes['NativeLocalization']={str(file.relative_to(app)):hashlib.sha256(file.read_bytes()).hexdigest() for folder in app.glob('*.lproj') for file in folder.glob('*.strings')}
    manifest = dict(sdk=args.sdk, target=target, runtime=lab_manifest, resourceSHA256=hashes,
                    appSourceSHA256={str(source.relative_to(REPO)): hashlib.sha256(source.read_bytes()).hexdigest() for source in [*sources,*sorted((HERE/'Sources').glob('*.h'))] if source.is_relative_to(REPO / 'ios')},
                    preSigningBinarySHA256=hashlib.sha256((app / 'Bibimer').read_bytes()).hexdigest())
    (app / 'build-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    if args.sdk == 'iphonesimulator':
        run('codesign', '--force', '--sign', '-', app)
    print(app)


if __name__ == '__main__':
    main()
