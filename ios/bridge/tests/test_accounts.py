"""iOS account routes with fictional CLIs; no guest Node, model or real account."""
import ast
import base64
import http.client
import json
from pathlib import Path
import sys
import tempfile
import threading
import time
import unittest
from unittest.mock import patch
import uuid

import test_ios_bridge as fixtures


class AccountTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.base = fixtures.entry.adapt(fixtures.entry.load_bridge(fixtures.ROOT / 'bridge/bibimer_bridge.py'))
        self.bridge = self.base.Bridge(self.root / 'state')
        self.server = self.base.Server(('127.0.0.1', 0), self.bridge)
        self.worker = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.worker.start()
        self.addCleanup(self.close)
        self.bin = self.root / 'bin'
        self.bin.mkdir()
        sources = ast.parse((fixtures.ROOT / 'bridge/tests/test_agent_connections.py').read_text())
        for name in ('CODEX', 'OPENCODE'):
            node = next(row for row in sources.body if isinstance(row, ast.Assign) and row.targets[0].id == name)
            self.executable(name.lower(), ast.literal_eval(node.value))
        self.executable('claude', '''import json,os,sys
if sys.argv[1:]==['auth','status']:
 print(json.dumps({'loggedIn':False,'authMethod':'none','email':'PRIVATE_EMAIL','token':'PRIVATE_TOKEN'}));sys.exit(1)
assert sys.argv[1:]==['/login'] and os.isatty(0)
print('AUTH_READY',flush=True)
assert input()=='fictional-code'
print('AUTH_DONE',flush=True)
''')
        lookup = patch.object(self.bridge, 'agent_executable', side_effect=lambda agent: str(self.bin / agent))
        lookup.start(); self.addCleanup(lookup.stop)

    def executable(self, name, source):
        target = self.bin / name
        target.write_text('#!' + sys.executable + '\n' + source)
        target.chmod(0o700)
        return target

    def close(self):
        self.server.shutdown(); self.server.server_close()
        self.bridge.agent_connections.close()
        for session in self.bridge.sessions.values():
            session.stop(); session.process.wait(timeout=5)
        self.bridge.linked_files.close(); self.bridge.github.close(); self.bridge.worktree_creation.close()

    def api(self, agent='codex', action='status', token=True, origin=None, **body):
        connection = http.client.HTTPConnection('127.0.0.1', self.server.server_port, timeout=20)
        headers = {'Content-Type': 'application/json'}
        if token: headers['Authorization'] = 'Bearer ' + self.bridge.token
        if origin: headers['Origin'] = origin
        try:
            connection.request('POST', '/v1/agent-connections', json.dumps(dict(agent=agent, action=action, **body)), headers)
            response = connection.getresponse()
            return response.status, json.loads(response.read())
        finally:
            connection.close()

    def test_health_enables_accounts_but_keeps_android_updater_disabled(self):
        with patch.object(self.base.shutil, 'which', return_value=None):
            features = self.bridge.health()['features']
        self.assertIn('agent_connections', features)
        self.assertIn('agent_login_terminal', features)
        self.assertIn('agent_login_ui', features)
        self.assertNotIn('agent_updates', features)
        self.assertNotIn('claude_steer', features)
        self.assertFalse(self.bridge.sessions)
        with self.assertRaises(self.base.Problem) as blocked:
            self.bridge.agent_updates.handle({'agent':'claude','action':'start'})
        self.assertEqual('error_agent_update_unavailable', blocked.exception.code)

    def test_route_authentication_and_origin_are_still_required(self):
        self.assertEqual(401, self.api(token=False)[0])
        self.assertEqual(403, self.api(origin='https://untrusted.invalid')[0])
        self.assertEqual(400, self.api(agent='shell')[0])
        self.assertFalse(self.bridge.sessions)

    def test_native_status_is_sanitized_and_claude_does_not_run_help_or_login(self):
        code, result = self.api('claude')
        self.assertEqual(200, code, result)
        self.assertEqual('signed_out', result['state'])
        self.assertEqual('oauth', result['login_methods'][0]['type'])
        self.assertNotIn('PRIVATE', json.dumps(result))
        code, result = self.api()
        self.assertEqual(200, code, result)
        self.assertEqual(['oauth', 'api'], [row['type'] for row in result['login_methods']])
        self.assertNotIn('PRIVATE', json.dumps(result))
        self.assertIsNone(self.bridge.active_project_id)
        self.assertFalse(self.bridge.sessions)

    def test_codex_and_opencode_keys_use_native_stores_without_sessions_or_metadata(self):
        for agent, options in [('codex', {'method':'apiKey'}), ('opencode', {'provider':'test','method':'0'})]:
            code, result = self.api(agent, 'start', request_id=str(uuid.uuid4()), key='FICTIONAL_PRIVATE_KEY', **options)
            self.assertEqual(200, code, result)
            self.assertEqual('saved', result['job']['status'])
            self.assertNotIn('FICTIONAL_PRIVATE_KEY', json.dumps(result))
            self.assertEqual('FICTIONAL_PRIVATE_KEY', (self.bin / 'native-key').read_text())
            for path in self.bridge.state.rglob('*.json'):
                self.assertNotIn('FICTIONAL_PRIVATE_KEY', path.read_text())
        self.assertFalse(self.bridge.sessions)
        code, result = self.api('opencode')
        self.assertEqual(200, code, result)
        self.assertEqual(['test'], [row['id'] for row in result['providers']])
        self.assertFalse(result['providers'][0]['methods'][2]['supported'])

    def test_codex_ui_login_waits_for_native_completion_without_terminal(self):
        code, result = self.api('codex','start',method='chatgpt',request_id=str(uuid.uuid4()))
        self.assertEqual(200,code,result)
        job=result['job'];self.assertEqual('pending',job['status']);self.assertTrue(job['url'].startswith('https://'))
        code, result = self.api('codex','poll',id=job['id']);self.assertEqual('pending',result['job']['status'])
        (self.bin/'complete').touch()
        code, result = self.api('codex','poll',id=job['id']);self.assertEqual('saved',result['job']['status'])
        self.assertNotIn('url',result['job']);self.assertNotIn('PRIVATE',json.dumps(result));self.assertFalse(self.bridge.sessions)

    def test_claude_ui_login_accepts_code_and_confirms_cli_account_status(self):
        self.executable('claude', """import json,pathlib,sys
root=pathlib.Path(__file__).parent
if sys.argv[1:]==['auth','status']:
 print(json.dumps({'loggedIn':(root/'signed-in').exists(),'token':'PRIVATE_TOKEN'}));sys.exit()
assert sys.argv[1:]==['auth','login']
print('https://claude.ai/oauth/authorize?state=fictional-state',flush=True)
print('Paste code here if prompted > ',flush=True)
assert input()=='fictional-code#fictional-state'
(root/'signed-in').touch()
""")
        code, result=self.api('claude','start',method='claudeai',request_id=str(uuid.uuid4()));self.assertEqual(200,code,result)
        job=result['job']
        def poll():
            code,result=self.api('claude','poll',id=job['id']);self.assertEqual(200,code,result);return result['job']
        fixtures.wait_for(lambda:poll().get('code_required'),timeout=15)
        code,result=self.api('claude','status');self.assertEqual(job['id'],result['job']['id'])
        code,result=self.api('claude','code',id=job['id'],code='fictional-code#fictional-state');self.assertEqual(200,code,result)
        final=fixtures.wait_for(lambda:(row if (row:=poll())['status']!='pending' else None),timeout=15)
        self.assertEqual('saved',final['status']);self.assertNotIn('url',final)
        self.assertNotIn('PRIVATE',json.dumps(final));self.assertNotIn('fictional-code',json.dumps(final))
        code,result=self.api('claude','status');self.assertEqual('configured',result['state'])
        self.assertFalse(self.bridge.sessions);self.assertIsNone(self.bridge.active_project_id)

    def test_ui_login_cancel_and_expiry_remove_url_and_owned_process(self):
        self.executable('claude', "import time\nprint('https://claude.ai/oauth/authorize?state=fictional',flush=True)\ntime.sleep(60)\n")
        for action in ('cancel','expire'):
            code,result=self.api('claude','start',method='claudeai',request_id=str(uuid.uuid4()));self.assertEqual(200,code,result)
            job=result['job'];internal=self.bridge.agent_connections.jobs['claude'];child=internal['client'].process
            fixtures.wait_for(lambda:internal['client'].url,timeout=15)
            if action=='expire':internal['expires_at']=0
            code,result=self.api('claude','cancel' if action=='cancel' else 'poll',id=job['id'])
            self.assertEqual(200,code,result);self.assertEqual('cancelled' if action=='cancel' else 'expired',result['job']['status'])
            self.assertNotIn('url',result['job']);self.assertIsNotNone(child.poll());self.assertFalse(self.bridge.sessions)

    def test_claude_terminal_before_first_project_uses_pty_login_and_retry_reattaches(self):
        key = str(uuid.uuid4())
        with patch.object(fixtures.entry.Path, 'home', return_value=self.root):
            code, result = self.api('claude','terminal',request_id=key)
            self.assertEqual(200, code, result)
            session = self.bridge.get_session(result['session']['id'])
            code, repeated = self.api('claude','terminal',request_id=key)
        self.assertEqual(200, code, repeated)
        self.assertEqual(session.id, repeated['session']['id'])
        self.assertEqual('claude', result['session']['authentication_agent'])
        self.assertEqual('shell', result['session']['agent'])
        fixtures.wait_for(lambda: b'AUTH_READY' in base64.b64decode(self.bridge.session_events(session.id,0,0)['data']), timeout=15)
        session.write(b'fictional-code\r', str(uuid.uuid4()))
        fixtures.wait_for(lambda: session.state == 'exited', timeout=15)
        self.assertEqual(0, session.exit_code)
        self.assertEqual(1, len(self.bridge.sessions))

    def test_codex_terminal_uses_device_auth_and_preserves_existing_session(self):
        self.executable('codex', "import os,sys,time\nassert sys.argv[1:]==['login','--device-auth'] and os.isatty(0)\nprint('DEVICE_AUTH_READY',flush=True)\ntime.sleep(30)\n")
        project = self.bridge.register({'path':str(self.root),'create':False})
        existing = self.bridge.launch({'agent':'shell','mode':'terminal','request_id':str(uuid.uuid4()),'project_id':project['id']})
        code, result = self.api('codex','terminal',request_id=str(uuid.uuid4()),project_id=project['id'])
        self.assertEqual(200, code, result)
        session = self.bridge.get_session(result['session']['id'])
        fixtures.wait_for(lambda: b'DEVICE_AUTH_READY' in base64.b64decode(self.bridge.session_events(session.id,0,0)['data']), timeout=15)
        self.assertEqual('running', self.bridge.get_session(existing['id']).state)
        self.assertEqual(2, len(self.bridge.sessions))

    def test_launch_preserves_new_shared_restore_and_authentication_arguments(self):
        shared = self.base.Bridge.__mro__[2]
        with patch.object(shared, 'launch', return_value={'forwarded':True}) as launch:
            result = self.bridge.launch({'agent':'shell'}, select=False, restore_id='same-session')
        self.assertEqual({'forwarded':True}, result)
        self.assertEqual(({'agent':'shell'}, None, False, 'same-session', None), launch.call_args.args)

    def test_command_has_bounded_ios_cold_start_budget(self):
        shared = self.base.AgentConnections.__mro__[1]
        with patch.object(shared,'command',return_value=(0,b'1.2.3')) as command:
            self.bridge.agent_connections.command(['/fictional/cli','--version'],timeout=8)
        self.assertEqual(125, command.call_args.kwargs['timeout'])

    def test_account_rpc_cannot_create_threads_or_send_model_requests(self):
        with self.base.AccountClient(str(self.bin / 'codex'), str(self.root)) as client:
            for method in ('thread/start', 'turn/start', 'model/list'):
                with self.assertRaises(self.base.Problem) as blocked:
                    client.call(method, {})
                self.assertEqual('error_import_invalid', blocked.exception.code)

    def test_account_poll_gets_fresh_budget_after_browser_wait(self):
        with self.base.AccountClient(str(self.bin / 'codex'), str(self.root)) as client:
            client.metadata_deadline = 0
            self.assertIn('account', client.call('account/read', {'refreshToken':False}))
            self.assertGreater(client.metadata_deadline, time.monotonic())

    def test_opencode_accounts_use_the_prepared_ios_server_adapter(self):
        provider = fixtures.entry.prepare_opencode_provider(self.root, fixtures.ROOT / 'bridge/provider_opencode.py')
        adapted = fixtures.entry.adapt(fixtures.entry.load_bridge(fixtures.ROOT / 'bridge/bibimer_bridge.py'), opencode_provider=provider)
        connections = adapted.AgentConnections(self.bridge)
        client = connections.client(str(self.bin / 'opencode'), str(self.root))
        try:
            self.assertEqual('bibimer_ios_account_opencode', type(client).__module__)
            self.assertTrue(client.account)
            self.assertEqual(str(self.root.resolve()), client.cwd)
            self.assertEqual(['test'], [row['id'] for row in connections.catalog(client)])
        finally:
            client.close()


if __name__ == '__main__':
    unittest.main()
