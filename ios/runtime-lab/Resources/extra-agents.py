#!/usr/bin/env python3
"""Install and exercise original OpenCode/Gemini CLIs inside the Alpine guest.

The inference responses below are synthetic and served on guest loopback. A
successful runtime check proves the real CLI's transport, native tools and
completion path, not model quality, provider authentication or Internet APIs.
"""
import argparse
import gzip
from http.server import BaseHTTPRequestHandler, HTTPServer
import json
import os
from pathlib import Path
import signal
import sqlite3
import subprocess
import threading
import time


BASE = Path('/root/bibimer-probe')
VERSIONS = {'opencode': '1.19.3', 'gemini': '0.64.0'}
TEST_VERSION = os.environ.get('BIBIMER_TEST_OPENCODE_VERSION')
LEGACY_TEST = TEST_VERSION == '1.2.27'
if TEST_VERSION in {'1.2.27', '1.3.13', '1.17.0'}:
    VERSIONS['opencode'] = TEST_VERSION
    BASE = Path('/root/bibimer-probe-opencode-' + TEST_VERSION)
PACKAGES = {'opencode': 'opencode-linux-arm64-musl', 'gemini': '@google/gemini-cli'}
INPUT = 'bibimer-extra-guest-input-7319'
OUTPUT = 'bibimer-extra-agent-output-7319\n'
FINAL = 'BIBIMER_LOCAL_EXTRA_AGENT_DONE'


def cli_path(agent):
    if agent == 'opencode':
        return BASE / agent / 'node_modules/opencode-linux-arm64-musl/bin/opencode'
    original = BASE / agent / 'node_modules/.bin/gemini'
    wrapper = BASE / agent / 'gemini-node.sh'
    if original.is_file():
        wrapper.write_text('#!/bin/sh\nISH_NODE_NO_ARG_INJECTION=1 exec node '
                           '--no-opt --no-sparkplug --single-threaded --no-wasm-tier-up '
                           '--liftoff-only --no-lazy --max-old-space-size=512 '
                           + str(original) + ' "$@"\n')
        wrapper.chmod(0o700)
    return wrapper


def environment(agent, work):
    # Keep probes separate from user settings and never inherit provider secrets.
    env = {key: value for key, value in os.environ.items()
           if key in ('HOME', 'PATH', 'LANG', 'LC_ALL', 'TERM', 'NODE_OPTIONS')}
    profile = work / 'profile'
    profile.mkdir(parents=True, exist_ok=True)
    env.update(CI='1', NO_COLOR='1', DO_NOT_TRACK='1', JSC_useJIT='0', SHELL='/bin/bash',
               GEMINI_CLI_NO_RELAUNCH='1', GEMINI_CLI_HOME=str(profile / '.gemini'),
               OPENCODE_DISABLE_AUTOUPDATE='1', OPENCODE_DISABLE_MODELS_FETCH='1',
               OPENCODE_DISABLE_FFF='1', OPENCODE_EXPERIMENTAL_DISABLE_FILEWATCHER='true',
               OPENCODE_DISABLE_TERMINAL_TITLE='1',
               XDG_CONFIG_HOME=str(profile / '.config'), XDG_CACHE_HOME=str(profile / '.cache'),
               XDG_DATA_HOME=str(profile / '.local/share'), XDG_STATE_HOME=str(profile / '.local/state'))
    if agent == 'opencode' and os.environ.get('BIBIMER_TEST_GUEST_JSC_JIT') == '1':
        env['JSC_useJIT'] = '1'
        if os.environ.get('BIBIMER_TEST_GUEST_JSC_BASELINE') == '1':
            env.update(JSC_useDFGJIT='0', JSC_useFTLJIT='0', JSC_useConcurrentJIT='0')
    return env


