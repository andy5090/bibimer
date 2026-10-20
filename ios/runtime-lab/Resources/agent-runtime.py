#!/usr/bin/env python3
"""Run original installed CLIs against a guest-local synthetic inference server.

This tests real CLI initialization, transport, tools and completion, not a model
or provider authentication. All input/output belongs to this disposable probe.
"""
import gzip
from http.server import BaseHTTPRequestHandler, HTTPServer
import json
import os
from pathlib import Path
import queue
import signal
import subprocess
import sys
import threading
import time


REQUESTED_AGENT = sys.argv[1]
AGENT = {'claude-js': 'claude', 'codex-external': 'codex'}.get(REQUESTED_AGENT, REQUESTED_AGENT)
BASE = Path('/root/bibimer-probe')
WORK = BASE / ('runtime-' + REQUESTED_AGENT)
WORK.mkdir(exist_ok=True)
INPUT = 'bibimer-guest-input-7319'
FINAL = 'BIBIMER_LOCAL_AGENT_DONE'
(WORK / 'input.txt').write_text(INPUT + '\n')
(WORK / 'output.txt').unlink(missing_ok=True)
COMMAND = 'cat input.txt; printf "bibimer-agent-output-7319\\n" > output.txt'
ENV = {**os.environ, 'CI': '1', 'DISABLE_AUTOUPDATER': '1',
       'DISABLE_TELEMETRY': '1', 'DISABLE_ERROR_REPORTING': '1',
       'JSC_useJIT': '0', 'JSC_useWasm': '0', 'JSC_useConcurrentJIT': '0',
       'CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC': '1',
       'CLAUDE_CONFIG_DIR': str(WORK / 'claude-config')}
requests = []
errors = []


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def do_GET(self):
        self.send_response(404)
        self.end_headers()

    def do_POST(self):
        try:
            print('LOCAL_REQUEST_HEADERS', self.path, 'length=', self.headers.get('Content-Length'),
                  'transfer=', self.headers.get('Transfer-Encoding'), flush=True)
            body = self.rfile.read(int(self.headers.get('Content-Length', '0')))
            if self.headers.get('Content-Encoding') == 'gzip':
                body = gzip.decompress(body)
            data = json.loads(body)
            requests.append({'path': self.path, 'body': data})
            print('LOCAL_REQUEST', self.path, 'tools=',
                  [t.get('name', t.get('type')) for t in data.get('tools', [])], flush=True)
            if AGENT == 'codex' and self.path == '/v1/responses':
                self.codex(data)
            elif AGENT == 'claude' and self.path.startswith('/v1/messages') and 'count_tokens' not in self.path:
                self.claude(data)
            elif 'count_tokens' in self.path:
                payload = b'{"input_tokens":1}'
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Content-Length', str(len(payload)))
                self.end_headers()
                self.wfile.write(payload)
            else:
                self.send_response(404)
                self.end_headers()
        except Exception as error:
            errors.append(repr(error))
            print('LOCAL_SERVER_ERROR', repr(error), flush=True)
            self.close_connection = True

    def events(self, events):
        payload = ''.join('event: ' + event['type'] + '\ndata: ' + json.dumps(event) + '\n\n'
                          for event in events).encode()
        self.send_response(200)
        self.send_header('Content-Type', 'text/event-stream')
        self.send_header('Content-Length', str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)
        self.wfile.flush()

    def codex(self, data):
        results = [i for i in data.get('input', []) if i.get('type') == 'function_call_output']
        if not results:
            names = [t.get('name') for t in data.get('tools', [])]
            if 'exec_command' in names:
                name, args = 'exec_command', {'cmd': COMMAND, 'yield_time_ms': 1000}
            elif 'shell_command' in names:
                name, args = 'shell_command', {'command': COMMAND}
            elif 'shell' in names:
                name, args = 'shell', {'command': ['/bin/sh', '-c', COMMAND]}
            else:
                raise ValueError('No native command tool: ' + repr(names))
            item = {'type': 'function_call', 'id': 'fc_local', 'call_id': 'call_local',
                    'name': name, 'arguments': json.dumps(args), 'status': 'completed'}
        else:
            if INPUT not in json.dumps(results):
                raise ValueError('Command result does not contain input file contents')
            item = {'type': 'message', 'id': 'msg_local', 'role': 'assistant',
                    'status': 'completed', 'content': [{'type': 'output_text', 'text': FINAL, 'annotations': []}]}
        response = {'id': 'resp_local_' + str(len(requests)), 'object': 'response',
                    'created_at': 1, 'model': 'bibimer-local-test', 'status': 'completed',
                    'output': [item], 'usage': {'input_tokens': 1, 'output_tokens': 1, 'total_tokens': 2}}
        self.events([
            {'type': 'response.created', 'response': {**response, 'status': 'in_progress', 'output': []}},
            {'type': 'response.output_item.added', 'output_index': 0, 'item': item},
            {'type': 'response.output_item.done', 'output_index': 0, 'item': item},
            {'type': 'response.completed', 'response': response},
        ])

    def claude(self, data):
        tool_results = [c for m in data.get('messages', []) if isinstance(m.get('content'), list)
                        for c in m['content'] if c.get('type') == 'tool_result']
        if not tool_results:
            content = {'type': 'tool_use', 'id': 'toolu_local', 'name': 'Bash',
                       'input': {'command': COMMAND, 'description': 'Read and write disposable runtime test files'}}
            reason = 'tool_use'
        else:
            if INPUT not in json.dumps(tool_results):
                raise ValueError('Bash result does not contain input file contents')
            content = {'type': 'text', 'text': FINAL}
            reason = 'end_turn'
        message = {'id': 'msg_local_' + str(len(requests)), 'type': 'message', 'role': 'assistant',
                   'model': data.get('model'), 'content': [content], 'stop_reason': reason,
                   'stop_sequence': None, 'usage': {'input_tokens': 1, 'output_tokens': 1}}
        if not data.get('stream'):
            payload = json.dumps(message).encode()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            return
        start = {**content, 'input': {}} if content['type'] == 'tool_use' else {'type': 'text', 'text': ''}
        delta = {'type': 'input_json_delta', 'partial_json': json.dumps(content['input'])} if reason == 'tool_use' else {'type': 'text_delta', 'text': FINAL}
        self.events([
            {'type': 'message_start', 'message': {**message, 'content': [], 'stop_reason': None}},
            {'type': 'content_block_start', 'index': 0, 'content_block': start},
            {'type': 'content_block_delta', 'index': 0, 'delta': delta},
            {'type': 'content_block_stop', 'index': 0},
            {'type': 'message_delta', 'delta': {'stop_reason': reason, 'stop_sequence': None}, 'usage': {'output_tokens': 1}},
            {'type': 'message_stop'},
        ])


