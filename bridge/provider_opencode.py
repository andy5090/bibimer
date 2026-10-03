"""OpenCode's official local HTTP API -> Bibimer's bounded stdio event protocol.

One owned, authenticated loopback server per adapter. No model turn is sent by
listing, creating, resuming or forking. CLI configuration and permissions remain
in OpenCode; only explicit, session-scoped approval replies are forwarded.
"""
import base64
import json
import os
from pathlib import Path
import re
import secrets
import select
import signal
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid


class Adapter:
    def __init__(self, executable):
        self.cwd = str(Path.cwd().resolve())
        self.thread, self.turn, self.message_id = None, None, None
        self.permission_mode = 'inherit'
        self.lock, self.output_lock = threading.RLock(), threading.Lock()
        self.pending, self.seen = {}, {}
        self.closed = threading.Event()
        password = secrets.token_urlsafe(32)
        self.auth = 'Basic ' + base64.b64encode(('bibimer:' + password).encode()).decode()
        env = dict(os.environ, OPENCODE_SERVER_USERNAME='bibimer', OPENCODE_SERVER_PASSWORD=password,
                   OPENCODE_DISABLE_AUTOUPDATE='true', OPENCODE_AUTO_SHARE='false')
        self.process = subprocess.Popen([executable, 'serve', '--hostname', '127.0.0.1', '--port', '0', '--log-level', 'ERROR'],
            cwd=self.cwd, env=env, stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
        self.base = None
        end, buffer = time.monotonic() + 7, b''
        while time.monotonic() < end:
            if select.select([self.process.stdout], [], [], .1)[0]:
                chunk = os.read(self.process.stdout.fileno(), 4096)
                if not chunk:
                    break
                buffer = (buffer + chunk)[-8192:]
                match = re.search(rb'http://127\.0\.0\.1:([0-9]{1,5})(?:\s|$)', buffer)
                if match and 0 < int(match[1]) < 65536:
                    self.base = match[0].decode().strip()
                    break
        if not self.base:
            self.close()
            raise RuntimeError('error_agent_start')
        # Drain CLI diagnostics without printing or retaining them.
        def drain():
            while self.process.stdout.read(4096):
                pass
        threading.Thread(target=drain, daemon=True).start()
        threading.Thread(target=self.monitor, daemon=True).start()

    def emit(self, value):
        with self.output_lock:
            print(json.dumps(value, ensure_ascii=False), flush=True)

    def notify(self, method, params):
        self.emit({'method': method, 'params': {'threadId': self.thread, 'turnId': self.turn, **params}})

    def http(self, method, route, body=None, **params):
        query = urllib.parse.urlencode({'directory': self.cwd, **params})
        request = urllib.request.Request(self.base + route + '?' + query,
            data=None if body is None else json.dumps(body).encode(), method=method,
            headers={'Authorization': self.auth, 'Content-Type': 'application/json'})
        # The URL is internal and fixed; never follow redirects with credentials.
        class NoRedirect(urllib.request.HTTPRedirectHandler):
            def redirect_request(self, *args, **kwargs):
                return None
        with urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect()).open(request, timeout=5) as response:
            raw = response.read(8 * 1024 * 1024 + 1)
            if len(raw) > 8 * 1024 * 1024:
                raise RuntimeError('error_agent_transport')
            return json.loads(raw) if raw else None

    def source(self, key):
        if not isinstance(key, str) or not re.fullmatch(r'ses[A-Za-z0-9_-]{1,124}', key):
            raise RuntimeError('error_import_invalid')
        source = self.http('GET', '/session/' + key)
        if str(Path(source.get('directory') or '/').resolve()) != self.cwd:
            raise RuntimeError('error_import_project')
        if source.get('time', {}).get('archived'):
            raise RuntimeError('error_import_invalid')
        return source

    @staticmethod
    def metadata(source):
        return {'id': source['id'], 'cwd': source['directory'], 'name': source.get('title', ''),
                'updatedAt': source.get('time', {}).get('updated', 0) / 1000,
                'ephemeral': False, 'source': 'appServer', 'status': {'type': 'notLoaded'}}

    @staticmethod
    def entries(messages):
        result = []
        for message in messages:
            info, parts = message['info'], message.get('parts', [])
            turn = info.get('parentID') or info['id']
            text = '\n'.join(part.get('text', '') for part in parts if part.get('type') == 'text' and not part.get('ignored'))
            if text:
                item = {'id': info['id'], 'type': 'userMessage' if info['role'] == 'user' else 'agentMessage',
                        'status': 'completed' if info['role'] == 'user' or info.get('time', {}).get('completed') else 'inProgress'}
                item.update({'content': [{'type': 'text', 'text': text[:32768]}]} if info['role'] == 'user' else {'text': text[:32768]})
                result.append({'turnId': turn, 'item': item})
            for part in parts:
                if part.get('type') != 'tool':
                    continue  # Never forward raw reasoning, secrets or binary attachments.
                state, tool = part.get('state', {}), part.get('tool', 'tool')
                data = state.get('input') or {}
                status = {'pending': 'inProgress', 'running': 'inProgress', 'completed': 'completed', 'error': 'failed'}.get(state.get('status'), 'inProgress')
                item = {'id': part['id'], 'type': 'tool', 'tool': tool, 'status': status,
                        'result': str(state.get('output') or state.get('error') or '')[:32768]}
                if tool in {'bash', 'shell'}:
                    item.update(type='commandExecution', command=data.get('command', ''), aggregatedOutput=item['result'],
                                exitCode=(state.get('metadata') or {}).get('exit'))
                elif tool in {'edit', 'write', 'apply_patch', 'multiedit'}:
                    metadata = state.get('metadata') or {}
                    files = metadata.get('files') or []
                    changes = [{'path': file.get('filePath') or file.get('path', ''), 'diff': file.get('diff', '')} for file in files if isinstance(file, dict)]
                    if not changes:
                        changes = [{'path': data.get('filePath') or data.get('file_path') or state.get('title', ''), 'diff': metadata.get('diff', '')}]
                    item.update(type='fileChange', changes=changes)
                result.append({'turnId': turn, 'item': item})
        return result

    def history(self):
        return self.entries(self.http('GET', '/session/' + self.thread + '/message', limit=50))

    def complete(self, status):
        if self.turn:
            self.notify('turn/completed', {'turn': {'id': self.turn, 'status': status}})
        self.turn, self.message_id = None, None
        self.pending.clear()

    def monitor(self):
        failures, saw_busy = 0, False
        while not self.closed.wait(.35):
            try:
                if self.process.poll() is not None:
                    self.notify('bibimer/notice', {'code': 'error_agent_transport'})
                    os._exit(1)
                with self.lock:
                    if not self.turn:
                        saw_busy = False
                        continue
                    turn, key = self.turn, self.thread
                messages = self.http('GET', '/session/' + key + '/message', limit=50)
                status = self.http('GET', '/session/status').get(key, {}).get('type', 'idle')
                permissions = self.http('GET', '/permission')
                questions = self.http('GET', '/question')
                with self.lock:
                    if self.turn != turn:
                        continue
                    saw_busy = saw_busy or status != 'idle'
                    for entry in self.entries(messages):
                        identity = entry['turnId'] + ':' + entry['item']['id']
                        if self.seen.get(identity) != entry:
                            self.seen[identity] = entry
                            self.notify('item/completed' if entry['item'].get('status') != 'inProgress' else 'item/started', entry)
                    # Bound the adapter's own comparison cache too.
                    if len(self.seen) > 500:
                        self.seen = dict(list(self.seen.items())[-250:])
                    active_requests = set()
                    for kind, requests in [('permission', permissions), ('question', questions)]:
                        for request in requests:
                            if request.get('sessionID') != key:
                                continue
                            identity = request['id']
                            active_requests.add(identity)
                            if identity in self.pending:
                                continue
                            self.pending[identity] = (kind, request)
                            params = {'threadId': key, 'turnId': turn, 'itemId': (request.get('tool') or {}).get('callID', identity)}
                            if kind == 'question':
                                params['questions'] = [dict(q, id=str(i), isOther=q.get('custom', True)) for i, q in enumerate(request['questions'])]
                                method = 'item/tool/requestUserInput'
                            else:
                                params.update(reason=request.get('permission', 'Permission'), cwd=self.cwd,
                                              patterns=request.get('patterns', []), details=request.get('metadata', {}))
                                method = 'item/fileChange/requestApproval' if request.get('permission') in {'edit', 'write'} else 'item/commandExecution/requestApproval'
                            self.emit({'id': identity, 'method': method, 'params': params})
                    for identity in list(self.pending):
                        if identity not in active_requests:
                            del self.pending[identity]
                            self.notify('serverRequest/resolved', {'requestId': identity})
                    answers = [m['info'] for m in messages if m['info'].get('role') == 'assistant' and m['info'].get('parentID') == self.message_id]
                    done = answers and answers[-1].get('time', {}).get('completed')
                    if status == 'idle' and not self.pending and (done or saw_busy):
                        failed = any(answer.get('error') for answer in answers)
                        if failed:
                            self.notify('bibimer/notice', {'code': 'error_agent_turn'})
                        self.complete('failed' if failed else 'completed')
                        saw_busy = False
                failures = 0
            except Exception:
                failures += 1
                if failures >= 5:
                    self.notify('bibimer/notice', {'code': 'error_agent_transport'})
                    # A lost observer must not leave an unreviewable agent running.
                    self.close()
                    os._exit(1)

    def response(self, value):
        with self.lock:
            record = self.pending.get(value.get('id'))
            if not record or not self.turn:
                return
            kind, request = record
            identity = request['id']
            result = value.get('result', {})
            if kind == 'permission':
                self.http('POST', '/permission/' + identity + '/reply', {'reply': 'once' if result.get('decision') == 'accept' else 'reject'})
            elif 'error' in value:
                self.http('POST', '/question/' + identity + '/reject', {})
            else:
                answers = result.get('answers', {})
                self.http('POST', '/question/' + identity + '/reply', {'answers': [answers.get(str(i), {}).get('answers', []) for i in range(len(request['questions']))]})
            self.pending.pop(identity, None)
            self.notify('serverRequest/resolved', {'requestId': identity})

    def call(self, method, params):
        if method == 'initialize':
            return {'userAgent': 'bibimer-opencode'}
        if method == 'model/list':
            # Strip provider configuration/credentials; expose only picker metadata.
            providers = self.http('GET', '/provider')
            connected = set(providers.get('connected', []))
            rows = []
            for provider in providers.get('all', []):
                if provider.get('id') not in connected:
                    continue
                for identity, model in provider.get('models', {}).items():
                    if model.get('status') == 'deprecated':
                        continue
                    variants = model.get('variants') or {}
                    rows.append({'id': provider['id'] + '/' + identity, 'displayName': model.get('name', identity),
                        'description': provider.get('name', provider['id']),
                        'supportedReasoningEfforts': [{'reasoningEffort': name, 'description': ''}
                            for name, value in variants.items() if not value.get('disabled')]})
            offset = int(params.get('cursor') or 0)
            return {'data': rows[offset:offset+100], 'nextCursor': str(offset+100) if len(rows)>offset+100 else None}
        if method == 'thread/list':
            offset = int(params.get('cursor') or '0')
            if not 0 <= offset <= 10000:
                raise RuntimeError('error_import_invalid')
            # `path` identifies OpenCode's session path, not its working directory.
            # Filter the canonical directory locally, including non-git projects.
            rows = self.http('GET', '/session', limit=10000, search=params.get('searchTerm', ''))
            rows = [row for row in rows if str(Path(row.get('directory') or '/').resolve()) == self.cwd and not row.get('time', {}).get('archived')]
            rows = [row for row in rows if params.get('searchTerm', '') in row.get('title', '')]
            rows.sort(key=lambda row: row.get('time', {}).get('updated', 0), reverse=True)
            return {'data': [self.metadata(row) for row in rows[offset:offset+25]], 'nextCursor': str(offset+25) if len(rows)>offset+25 else None}
        if method == 'thread/read':
            source = self.source(params['threadId'])
            metadata = self.metadata(source)
            if self.http('GET', '/session/status').get(source['id'], {}).get('type', 'idle') != 'idle':
                metadata['status'] = {'type': 'active'}
            return {'thread': metadata}
        if method in {'thread/start', 'thread/resume', 'thread/fork'}:
            if self.thread:
                raise RuntimeError('error_session_exists')
            permission = params.get('bibimerOptions', {}).get('permission', 'inherit')
            if permission not in {'inherit', 'ask', 'allow'}:
                raise RuntimeError('error_agent_options')
            policy = {} if permission == 'inherit' else {'permission': [{'permission': '*', 'pattern': '*', 'action': permission}]}
            if method == 'thread/start':
                source = self.http('POST', '/session', policy)
            else:
                source = self.source(params['threadId'])
                if method == 'thread/fork':
                    source = self.http('POST', '/session/' + source['id'] + '/fork', {})
                elif self.http('GET', '/session/status').get(source['id'], {}).get('type', 'idle') != 'idle':
                    raise RuntimeError('error_import_active')
                if policy:
                    source = self.http('PATCH', '/session/' + source['id'], policy)
            self.thread = source['id']
            self.permission_mode = permission
            return {'thread': self.metadata(source)}
        if params.get('threadId') != self.thread or not self.thread:
            raise RuntimeError('error_chat_request')
        if method == 'thread/items/list':
            return {'data': list(reversed(self.history()[-50:]))}
        if method == 'turn/start':
            with self.lock:
                if self.turn:
                    raise RuntimeError('error_chat_busy')
                permission = params.get('bibimerOptions', {}).get('permission', self.permission_mode)
                if permission not in {'inherit', 'ask', 'allow'}:
                    raise RuntimeError('error_agent_options')
                if permission != self.permission_mode:
                    if permission == 'inherit':
                        raise RuntimeError('error_permission_default')
                    self.http('PATCH', '/session/' + self.thread, {'permission': [{'permission': '*', 'pattern': '*', 'action': permission}]})
                    self.permission_mode = permission
                self.turn = str(uuid.uuid4())
                self.message_id = 'msg_' + format(int(time.time()*1000), '012x') + secrets.token_hex(6)
                self.notify('turn/started', {'turn': {'id': self.turn, 'status': 'inProgress'}})
                turn = self.turn
                try:
                    options = params.get('bibimerOptions', {})
                    body = {'messageID': self.message_id, 'parts': [{'type': 'text', 'text': params['input'][0]['text']}]}
                    if options.get('model'):
                        provider, model = options['model'].split('/', 1)
                        body['model'] = {'providerID': provider, 'modelID': model}
                    if options.get('effort'):
                        body['variant'] = options['effort']
                    self.http('POST', '/session/' + self.thread + '/prompt_async', body)
                except urllib.error.HTTPError:
                    self.complete('failed')
                    raise RuntimeError('error_agent_turn') from None
                except Exception:
                    # Delivery may already have happened. Keep the turn busy; no replay.
                    self.notify('bibimer/notice', {'code': 'error_input_uncertain'})
                return {'turn': {'id': turn}}
        if method == 'turn/interrupt':
            with self.lock:
                if params.get('turnId') == self.turn:
                    self.http('POST', '/session/' + self.thread + '/abort', {})
                    self.complete('interrupted')
                return {}
        raise RuntimeError('error_history_unsupported')

    def close(self):
        self.closed.set()
        if self.process.poll() is None:
            self.process.terminate()
            try:
                self.process.wait(timeout=.5)
            except subprocess.TimeoutExpired:
                self.process.kill()
                self.process.wait(timeout=1)


def main():
    adapter = None
    try:
        adapter = Adapter(sys.argv[1])
        signal.signal(signal.SIGTERM, lambda *_: sys.exit(0))
        for line in sys.stdin:
            if len(line) > 131072:
                break
            value = json.loads(line)
            if 'method' not in value:
                adapter.response(value)
            elif 'id' in value:
                try:
                    result = adapter.call(value['method'], value.get('params') or {})
                    adapter.emit({'id': value['id'], 'result': result})
                except Exception as error:
                    code = str(error) if isinstance(error, RuntimeError) and str(error).startswith('error_') else 'error_agent_transport'
                    adapter.emit({'id': value['id'], 'error': {'code': -32601 if code == 'error_history_unsupported' else -32603, 'message': code}})
    finally:
        if adapter:
            adapter.close()


if __name__ == '__main__':
    main()