def terminate(process):
    if process.poll() is None:
        # A separate guest process group prevents timed-out CLI descendants from
        # surviving the probe; never signal an unrelated session or host PID.
        try:
            os.killpg(process.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        process.wait(timeout=15)


def run(command, *, cwd, env, timeout):
    print('EXTRA_AGENT_COMMAND', json.dumps(command), flush=True)
    process = subprocess.Popen(command, cwd=cwd, env=env, stdin=subprocess.DEVNULL,
                               stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                               text=True, start_new_session=True)
    started, printed = time.monotonic(), 0
    try:
        while True:
            remaining = timeout - (time.monotonic() - started)
            if remaining <= 0:
                raise subprocess.TimeoutExpired(command, timeout)
            try:
                stdout, _ = process.communicate(timeout=min(5, remaining))
                print(stdout[printed:], end='', flush=True)
                break
            except subprocess.TimeoutExpired as error:
                captured = error.output or b''
                captured = captured.decode(errors='replace') if isinstance(captured, bytes) else captured
                print(captured[printed:], end='', flush=True)
                printed = len(captured)
        if process.returncode != 0:
            raise RuntimeError(f'CLI exited with {process.returncode}')
        return stdout
    finally:
        terminate(process)


def install(agent):
    # OpenCode's package is the official musl ARM64 executable, not a host
    # wrapper. Avoid its meta-package postinstall's unbounded version subprocess.
    # Gemini optional PTY/keychain addons are unavailable on Alpine ARM64; its
    # native file tools and child_process fallback remain independently tested.
    if agent == 'opencode' and os.environ.get('BIBIMER_TEST_OPENCODE_SEARCH') == '1':
        run(['apk', 'add', '--no-cache', 'ripgrep'], cwd=BASE, env=dict(os.environ), timeout=180)
    target = BASE / agent
    target.mkdir(exist_ok=True)
    run(['npm', 'install', '--prefix', str(target), '--ignore-scripts', '--omit=optional',
         '--no-audit', '--no-fund', '--registry=https://registry.npmjs.org',
         PACKAGES[agent] + '@' + VERSIONS[agent]], cwd=BASE,
        env={**os.environ, 'CI': '1'}, timeout=900)
    package = target / 'node_modules' / PACKAGES[agent] / 'package.json'
    actual = json.loads(package.read_text())['version']
    if actual != VERSIONS[agent] or not cli_path(agent).is_file():
        raise RuntimeError(f'Unexpected installation: {actual}')
    if agent == 'opencode':
        bindir = target / 'node_modules/.bin'
        bindir.mkdir(exist_ok=True)
        link = bindir / 'opencode'
        link.unlink(missing_ok=True)
        link.symlink_to('../opencode-linux-arm64-musl/bin/opencode')
    print('EXTRA_AGENT_INSTALL', json.dumps({'agent': agent, 'version': actual,
          'package': PACKAGES[agent], 'execution': 'guest-linux-arm64'}), flush=True)


def version(agent):
    work = BASE / ('runtime-' + agent)
    work.mkdir(exist_ok=True)
    stdout = run([str(cli_path(agent)), '--version'], cwd=work,
                 env=environment(agent, work), timeout=180)
    if VERSIONS[agent] not in stdout:
        raise RuntimeError('Native version output does not match pinned package')


class InferenceServer(HTTPServer):
    def __init__(self, agent, work):
        super().__init__(('127.0.0.1', 0), Handler)
        self.agent, self.work = agent, work
        self.requests, self.errors = [], []
        self.read_seen = self.write_seen = False
        self.glob_seen = self.grep_seen = False


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def reply(self, payload, content_type='application/json'):
        if not isinstance(payload, bytes):
            payload = json.dumps(payload).encode()
        self.send_response(200)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)
        self.wfile.flush()

    def do_GET(self):
        self.reply({'object': 'list', 'data': [{'id': 'bibimer-local-test', 'object': 'model'}]})

    def do_POST(self):
        try:
            body = self.rfile.read(int(self.headers.get('Content-Length', 0)))
            if self.headers.get('Content-Encoding') == 'gzip':
                body = gzip.decompress(body)
            data = json.loads(body)
            self.server.requests.append(self.path)
            print('EXTRA_LOCAL_REQUEST', self.path, flush=True)
            if 'countTokens' in self.path:
                self.reply({'totalTokens': 1})
            elif self.server.agent == 'gemini':
                self.gemini(data)
            elif self.path.endswith('/chat/completions'):
                self.opencode(data)
            else:
                raise ValueError('Unexpected API path: ' + self.path)
        except Exception as error:
            self.server.errors.append(repr(error))
            print('EXTRA_LOCAL_SERVER_ERROR', repr(error), flush=True)
            self.send_error(500)

    def gemini(self, data):
        tool_results = [part['functionResponse'] for item in data.get('contents', [])
                        for part in item.get('parts', []) if 'functionResponse' in part]
        if not self.server.read_seen:
            if tool_results:
                if INPUT not in json.dumps(tool_results):
                    raise ValueError('Native read_file result does not contain fixture input')
                self.server.read_seen = True
            else:
                part = {'functionCall': {'id': 'read_local', 'name': 'read_file',
                        'args': {'file_path': str(self.server.work / 'input.txt')}}}
        if self.server.read_seen and not self.server.write_seen:
            if any(result.get('name') == 'write_file' for result in tool_results):
                if (self.server.work / 'output.txt').read_text() != OUTPUT:
                    raise ValueError('Native write_file did not create expected fixture output')
                self.server.write_seen = True
            else:
                part = {'functionCall': {'id': 'write_local', 'name': 'write_file',
                        'args': {'file_path': str(self.server.work / 'output.txt'), 'content': OUTPUT}}}
        if self.server.write_seen:
            part = {'text': FINAL}
        payload = {'candidates': [{'index': 0, 'content': {'role': 'model', 'parts': [part]},
                                  'finishReason': 'STOP'}],
                   'usageMetadata': {'promptTokenCount': 1, 'candidatesTokenCount': 1,
                                     'totalTokenCount': 2}, 'modelVersion': 'gemini-2.5-flash'}
        if 'streamGenerateContent' in self.path:
            self.reply(('data: ' + json.dumps(payload) + '\n\n').encode(), 'text/event-stream')
        else:
            self.reply(payload)

    def opencode(self, data):
        results = [m for m in data.get('messages', []) if m.get('role') == 'tool']
        tools = [tool.get('function', {}).get('name') for tool in data.get('tools', [])]
        search = os.environ.get('BIBIMER_TEST_OPENCODE_SEARCH') == '1'
        by_id = {item.get('tool_call_id'): item for item in results}
        for identity, expected, attribute in [
                ('call_local_glob', (str(self.server.work / 'input.txt'),), 'glob_seen'),
                ('call_local_grep', ('input.txt:', 'Line 1: ' + INPUT), 'grep_seen')]:
            if identity in by_id:
                if not all(value in json.dumps(by_id[identity]) for value in expected):
                    raise ValueError('Native search result mismatch: ' + identity)
                setattr(self.server, attribute, True)
        next_search = None
        if search and not self.server.glob_seen:
            next_search = ('glob', {'pattern': 'input.txt', 'path': '.', 'limit': 5})
        elif search and not self.server.grep_seen:
            next_search = ('grep', {'pattern': INPUT, 'path': '.', 'include': 'input.txt', 'limit': 5})
        if not results and 'bash' not in tools:
            # OpenCode can request an auxiliary session title with its
            # small model. This does not count as a native-tool roundtrip.
            delta, reason = {'role': 'assistant', 'content': 'Bibimer runtime probe'}, 'stop'
        elif next_search:
            name, arguments = next_search
            if name not in tools:
                raise ValueError('Original OpenCode did not offer native ' + name)
            delta = {'role': 'assistant', 'tool_calls': [{'index': 0, 'id': 'call_local_' + name,
                     'type': 'function', 'function': {'name': name, 'arguments': json.dumps(arguments)}}]}
            reason = 'tool_calls'
        elif not results or (search and 'call_local' not in by_id):
            command = 'cat input.txt; printf "bibimer-extra-agent-output-7319\\n" > output.txt'
            delta = {'role': 'assistant', 'tool_calls': [{'index': 0, 'id': 'call_local',
                     'type': 'function', 'function': {'name': 'bash',
                     'arguments': json.dumps({'command': command,
                                             'description': 'Read and write disposable test files'})}}]}
            reason = 'tool_calls'
        else:
            bash_result = by_id.get('call_local') if search else results
            if INPUT not in json.dumps(bash_result):
                raise ValueError('Native bash result does not contain fixture input: ' + json.dumps(bash_result)[:1024])
            self.server.read_seen = self.server.write_seen = True
            delta, reason = {'role': 'assistant', 'content': FINAL}, 'stop'
        common = {'id': 'chatcmpl_local_' + str(len(self.server.requests)), 'created': 1,
                  'model': 'bibimer-local-test', 'object': 'chat.completion.chunk'}
        if not data.get('stream'):
            message = {**delta}
            if 'tool_calls' in message:
                message['tool_calls'] = [{k: v for k, v in tool.items() if k != 'index'}
                                         for tool in message['tool_calls']]
            self.reply({**common, 'object': 'chat.completion',
                        'choices': [{'index': 0, 'message': message, 'finish_reason': reason}],
                        'usage': {'prompt_tokens': 1, 'completion_tokens': 1, 'total_tokens': 2}})
            return
        events = [{**common, 'choices': [{'index': 0, 'delta': delta, 'finish_reason': None}]},
                  {**common, 'choices': [{'index': 0, 'delta': {}, 'finish_reason': reason}],
                   'usage': {'prompt_tokens': 1, 'completion_tokens': 1, 'total_tokens': 2}}]
        payload = ''.join('data: ' + json.dumps(event) + '\n\n' for event in events) + 'data: [DONE]\n\n'
        self.reply(payload.encode(), 'text/event-stream')


