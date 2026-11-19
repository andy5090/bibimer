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


def review_access_digest():
    # Reuse Android's private external-file policy; never package the raw code.
    sys.path.insert(0, str(REPO / 'scripts'))
    try:
        import build_apk
        return build_apk.review_access_digest()
    finally:
        sys.path.pop(0)


def review_labels(source):
    keys=['review_access','review_access_code','review_access_enter','review_access_invalid','review_access_unavailable','cancel_project']
    base=(source/'i18n.js').read_text()
    pairs={key:json.loads(re.search(r'^\s*'+key+r': (\[.*\]),$',base,re.M).group(1)) for key in keys}
    rows={locale:{key:pair[index] for key,pair in pairs.items()} for index,locale in enumerate(['en','ko'])}
    for locale in ['pt-BR','es','id','zh-Hans','ja','zh-Hant','fr','de']:
        text=(source/('i18n-'+locale+'.js')).read_text()
        rows[locale]={}
        for key in keys:
            match=re.search(r'^\s*"?'+key+r'"?\s*:\s*("(?:[^"\\]|\\.)*")',text,re.M)
            rows[locale][key]=json.loads(match.group(1)) if match else rows['en'][key]
    return rows


def package_web(destination):
    notices = json.loads((HERE / 'Resources/runtime-notices.json').read_text())
    own_licenses = [('BIBIMER-LICENSE.md', HERE.parent / 'LICENSE.md'),
                    ('BIBIMER-LICENSE.IOS', HERE.parent / 'LICENSE.IOS'),
                    ('GPL-3.0', HERE.parent / 'COPYING')]
    for key, path in own_licenses:
        if notices.get(key) != path.read_text():
            raise RuntimeError('Bundled Bibimer license differs from its source: ' + key)
    if (HERE / 'Resources/GPL-3.0.txt').read_bytes() != (HERE.parent / 'COPYING').read_bytes():
        raise RuntimeError('Bundled GPL version 3 differs from ios/COPYING.')
    source = REPO / 'android/app/src/main/assets'
    if destination.exists():
        shutil.rmtree(destination)
    shutil.copytree(source, destination)
    (destination/'review-labels.json').write_text(json.dumps(review_labels(source),ensure_ascii=False)+'\n')
    for key, path in own_licenses:
        shutil.copy2(path, destination / (key + '.txt' if key == 'GPL-3.0' else key))
    for name in ['platform.js', 'terminal-tools.js', 'terminal-tools.css', 'speech-text.js', 'text-gestures.js', 'data-consent.js', 'review-workspace.js']:
        shutil.copy2(HERE / 'Resources' / name, destination / name)
    (destination/'review-samples.js').write_text('window.BibimerReviewSamples='+json.dumps(json.loads((HERE/'Resources/review-samples.json').read_text()),ensure_ascii=False)+';\n')
    locales=json.loads((HERE / 'Resources/ios-locales.json').read_text())
    (destination / 'ios-locales.js').write_text('window.BibimerIOSLocales='+json.dumps(locales,ensure_ascii=False)+';\n')
    for name, global_name in [('data-consent-locales.json', 'BibimerIOSDataLocales'), ('runtime-notices.json', 'BibimerRuntimeNotices'), ('alpine-notices.json', 'BibimerAlpineNotices')]:
        (destination / name.replace('.json', '.js')).write_text('window.' + global_name + '=' + json.dumps(json.loads((HERE / 'Resources' / name).read_text()), ensure_ascii=False) + ';\n')
    index = (destination / 'index.html').read_text()
    index = index.replace('<script src="app.js" defer>', '<script src="ios-locales.js" defer></script>\n  <script src="speech-text.js" defer></script>\n  <script src="text-gestures.js" defer></script>\n  <script src="platform.js" defer></script>\n  <script src="terminal-tools.js" defer></script>\n  <script src="data-consent-locales.js" defer></script>\n  <script src="runtime-notices.js" defer></script>\n  <script src="alpine-notices.js" defer></script>\n  <script src="data-consent.js" defer></script>\n  <link rel="stylesheet" href="terminal-tools.css">\n  <script src="app.js" defer>')
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
    <section id="ios-connection-diagnostics" class="card preference-card" hidden>
      <h2 data-i18n="ios_connection_diagnostics">Connection diagnostics</h2>
      <p class="hint" data-i18n="ios_connection_diagnostics_hint"></p>
      <button id="ios-connection-diagnostics-copy" class="secondary" data-i18n="ios_connection_diagnostics_copy">Copy diagnostics</button>
    </section>
    <section id="connection-settings"''')
    # iOS zooms small text fields on focus. Keep the shared Android sizing intact.
    index = index.replace('<section id="connection-settings"', '\n    <section class="card preference-card" id="ios-data-settings"><h2 data-ios-data="settings"></h2><p class="hint" data-ios-data="sessionOnly"></p><div class="button-row"><button id="ios-data-revoke" type="button" class="secondary" data-ios-data="revoke"></button><button id="ios-legal-open" type="button" class="secondary" data-ios-data="legal"></button></div><p id="ios-data-revoke-status" class="hint" role="status"></p></section>\n    <section id="connection-settings"')
    index = index.replace('</body>', '''<dialog id="ios-data-consent" aria-labelledby="ios-data-title" aria-describedby="ios-data-description ios-data-purpose"><h2 id="ios-data-title" data-ios-data="title"></h2><p><strong data-ios-data="recipient"></strong>: <span id="ios-data-recipient"></span></p><p id="ios-data-description"></p><p id="ios-data-purpose"></p><div class="button-row"><button id="ios-data-cancel" type="button" class="secondary" data-ios-data="cancel"></button><button id="ios-data-allow" type="button" class="primary" data-ios-data="allow"></button></div></dialog>
    <dialog id="ios-legal" aria-labelledby="ios-legal-title"><div class="dialog-header"><h2 id="ios-legal-title" data-ios-data="legal"></h2><button id="ios-legal-close" type="button" class="secondary" data-ios-data="close"></button></div><p>Bibimer · ARM64 Linux interpreter · Alpine Linux</p><ul><li><a href="https://github.com/andy5090/bibimer" target="_blank" rel="noopener">Bibimer source and build instructions</a></li><li><a href="https://github.com/andy5090/bibimer/blob/main/ios/LICENSE.md" target="_blank" rel="noopener">Bibimer iOS GPLv3 license and covered source</a></li><li><a href="https://github.com/andy5090/bibimer/blob/main/release/app-store/runtime-sources.md" target="_blank" rel="noopener">Runtime components, licenses and corresponding sources</a></li><li><a href="https://github.com/dnakov/litter-ish/tree/c8e9dcb954963b0d9f359b3ad9da871f19b28652" target="_blank" rel="noopener">Pinned litter-ish runtime source</a></li><li><a href="https://github.com/andy5090/bibimer/blob/main/ios/runtime-lab/patches/embedded-runtime.patch" target="_blank" rel="noopener">Runtime modifications</a></li><li><a href="https://www.gnu.org/licenses/old-licenses/gpl-2.0.html" target="_blank" rel="noopener">GNU GPL version 2</a></li><li><a href="https://www.gnu.org/licenses/gpl-3.0.html" target="_blank" rel="noopener">GNU GPL version 3</a></li></ul><details><summary>Bibimer iOS license · Copyright © 2026 Andineering</summary><pre id="ios-bibimer-license"></pre></details><details><summary>Bibimer iOS App Store additional permission</summary><pre id="ios-bibimer-exception"></pre></details><details><summary>Bundled runtime license</summary><pre id="ios-runtime-license"></pre></details><details><summary>iOS distribution exception</summary><pre id="ios-runtime-exception"></pre></details><details><summary>GNU General Public License version 3</summary><pre id="ios-runtime-gpl"></pre></details><details><summary>GNU General Public License version 2</summary><pre id="ios-runtime-gpl2"></pre></details><div id="ios-alpine-notices"></div></dialog></body>''')
    index = index.replace('</head>', '''<style>
