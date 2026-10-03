import json
import os
from pathlib import Path
import sys
import threading
import time
import uuid
from unittest.mock import patch

from test_chat import ChatFixture
from test_bridge import module


class ModelTests(ChatFixture):
    def setUp(self):
        super().setUp()
        opencode = self.root / 'opencode'
        opencode.write_text('#!' + sys.executable + '\n' + Path(__file__).with_name('fake_opencode.py').read_text())
        opencode.chmod(0o700)
        claude = self.root / 'claude'
        claude.write_text('#!' + sys.executable + '\nprint("2.1.283")\n')
        claude.chmod(0o700)
        original = module.shutil.which
        lookup = patch.object(module.shutil, 'which', side_effect=lambda name: str(opencode) if name == 'opencode' else str(claude) if name == 'claude' else original(name))
        lookup.start(); self.addCleanup(lookup.stop)
        env = patch.dict(os.environ, {'BIBIMER_CLAUDE_SDK_PATH': str(Path(__file__).with_name('fake_claude_sdk.mjs').resolve())})
        env.start(); self.addCleanup(env.stop)
        self.register()

    def catalog(self, agent):
        status, result = self.api('POST', '/v1/models', {'project_id': self.bridge.project['id'], 'agent': agent})
        self.assertEqual(200, status, result)
        return result['models']

    def begin(self, agent='codex', model='test-codex', effort='high'):
        status, result = self.api('POST', '/v1/sessions', {'project_id': self.bridge.project['id'], 'agent': agent,
            'mode': 'chat', 'options': {'permission': 'inherit', 'model': model, 'effort': effort}, 'request_id': str(uuid.uuid4())})
        self.assertEqual(200, status, result)
        self.session_id = result['session']['id']
        self.until(lambda event: event['session']['ready'])
        return self.bridge.get_session(self.session_id)

    def configure(self, **options):
        return self.api('POST', f'/v1/sessions/{self.session_id}/options', {'options': options, 'request_id': str(uuid.uuid4())})

    def test_catalog_is_native_scoped_bounded_and_has_no_turns_or_secrets(self):
        for agent, expected in [('codex', ['test-codex', 'test-small']), ('claude', ['sonnet', 'opus', 'haiku']), ('opencode', ['test/coder', 'test/simple'])]:
            models = self.catalog(agent)
            self.assertEqual(expected, [row['id'] for row in models])
            self.assertNotIn('CATALOG_SECRET', json.dumps(models))
            self.assertNotIn('private', json.dumps(models))
        for file in ['turn-count', 'claude-turn-count', 'opencode-turn-count']:
            self.assertFalse((self.root / 'project' / file).exists())
        self.assertEqual(0, self.bridge.active_count())
        self.assertEqual(401, self.api('POST', '/v1/models', {}, auth=False)[0])
        self.assertEqual(404, self.api('POST', '/v1/models', {'project_id': 'missing', 'agent': 'codex'})[0])
        self.assertEqual(400, self.api('POST', '/v1/models', {'project_id': self.bridge.project['id'], 'agent': 'shell'})[0])

    def test_invalid_model_effort_and_types_never_start_a_session(self):
        for options in [{'model':'unknown'}, {'model':'test-small','effort':'high'}, {'effort':'high'}, {'model':False}, {'effort':None}, {'model':'bad\nmodel'}, {'model':{},'effort':[]}]:
            status, _ = self.api('POST','/v1/sessions',{'agent':'codex','mode':'chat','options':options,'request_id':str(uuid.uuid4())})
            self.assertEqual(400,status,options)
        self.assertFalse(self.bridge.sessions)

    def test_launch_shares_concurrent_catalog_without_blocking_health(self):
        entered, release = threading.Event(), threading.Event()
        original = module.HistoryClient.call
        def delayed(client, method, params):
            if method == 'model/list':
                entered.set(); release.wait(timeout=3)
            return original(client, method, params)
        results = {}
        project = self.bridge.project['id']
        def listing(): results['models'] = self.api('POST','/v1/models',{'project_id':project,'agent':'codex'})
        def launch(): results['launch'] = self.api('POST','/v1/sessions',{'project_id':project,'agent':'codex','mode':'chat',
            'options':{'model':'test-codex','effort':'high'},'request_id':str(uuid.uuid4())})
        with patch.object(module.HistoryClient, 'call', delayed):
            first=threading.Thread(target=listing); first.start()
            self.assertTrue(entered.wait(timeout=3))
            second=threading.Thread(target=launch); second.start()
            try:
                time.sleep(.1)
                self.assertEqual(200,self.api('GET','/v1/health')[0])
            finally:
                release.set(); first.join(timeout=5); second.join(timeout=5)
        self.assertEqual(200,results['models'][0],results)
        self.assertEqual(200,results['launch'][0],results)

    def test_codex_next_turn_model_effort_reset_and_pending_approval(self):
        session = self.begin()
        self.message('approval')
        pending = self.until(lambda event: event['requests'])['requests'][0]['id']
        self.assertEqual(200, self.configure(model='test-small', effort='low')[0])
        self.assertEqual(pending, self.until(lambda event: event['requests'])['requests'][0]['id'])
        self.assertEqual(400, self.configure(effort='high')[0])
        capture = self.root / 'project/codex-options.jsonl'
        before = [json.loads(line) for line in capture.read_text().splitlines()]
        self.assertEqual(('test-codex','high'), (before[-1]['model'],before[-1]['effort']))
        session.interrupt(); self.until(lambda event:event['session']['turn_state']=='ready')
        self.message('next model'); self.until(lambda event:event['session']['turn_state']=='ready')
        chosen = json.loads(capture.read_text().splitlines()[-1])
        self.assertEqual(('test-small','low'), (chosen['model'],chosen['effort']))
        self.assertEqual(200,self.configure(model='',effort='')[0])
        self.message('restored defaults'); self.until(lambda event:event['session']['turn_state']=='ready')
        restored=json.loads(capture.read_text().splitlines()[-1])
        self.assertEqual(('test-codex','medium'),(restored['model'],restored['effort']))

    def test_claude_and_opencode_forward_native_choices_each_turn(self):
        for agent, model, effort in [('claude','opus','max'),('opencode','test/coder','high')]:
            with self.subTest(agent=agent):
                self.begin(agent,model,effort)
                self.message('selected model'); self.until(lambda event:event['session']['turn_state']=='ready')
                file = 'claude-options.json' if agent=='claude' else 'opencode-model.json'
                value=json.loads((self.root/'project'/file).read_text())
                if agent=='claude': self.assertEqual((model,effort),(value['model'],value['effort']))
                else: self.assertEqual({'model':{'providerID':'test','modelID':'coder'},'variant':'high'},value)
                self.assertEqual(200,self.configure(effort='low')[0])
                self.message('lower effort'); self.until(lambda event:event['session']['turn_state']=='ready')
                value=json.loads((self.root/'project'/file).read_text())
                self.assertEqual('low',value['effort' if agent=='claude' else 'variant'])

    def test_agent_switch_preserves_process_approvals_queue_and_restart_metadata(self):
        codex=self.begin()
        self.message('approval'); pending=self.until(lambda event:event['requests'])['requests'][0]['id']
        self.assertEqual(200,self.api('POST',f'/v1/sessions/{codex.id}/queue',{'action':'add','text':'SCOPED_QUEUE_TEXT','request_id':str(uuid.uuid4())})[0])
        project=self.bridge.project['id']
        self.assertEqual(200,self.api('POST','/v1/project-agent',{'project_id':project,'agent':'claude'})[0])
        self.assertIsNone(self.bridge.session)
        claude=self.begin('claude','sonnet','medium')
        self.assertEqual(2,self.bridge.active_count())
        for agent, owned in [('codex',codex),('claude',claude),('codex',codex)]:
            status,result=self.api('POST','/v1/project-agent',{'project_id':project,'agent':agent})
            self.assertEqual(200,status,result); self.assertEqual(owned.id,result['session']['id'])
            self.assertIsNone(owned.process.poll())
        self.session_id=codex.id
        event=self.until(lambda event:event['requests'])
        self.assertEqual(pending,event['requests'][0]['id']); self.assertEqual(1,len(event['queue']))
        claude.stop(); claude.process.wait(timeout=5)
        self.assertIsNone(codex.process.poll())
        self.assertEqual(409,self.api('POST','/v1/shutdown',{})[0])
        self.bridge.persist()
        metadata=(self.state/'metadata.json').read_text()
        self.assertNotIn('SCOPED_QUEUE_TEXT',metadata)
        restored=module.Bridge(self.state)
        self.assertEqual(2,len(restored.snapshots(project)))
        self.assertEqual(codex.id,restored.snapshot_for(project)['id'])
        self.assertEqual('lost',restored.snapshot_for(project,'codex')['state'])
        self.assertEqual(0,restored.snapshot_for(project,'codex')['queued_count'])
        for row in restored.snapshots(project): self.assertEqual(row['id'],restored.session_events(row['id'],0,0)['session']['id'])

    def test_cli_arguments_preserve_model_and_reasoning_as_single_values(self):
        for agent, model in [('codex','test-codex'),('claude','opus'),('opencode','test/coder')]:
            options=module.agent_options(agent,{'model':model,'effort':'high' if agent!='opencode' else ''})
            argv=module.terminal_command(['/controlled/'+agent],agent,options)
            self.assertEqual(model,argv[argv.index('--model')+1])
            if agent=='codex': self.assertIn('model_reasoning_effort="high"',argv)
            elif agent=='claude': self.assertEqual('high',argv[argv.index('--effort')+1])
        with self.assertRaises(module.Problem):
            module.terminal_command(['/controlled/opencode'],'opencode',{'permission':'inherit','model':'test/coder','effort':'high'})