def runtime(agent):
    work = BASE / ('runtime-' + agent)
    work.mkdir(exist_ok=True)
    (work / 'input.txt').write_text(INPUT + '\n')
    (work / 'output.txt').unlink(missing_ok=True)
    server = InferenceServer(agent, work)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    env = environment(agent, work)
    started = time.monotonic()
    url = f'http://127.0.0.1:{server.server_port}'
    prompt = 'Read input.txt, write output.txt, and report completion.'
    try:
        if agent == 'gemini':
            config = Path(env['GEMINI_CLI_HOME']) / '.gemini'
            config.mkdir(parents=True, exist_ok=True)
            (config / 'settings.json').write_text(json.dumps({
                'security': {'auth': {'selectedType': 'gemini-api-key'}, 'folderTrust': {'enabled': False}},
                'general': {'enableAutoUpdate': False, 'maxAttempts': 1},
                'telemetry': {'enabled': False}, 'advanced': {'autoConfigureMemory': False}}))
            env.update(GEMINI_API_KEY='bibimer-local-test-not-a-secret',
                       GOOGLE_GEMINI_BASE_URL=url, GOOGLE_GENAI_API_VERSION='v1beta')
            command = [str(cli_path(agent)), '-p', prompt, '--output-format', 'stream-json',
                       '--approval-mode', 'yolo', '--model', 'gemini-2.5-flash']
        else:
            config = {'$schema': 'https://opencode.ai/config.json', 'model': 'bibimer_local/bibimer-local-test',
                      'small_model': 'bibimer_local/bibimer-local-test', 'autoupdate': False,
                      'permission': 'allow', 'share': 'disabled', 'snapshot': False,
                      'provider': {'bibimer_local': {'npm': '@ai-sdk/openai-compatible',
                       'name': 'Bibimer guest-local synthetic inference',
                       'options': {'baseURL': url + '/v1', 'apiKey': 'bibimer-local-test-not-a-secret'},
                       'models': {'bibimer-local-test': {'name': 'Bibimer local test',
                                  'limit': {'context': 32000, 'output': 4096}}}}}}
            (work / 'opencode.json').write_text(json.dumps(config))
            env['OPENCODE_CONFIG'] = str(work / 'opencode.json')
            command = [str(cli_path(agent)), 'run', '--format', 'json',
                       '--model', 'bibimer_local/bibimer-local-test', prompt]
        stdout = run(command, cwd=work, env=env, timeout=360)
        events = [json.loads(line) for line in stdout.splitlines() if line.startswith('{')]
        if agent == 'gemini':
            completed = any(e.get('type') == 'result' and e.get('status') == 'success' for e in events)
        else:
            completed = any(e.get('type') == 'step_finish' and
                            e.get('part', {}).get('reason') == 'stop' for e in events)
        if not completed or FINAL not in stdout:
            raise RuntimeError('No successful native completion event and final response')
        if server.errors or not server.read_seen or not server.write_seen:
            raise RuntimeError({'errors': server.errors, 'requests': server.requests,
                                'readInput': server.read_seen, 'wroteOutput': server.write_seen})
        if (work / 'output.txt').read_text() != OUTPUT:
            raise RuntimeError('Native tool output file mismatch')
        print('LOCAL_AGENT_RESULT', json.dumps({'agent': agent, 'version': VERSIONS[agent],
              'mode': 'synthetic-guest-local-inference', 'exitCode': 0,
              'requests': len(server.requests), 'readInput': True, 'wroteOutput': True,
              'nativeCompletion': True, 'durationSeconds': time.monotonic() - started}), flush=True)
    finally:
        server.shutdown()
        server.server_close()


