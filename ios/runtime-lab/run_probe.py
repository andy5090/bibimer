#!/usr/bin/env python3
"""Run a guest probe in a dedicated simulator and preserve completion evidence."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import time

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
WORK = REPO / '.tools/ios-runtime'
BUNDLE = 'app.bibimer.runtime-lab'


def simctl(*args, check=True, capture=False):
    return subprocess.run(['xcrun', 'simctl', *map(str, args)], check=check,
                          text=True, capture_output=capture)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--tier', choices=['basic', 'packages', 'agents', 'agent-runtime', 'codex-external', 'claude-runtime', 'claude-js', 'kernel-runtime', 'bridge-pty', 'node-network', 'node-wasm', 'extra-install', 'extra-runtime', 'gemini-acp', 'epoll-runtime', 'compute-signal', 'bun-math', 'arm64-fp', 'bun-process', 'bun-preload', 'bun-compiled-preload', 'bun-compiled-inspect', 'memory-fault', 'signal-stack', 'claude-sdk', 'opencode-provider', 'opencode-inspect', 'opencode-search', 'opencode-preload-search', 'opencode-inspect-preload-search', 'opencode-stdio-trace', 'opencode-compat-search', 'opencode-shell-edges', 'opencode-117-search', 'opencode-1313-search', 'opencode-version', 'opencode-runtime', 'opencode-jit', 'opencode-baseline', 'opencode-legacy', 'opencode-legacy-provider', 'gemini-version', 'gemini-runtime', 'persistence', 'shutdown'], default='basic')
    parser.add_argument('--device', help='Dedicated lab simulator UUID')
    parser.add_argument('--timeout', type=int, default=1500)
    args = parser.parse_args()
    os.environ.setdefault('DEVELOPER_DIR', '/Applications/Xcode.app/Contents/Developer')
    WORK.mkdir(parents=True, exist_ok=True)
    state = WORK / 'simulator-id.txt'
    device = args.device or (state.read_text().strip() if state.exists() else None)
    if not device:
        runtimes = json.loads(simctl('list', 'runtimes', '--json', capture=True).stdout)['runtimes']
        runtime = sorted((r for r in runtimes if r.get('isAvailable') and r['identifier'].startswith('com.apple.CoreSimulator.SimRuntime.iOS-')),
                         key=lambda r: tuple(int(p) for p in r['version'].split('.')))[-1]
        device = simctl('create', 'Bibimer Runtime Lab', 'com.apple.CoreSimulator.SimDeviceType.iPhone-17-Pro',
                        runtime['identifier'], capture=True).stdout.strip()
        state.write_text(device + '\n')
    devices = json.loads(simctl('list', 'devices', '--json', capture=True).stdout)['devices']
    entry = next((d for group in devices.values() for d in group if d['udid'] == device), None)
    if not entry or entry['name'] != 'Bibimer Runtime Lab':
        raise SystemExit('Only a dedicated simulator named Bibimer Runtime Lab may be used.')
    if entry['state'] != 'Booted':
        simctl('boot', device)
    simctl('bootstatus', device, '-b')
    app = WORK / 'iphonesimulator/BibimerRuntimeLab.app'
    simctl('terminate', device, BUNDLE, check=False, capture=True)
    simctl('install', device, app)
    container = Path(simctl('get_app_container', device, BUNDLE, 'data', capture=True).stdout.strip())
    documents = container / 'Documents'
    documents.mkdir(exist_ok=True)
    for name in ['probe-output.txt', 'probe-result.json']:
        (documents / name).unlink(missing_ok=True)
    evidence = REPO / 'dist/ios-runtime-lab' / args.tier
    evidence.mkdir(parents=True, exist_ok=True)
    if (evidence / 'execution.json').exists():
        archive = evidence / 'history' / str(time.time_ns())
        archive.mkdir(parents=True)
        for previous in evidence.iterdir():
            if previous.is_file(): shutil.copy2(previous, archive / previous.name)
    for name in ['probe-output.txt', 'probe-result.json', 'timeout.json', 'screen.png', 'verification.json']:
        (evidence / name).unlink(missing_ok=True)
    host_log = evidence / 'host-console.txt'
    host_log.write_text('')
    shutil.copy2(app / 'build-manifest.json', evidence / 'build-manifest.json')
    launched = simctl('launch', '--stdout=' + str(host_log), '--stderr=' + str(host_log),
                     device, BUNDLE, '--probe', '--tier', args.tier, capture=True)
    print(launched.stdout.strip(), flush=True)
    pid = int(launched.stdout.strip().rsplit(':', 1)[1])
    (evidence / 'execution.json').write_text(json.dumps({
        'simulator': device, 'tier': args.tier, 'pid': pid,
        'signedBinarySHA256': hashlib.sha256((app / 'BibimerRuntimeLab').read_bytes()).hexdigest(),
        'buildManifestSHA256': hashlib.sha256((evidence / 'build-manifest.json').read_bytes()).hexdigest(),
    }, indent=2) + '\n')
    started = time.monotonic()
    size = -1
    while not (documents / 'probe-result.json').exists():
        elapsed = time.monotonic() - started
        try:
            os.kill(pid, 0)
        except ProcessLookupError:
            if (documents / 'probe-output.txt').exists():
                shutil.copy2(documents / 'probe-output.txt', evidence / 'probe-output.txt')
            raise SystemExit(f'App exited before completion; not a pass. Evidence: {evidence}')
        if elapsed > args.timeout:
            simctl('terminate', device, BUNDLE, check=False, capture=True)
            for name in ['probe-output.txt', 'probe-result.json']:
                if (documents / name).exists(): shutil.copy2(documents / name, evidence / name)
            (evidence / 'timeout.json').write_text(json.dumps({'tier': args.tier, 'timeoutSeconds': args.timeout}))
            raise SystemExit(f'Probe timed out; not a pass. Evidence: {evidence}')
        path = documents / 'probe-output.txt'
        current_size = path.stat().st_size if path.exists() else 0
        if int(elapsed) % 15 == 0 and current_size != size:
            print(f'{args.tier}: {elapsed:.0f}s, {current_size} output bytes', flush=True)
            size = current_size
        time.sleep(1)
    for name in ['probe-output.txt', 'probe-result.json']:
        shutil.copy2(documents / name, evidence / name)
    simctl('io', device, 'screenshot', evidence / 'screen.png', check=False, capture=True)
    print(f'Evidence: {evidence}', flush=True)
    # Use the standalone verifier's CLI so invalid output fails the runner.
    verified = subprocess.run([sys.executable, str(HERE / 'tests/verify_probe.py'), '--tier', args.tier,
                               '--documents', str(evidence)], text=True, capture_output=True)
    if verified.returncode:
        print(verified.stderr, file=sys.stderr, end='')
        raise SystemExit(verified.returncode)
    (evidence / 'verification.json').write_text(verified.stdout)
    print(verified.stdout, end='')


if __name__ == '__main__':
    main()