.ios-unavailable { display:none !important; }
#file-viewer .file-toolbar { display:flex; flex-wrap:wrap; gap:8px; }
#file-viewer .file-toolbar button { flex:1 1 125px; min-width:0; height:auto; min-height:36px; white-space:normal; overflow-wrap:anywhere; }
#ios-data-consent, #ios-legal { width:min(560px,calc(100vw - 24px)); max-height:calc(100dvh - 32px); overflow:auto; overflow-wrap:anywhere; }
#ios-data-consent .button-row, #ios-data-settings .button-row { display:flex; flex-wrap:wrap; gap:8px; }
#ios-data-consent button, #ios-data-settings button { flex:1 1 150px; min-width:0; white-space:normal; }
#ios-legal pre { white-space:pre-wrap; overflow-wrap:anywhere; font-size:12px; }
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
#conversation .diff-viewport { font-size:calc(10px * var(--ios-chat-text-scale, 1)); }
#conversation .diff-line code { font-size:inherit; }
#conversation .diff-numbers { font-size:calc(9px * var(--ios-chat-text-scale, 1)); }
</style>
</head>''')
    (destination / 'index.html').write_text(index)
    review_index=index.replace('<script src="app.js" defer>', '<script src="review-samples.js" defer></script><script src="review-workspace.js" defer></script><script src="app.js" defer>')
    review_index=review_index.replace("frame-src 'self'", "frame-src 'none'")
    (destination/'review.html').write_text(review_index)
    app = (destination / 'app.js').read_text()
    entry='$("review-access-form").addEventListener("submit", event => {'
    verify='accepted = native.enterReviewDemo?.($("review-access-code").value.trim()) === true;'
    if app.count(entry)!=1 or app.count(verify)!=1:
        raise RuntimeError('Shared review-entry contract changed; review asynchronous iOS access.')
    app=app.replace(entry,entry.replace('event =>','async event =>'))
    opening='$("review-access-open").addEventListener("click", () => {\n    if (demo || currentTab !== "settings") return;'
    if app.count(opening)!=1:raise RuntimeError('Shared review dialog lifecycle changed.')
    app=app.replace(opening,'let iosReviewEntryEpoch=0;\n  '+opening+'\n    ++iosReviewEntryEpoch;native.cancelReviewEntry?.();')
    app=app.replace('let accepted = false;\n    try { '+verify, 'if($("review-access-submit").disabled)return;\n    $("review-access-submit").disabled=true;\n    const entryGeneration=generation,entryEpoch=iosReviewEntryEpoch;\n    let accepted = false;\n    try { accepted = await native.enterReviewDemo?.($("review-access-code").value.trim(),()=>entryEpoch===iosReviewEntryEpoch && entryGeneration===generation && currentTab==="settings" && $("review-access-dialog").open && !paused) === true;')
    app=app.replace('=== true; } catch (_) { }\n    $("review-access-code")', '=== true; } catch (_) { } finally { $("review-access-submit").disabled=false; }\n    $("review-access-code")')
    app=app.replace('$("review-access-code").value = "";\n    if (!accepted)', 'if(entryEpoch!==iosReviewEntryEpoch || entryGeneration!==generation || currentTab!=="settings" || !$("review-access-dialog").open) return;\n    $("review-access-code").value = "";\n    if (!accepted)')
    failed='window.BibimerReviewEntryFailed = () => {\n    paused = false;'
    if app.count(failed)!=1:raise RuntimeError('Shared review entry failure recovery changed.')
    app=app.replace(failed,'window.BibimerReviewEntryFailed = () => {\n    if(document.hidden || environment().localRuntime?.foreground===false){paused=true;return;}\n    paused = false;')
    # Sample input is discarded rather than retained as a normal optimistic row.
    if app.count('if (chat) optimisticMessages.add(')!=1 or app.count('if (optimisticId && (!attempt')!=1:
        raise RuntimeError('Shared optimistic input contract changed; review demo input isolation.')
    app=app.replace('if (chat) optimisticMessages.add(', 'if (chat && !demo) optimisticMessages.add(')
    app=app.replace('if (optimisticId && (!attempt', 'if (!demo && optimisticId && (!attempt')
    metadata_timeout = '}, path === "/native/open-file" ? 120000 : 35000);'
    if app.count(metadata_timeout) != 1:
        raise RuntimeError('Shared API timeout contract changed; review iOS metadata deadlines.')
    app = app.replace(metadata_timeout, '}, path === "/native/open-file" ? 120000 : ["/v1/models", "/v1/commands", "/v1/session-history", "/v1/agent-connections"].includes(path) ? 150000 : 35000);')
    end = app.rfind('})();')
    if end < 0:
        raise RuntimeError('Shared application closure changed; review the iOS integration hooks.')
    app = app[:end] + 'if (!demo) {\n' + (HERE / 'Resources/data-consent-hooks.js').read_text() + '\n' + (HERE / 'Resources/ui-hooks.js').read_text() + '\n}\n' + app[end:]
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
    sources = [HERE / 'Sources/ReviewAccess.c', HERE / 'Sources/ReviewController.m', HERE / 'Sources/main.m', HERE / 'Sources/AccountInput.m', HERE / 'Sources/AccountBrowser.m', HERE / 'Sources/VoiceService.m', HERE / 'Sources/BrowserService.m', HERE / 'Sources/CompletionNotifications.m', HERE / 'Sources/BackgroundExecution.m', HERE / 'Sources/AppSupport.c',
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
        '-framework', 'BackgroundTasks', '-framework', 'SafariServices', '-lsqlite3', '-lresolv', '-o', app / 'Bibimer')
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
    bundled_notices = json.loads((HERE / 'Resources/runtime-notices.json').read_text())
    for name in ['LICENSE.md', 'LICENSE.IOS']:
        if bundled_notices.get(name) != (runtime / name).read_text():
            raise RuntimeError('Bundled runtime notice differs from verified runtime: ' + name)
        shutil.copy2(runtime / name, app / ('Runtime-' + name))
    bridge_version=re.search(r'^VERSION = "([0-9.]+)"$',(REPO/'bridge/bibimer_bridge.py').read_text(),re.M).group(1)
    info = dict(BibimerReviewAccessDigest=review_access_digest(),BibimerBridgeVersion=bridge_version,CFBundleIdentifier='app.bibimer.ios', CFBundleExecutable='Bibimer',
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