def inspect_opencode():
    """Read only our disposable probe profile; never agent/user auth locations."""
    for name in ('input.txt', 'output.txt'):
        path = BASE / 'runtime-opencode-provider' / name
        print('OPENCODE_INSPECT_FILE', json.dumps({'name': name, 'exists': path.is_file(),
              'bytes': path.read_bytes()[:1024].decode(errors='replace') if path.is_file() else None}), flush=True)
    profile = BASE / 'runtime-opencode-provider/profile'
    found = 0
    for database in profile.rglob('*.db'):
        print('OPENCODE_INSPECT_DATABASE', str(database), flush=True)
        connection = sqlite3.connect(database.as_uri() + '?mode=ro', uri=True)
        try:
            tables = [row[0] for row in connection.execute("SELECT name FROM sqlite_master WHERE type='table'")]
            for table in tables:
                quoted = '"' + table.replace('"', '""') + '"'
                cursor = connection.execute('SELECT * FROM ' + quoted + ' LIMIT 1000')
                columns = [item[0] for item in cursor.description]
                for row in cursor:
                    text = json.dumps(dict(zip(columns, row)), default=str)
                    if 'call_local' in text or '"bash"' in text or '\\"bash\\"' in text:
                        print('OPENCODE_INSPECT_ROW', table, text[:16384], flush=True)
                        found += 1
        finally:
            connection.close()
    if not found:
        raise RuntimeError('No native tool records in the disposable OpenCode database')
    print('opencode_inspect_ok rows=' + str(found), flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('mode', choices=[agent + '-' + action for agent in VERSIONS
                                        for action in ('install', 'version', 'runtime')] + ['opencode-inspect'])
    mode = parser.parse_args().mode
    if not Path('/etc/alpine-release').exists() or os.uname().machine != 'aarch64':
        raise SystemExit('Execute only inside the bundled ARM64 Alpine guest')
    BASE.mkdir(exist_ok=True)
    if mode == 'opencode-inspect':
        inspect_opencode()
        return
    agent, action = mode.split('-')
    if LEGACY_TEST and agent == 'opencode' and action == 'runtime':
        install(agent)
        version(agent)
    {'install': install, 'version': version, 'runtime': runtime}[action](agent)


if __name__ == '__main__':
    main()
