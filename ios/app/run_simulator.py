#!/usr/bin/env python3
"""Install and exercise the actual iOS app on its dedicated simulator."""
import argparse
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import time

REPO = Path(__file__).resolve().parents[2]
WORK = REPO / '.tools/ios-app'
EXPECTED_CHECKS = {
    'shared_ui_connected', 'settings_language_input_custom_sheet', 'project_create', 'pty_session_launch',
    'pty_input_output', 'agent_catalog', 'project_session_sidebar', 'session_rename', 'session_archive_running',
    'session_restore', 'folder_browser', 'workspace_inspector', 'file_explorer_ui', 'worktree_create_and_session',
    'session_stop_confirmation', 'native_file_transfer_and_share', 'session_switch_retains_process_output',
    'native_proxy_route_boundary',
    'native_share_reentry_preserves_file',
    'native_late_health_preserves_failure',
}
AGENT_CHECKS = {'agents_shared_ui_connected', 'four_agents_available'} | {
    agent + '_' + action + '_ui' for agent in ['codex', 'claude', 'opencode', 'gemini'] for action in ['install', 'version']
}
FATAL_CONSOLE = re.compile(
    r'BIBIMER_RUNTIME_SHUTDOWN_INCOMPLETE|SAFETY-VALVE|assertion failed|Segmentation fault|'
    r'AddressSanitizer|UndefinedBehaviorSanitizer|V8_SIGABRT|V8_SIGSEGV|EXC_BAD_ACCESS|'
    r'EXC_CRASH|abort trap|host crash', re.IGNORECASE)


def archive_evidence(evidence):
    if evidence.exists() and any(evidence.iterdir()):
        history = evidence.parent / 'history' / f'{evidence.name}-{time.time_ns()}'
        history.parent.mkdir(exist_ok=True)
        shutil.copytree(evidence, history)


def simctl(*arguments, **kwargs):
    return subprocess.run(['xcrun', 'simctl', *map(str, arguments)], check=True, **kwargs)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--timeout', type=float, default=900)
    parser.add_argument('--keep-running', action='store_true')
    parser.add_argument('--agents', action='store_true', help='Install and version-check all four CLIs through the real Setup UI')
    args = parser.parse_args()
    WORK.mkdir(parents=True, exist_ok=True)
    lock = (WORK / 'simulator-test.lock').open('w')
    try:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        raise SystemExit('Another Bibimer iOS app test is already running.') from None
    os.environ.setdefault('DEVELOPER_DIR', '/Applications/Xcode.app/Contents/Developer')
    device = (REPO / '.tools/ios-runtime/simulator-id.txt').read_text().strip()
    devices = json.loads(subprocess.check_output(['xcrun', 'simctl', 'list', 'devices', '--json']))
    found = next((row for group in devices['devices'].values() for row in group if row['udid'] == device), None)
    if not found or found['name'] != 'Bibimer Runtime Lab':
        raise SystemExit('The dedicated Bibimer Runtime Lab simulator is required.')
    if found['state'] != 'Booted':
        simctl('boot', device)
        simctl('bootstatus', device, '-b')
    app = WORK / 'iphonesimulator/Bibimer.app'
    evidence = REPO / 'dist/ios-app' / ('agents' if args.agents else 'smoke')
    archive_evidence(evidence)
    evidence.mkdir(parents=True, exist_ok=True)
    result_name = 'agent-test.json' if args.agents else 'ui-test.json'
    for name in [result_name, 'screen.png', 'host-console.txt', 'execution.json', 'test-progress.json', 'verification.json']:
        (evidence / name).unlink(missing_ok=True)
    subprocess.run(['xcrun', 'simctl', 'terminate', device, 'app.bibimer.ios'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    simctl('install', device, app)
    container = Path(subprocess.check_output(['xcrun', 'simctl', 'get_app_container', device, 'app.bibimer.ios', 'data'], text=True).strip())
    installed_app = Path(subprocess.check_output(['xcrun', 'simctl', 'get_app_container', device, 'app.bibimer.ios', 'app'], text=True).strip())
    binary_sha = hashlib.sha256((installed_app / 'Bibimer').read_bytes()).hexdigest()
    result_file = container / 'Documents' / result_name
    progress_file = container / 'Documents/test-progress.json'
    result_file.unlink(missing_ok=True)
    progress_file.unlink(missing_ok=True)
    shutil.copy2(installed_app / 'build-manifest.json', evidence / 'build-manifest.json')
    started = time.monotonic()
    launch = simctl('launch', '--stdout=' + str(evidence / 'host-console.txt'), '--stderr=' + str(evidence / 'host-console.txt'), device, 'app.bibimer.ios', '--agent-self-test' if args.agents else '--self-test', capture_output=True, text=True)
    print(launch.stdout, flush=True)
    (evidence / 'execution.json').write_text(json.dumps(dict(device=found, launch=launch.stdout.strip(), binarySHA256=binary_sha), indent=2) + '\n')
    result = None
    previous_progress = None
    last_reported = started
    while time.monotonic() - started < args.timeout:
        if result_file.exists():
            result = json.loads(result_file.read_text())
            shutil.copy2(result_file, evidence / result_name)
            break
        progress = progress_file.read_text() if progress_file.exists() else None
        if progress != previous_progress or time.monotonic() - last_reported >= 30:
            print(f'{time.monotonic() - started:.0f}s: {progress or "waiting for app setup"}', flush=True)
            previous_progress = progress
            last_reported = time.monotonic()
        time.sleep(1)
    simctl('io', device, 'screenshot', evidence / 'screen.png')
    if not args.keep_running:
        simctl('terminate', device, 'app.bibimer.ios')
    if not result:
        print('App UI verification timed out', file=sys.stderr)
        return 1
    print(json.dumps(result, indent=2), flush=True)
    checks = result.get('checks', [])
    names = [row.get('name') for row in checks]
    console = (evidence / 'host-console.txt').read_text(errors='replace')
    fatal = FATAL_CONSOLE.search(console)
    diagnostic_failures = [line for line in console.splitlines() if 'NETDIAG' in line and not re.fullmatch(r'NETDIAG connect\(pid=\d+ comm=[^\r\n]+ fd=\d+\) errno=65', line)]
    warnings = [line for line in console.splitlines() if 'stub syscall' in line or 'NETDIAG' in line]
    expected = AGENT_CHECKS if args.agents else EXPECTED_CHECKS
    passed = (result.get('ok') is True and not result.get('javascriptErrors') and
              len(names) == len(expected) and set(names) == expected and
              all(row.get('ok') is True for row in checks) and not fatal and not diagnostic_failures)
    (evidence / 'verification.json').write_text(json.dumps(dict(status=('PASS_WITH_WARNINGS' if warnings else 'PASS') if passed else 'FAIL',
        checks=len(checks), elapsedSeconds=time.monotonic() - started, warnings=warnings,
        fatal=fatal.group(0) if fatal else None, diagnosticFailures=diagnostic_failures), indent=2) + '\n')
    return 0 if passed else 1


if __name__ == '__main__':
    raise SystemExit(main())