def reader(stream, messages):
    for line in stream:
        print('CLI_' + AGENT.upper(), line.rstrip(), flush=True)
        messages.put(line)
    messages.put(None)


server = HTTPServer(('127.0.0.1', 0), Handler)
threading.Thread(target=server.serve_forever, daemon=True).start()
port = server.server_port
started = time.monotonic()
process = None
try:
    if AGENT == 'codex':
        cli = str(BASE / 'codex/node_modules/.bin/codex')
        provider = ('model_providers.bibimer_local={name="Bibimer local test",'
                    f'base_url="http://127.0.0.1:{port}/v1",wire_api="responses",'
                    'requires_openai_auth=false,request_max_retries=0,stream_max_retries=0}')
        process = subprocess.Popen([cli, '-c', 'model_provider="bibimer_local"', '-c', provider,
                                    '-c', 'model="bibimer-local-test"', 'app-server'],
                                   cwd=WORK, env=ENV, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                                   stderr=subprocess.PIPE, text=True, bufsize=1, start_new_session=True)
        messages = queue.Queue()
        threading.Thread(target=reader, args=(process.stdout, messages), daemon=True).start()
        threading.Thread(target=reader, args=(process.stderr, queue.Queue()), daemon=True).start()

        def send(message):
            process.stdin.write(json.dumps(message) + '\n')
            process.stdin.flush()

        def until(predicate):
            while time.monotonic() - started < 180:
                line = messages.get(timeout=180 - (time.monotonic() - started))
                if line is None:
                    raise ValueError('app-server stdout closed early')
                message = json.loads(line)
                if message.get('error'):
                    raise ValueError(message)
                if predicate(message):
                    return message
            raise TimeoutError('app-server event deadline')

        send({'id': 1, 'method': 'initialize', 'params': {'clientInfo': {'name': 'bibimer-runtime-probe', 'version': '0.1.0'}}})
        until(lambda m: m.get('id') == 1)
        send({'method': 'initialized', 'params': {}})
        policy = {'approvalPolicy': 'never', 'sandbox': 'danger-full-access'}
        if REQUESTED_AGENT == 'codex-external':
            policy = {'approvalPolicy': 'on-request', 'sandbox': 'read-only'}
        send({'id': 2, 'method': 'thread/start', 'params': {'cwd': str(WORK), 'model': 'bibimer-local-test',
              'modelProvider': 'bibimer_local', **policy}})
        initialized_thread = until(lambda m: m.get('id') == 2)['result']
        thread = initialized_thread['thread']['id']
        send({'id': 3, 'method': 'turn/start', 'params': {'threadId': thread,
              'input': [{'type': 'text', 'text': 'Read input.txt, write output.txt, and report completion.'}],
              **({'approvalPolicy': 'on-request', 'sandboxPolicy': {'type': 'externalSandbox', 'networkAccess': 'enabled'}}
                 if REQUESTED_AGENT == 'codex-external' else {})}})
        completed = until(lambda m: m.get('method') == 'turn/completed')
        if completed['params']['turn']['status'] != 'completed':
            raise ValueError(completed)
        process.stdin.close()
        process.wait(timeout=15)
    elif AGENT == 'claude':
        if not Path('/bin/bash').is_file():
            subprocess.run(['apk', 'add', '--no-cache', 'bash'], check=True, timeout=90)
        ENV['SHELL'] = '/bin/bash'
        if REQUESTED_AGENT == 'claude-js':
            installation = subprocess.run(['npm', 'install', '--prefix', str(BASE / 'claude-js'),
                '--ignore-scripts', '--omit=optional', '--no-audit', '--no-fund',
                '--registry=https://registry.npmjs.org', '@anthropic-ai/claude-code@2.1.112'],
                env=ENV, timeout=300)
            if installation.returncode:
                raise ValueError('Official Node Claude CLI installation failed')
            cli = str(BASE / 'claude-js/node_modules/.bin/claude')
            startup = ['--setting-sources', '']
        else:
            cli = str(BASE / 'claude/node_modules/.bin/claude')
            startup = ['--bare']
        ENV.update(ANTHROPIC_BASE_URL=f'http://127.0.0.1:{port}',
                   ANTHROPIC_API_KEY='bibimer-local-test-not-a-secret', CLAUDE_CODE_MAX_RETRIES='0', API_TIMEOUT_MS='15000')
        process = subprocess.Popen([cli, *startup, '--no-session-persistence', '-p', 'Read input.txt, write output.txt, and report completion.',
                                    '--output-format', 'stream-json', '--verbose', '--model', 'claude-sonnet-4-6',
                                    '--allowedTools', 'Bash', '--tools', 'Bash', '--strict-mcp-config',
                                    '--mcp-config', '{"mcpServers":{}}'], cwd=WORK, env=ENV,
                                   stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                                   text=True, start_new_session=True)
        lines = []
        def capture():
            for line in process.stdout:
                lines.append(line)
                print('CLI_CLAUDE', line.rstrip(), flush=True)
        output_thread = threading.Thread(target=capture, daemon=True)
        output_thread.start()
        process.wait(timeout=180)
        output_thread.join(timeout=5)
        stdout = ''.join(lines)
        events = [json.loads(line) for line in stdout.splitlines() if line.startswith('{')]
        print('CLI_EXIT', process.returncode, flush=True)
        if not any(e.get('type') == 'result' and not e.get('is_error') and FINAL in e.get('result', '') for e in events):
            raise ValueError('No successful native Claude result event')
    else:
        raise ValueError('Unknown agent')
    if process.returncode != 0:
        raise ValueError('CLI exit: ' + str(process.returncode))
    if errors or len(requests) < 2:
        raise ValueError({'errors': errors, 'requests': len(requests)})
    if (WORK / 'output.txt').read_text() != 'bibimer-agent-output-7319\n':
        raise ValueError('Tool did not write expected output file')
    print('LOCAL_AGENT_RESULT', json.dumps({'agent': AGENT, 'mode': 'synthetic-guest-local-inference',
          'exitCode': process.returncode, 'requests': len(requests), 'readInput': True,
          'wroteOutput': True, 'durationSeconds': time.monotonic() - started}), flush=True)
finally:
    if process is not None and process.poll() is None:
        os.killpg(process.pid, signal.SIGKILL)
        process.wait(timeout=10)
    server.shutdown()
    server.server_close()
