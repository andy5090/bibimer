#!/usr/bin/env python3
"""Optional real-CLI metadata probe, run inside the disposable iOS QA guest.

Uses already installed pinned packages, a temporary HOME and no credentials.
Does not initiate OAuth, send a prompt, install packages, or print native output.
"""
import contextlib
import importlib.util
import json
import os
from pathlib import Path
import signal
import subprocess
import tempfile
import time


def command(argv, cwd):
    started = time.monotonic()
    process = subprocess.Popen(argv, cwd=cwd, stdin=subprocess.DEVNULL,
                               stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
                               start_new_session=True)
    try:
        output, _ = process.communicate(timeout=125)
        return process.returncode, output, round(time.monotonic() - started, 3)
    finally:
        with contextlib.suppress(ProcessLookupError):
            os.killpg(process.pid, signal.SIGKILL)
        process.wait(timeout=5)


def main():
    entry_path = Path('/opt/bibimer/ios/run.py')
    if not Path('/etc/alpine-release').is_file() or not entry_path.is_file():
        raise SystemExit('Run only inside the disposable Bibimer iOS QA Linux guest.')
    managed = Path('/root/.local/share/bibimer')
    cli = managed / 'agents/claude/node_modules/@anthropic-ai/claude-code/cli.js'
    sdk = managed / 'claude/node_modules/@anthropic-ai/claude-agent-sdk/sdk.mjs'
    if not cli.is_file() or not sdk.is_file():
        raise SystemExit('The pinned Claude CLI and SDK must already be installed in QA.')
    spec = importlib.util.spec_from_file_location('ios_entry', entry_path)
    entry = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(entry)
    assert json.loads(cli.with_name('package.json').read_text())['version'] == entry.CLAUDE_VERSION
    assert json.loads(sdk.with_name('package.json').read_text())['version'] == entry.CLAUDE_SDK_VERSION
    with tempfile.TemporaryDirectory(prefix='bibimer-claude-accounts-') as temporary:
        home = Path(temporary)
        # A fresh allowlist, rather than inheriting ambient provider credentials,
        # custom settings, proxy credentials, or the native bridge bearer token.
        os.environ.clear()
        os.environ.update(
            HOME=str(home), PATH='/usr/local/bin:/usr/bin:/bin', LANG='C.UTF-8',
            XDG_CONFIG_HOME=str(home / 'config'), XDG_DATA_HOME=str(home / 'data'),
            XDG_STATE_HOME=str(home / 'state'), CLAUDE_CONFIG_DIR=str(home / 'claude'),
            BIBIMER_CLAUDE_SDK_PATH=str(sdk), OPENSSL_armcap='0',
            DISABLE_AUTOUPDATER='1', DISABLE_TELEMETRY='1', DISABLE_ERROR_REPORTING='1',
            CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC='1', CI='1',
            ANTHROPIC_BASE_URL='http://127.0.0.1:9')
        code, raw, seconds = command(['node', str(cli), 'auth', 'status'], home)
        report = json.loads(raw)
        assert code == 1 and report.get('loggedIn') is False, 'Expected isolated signed-out status'
        checks = [dict(name='real_cli_signed_out', seconds=seconds, ok=True)]
        adapted = home / 'claude-login.mjs'
        adapted.write_text(entry.claude_ui_login_source(cli.read_text(), cli.as_uri()))
        adapted.chmod(0o700)
        code, raw, seconds = command([str(adapted), '--version'], home)
        assert code == 0 and raw.strip() == (entry.CLAUDE_VERSION + ' (Claude Code)').encode()
        checks.append(dict(name='real_adapted_cli_executes', seconds=seconds, ok=True))
        base = entry.adapt(entry.load_bridge(), claude_provider=entry.prepare_claude_provider(home))
        started = time.monotonic()
        with base.HistoryClient(str(cli), str(home), 'claude') as client:
            result = client.call('model/list', {'limit': 100, 'includeHidden': False})
        assert result.get('data'), 'Expected native SDK model metadata without a user turn'
        checks.append(dict(name='real_ios_history_models', models=len(result['data']),
                           seconds=round(time.monotonic() - started, 3), ok=True))
        print(json.dumps(dict(ok=True, checks=checks)))


if __name__ == '__main__':
    main()
