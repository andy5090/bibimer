import json
import os
from pathlib import Path
import sys
import time
import uuid
from unittest.mock import patch
from test_chat import ChatFixture
from test_bridge import module


class ProviderTests(ChatFixture):
    def setUp(self):
        super().setUp()
        executable=self.root/'opencode'
        executable.write_text('#!'+sys.executable+'\n'+Path(__file__).with_name('fake_opencode.py').read_text())
        executable.chmod(0o700)
        claude=self.root/'claude'
        claude.write_text('#!'+sys.executable+'\nprint("2.1.283")\n')
        claude.chmod(0o700)
        original=module.shutil.which
        lookup=patch.object(module.shutil,'which',side_effect=lambda name: str(executable) if name=='opencode' else str(claude) if name=='claude' else original(name))
        lookup.start();self.addCleanup(lookup.stop)
        env=patch.dict(os.environ,{'BIBIMER_CLAUDE_SDK_PATH':str(Path(__file__).with_name('fake_claude_sdk.mjs').resolve())})
        env.start();self.addCleanup(env.stop)
        self.register()

    def begin(self, agent, imported=False, mode='fork', options=None):
        data={'agent':agent,'mode':'chat','request_id':str(uuid.uuid4()),'project_id':self.bridge.project['id']}
        if options is not None: data['options']=options
        if imported: data.update(source_thread_id='ses_saved_example' if agent=='opencode' else '11111111-1111-4111-8111-111111111111', import_mode=mode)
        status,result=self.api('POST','/v1/sessions',data)
        self.assertEqual(200,status,result)
        self.session_id=result['session']['id']
        self.until(lambda event:event['session']['ready'])
        return self.bridge.session

    def end(self):
        session=self.bridge.session
        session.stop();session.process.wait(timeout=6)
        self.until(lambda event:event['session']['state']=='exited')

    def test_explicit_native_permissions_on_new_and_imported_sessions(self):
        for agent, modes in [('claude', ['inherit','default','acceptEdits','plan','bypassPermissions']), ('opencode', ['inherit','ask','allow'])]:
            for imported, import_mode in [(False,'fork'), (True,'fork'), (True,'resume')]:
                for mode in modes:
                    with self.subTest(agent=agent, mode=mode, imported=imported, import_mode=import_mode):
                        self.begin(agent, imported, import_mode, {'permission':mode})
                        self.message('controlled options probe')
                        self.until(lambda event:event['session']['turn_state']=='ready')
                        captured=json.loads((self.root/'project'/f'{agent}-options.json').read_text())
                        if agent=='claude':
                            self.assertEqual(None if mode=='inherit' else mode, captured.get('permissionMode'))
                            self.assertEqual(True if mode=='bypassPermissions' else None, captured.get('allowDangerouslySkipPermissions'))
                        elif mode!='inherit':
                            self.assertEqual([{'permission':'*','pattern':'*','action':mode}],captured['body']['permission'])
                            self.assertEqual(os.environ.get('OPENCODE_PERMISSION'),captured['env'])
                        self.end()

    def test_each_provider_catalog_fork_and_original_history_without_model_turn(self):
        for agent in ['opencode','claude']:
            with self.subTest(agent=agent):
                status,data=self.api('POST','/v1/session-history',{'agent':agent,'project_id':self.bridge.project['id']})
                self.assertEqual(200,status,data)
                self.assertEqual(1,len(data['sessions']))
                for mode in ['fork','resume']:
                    session=self.begin(agent,True,mode)
                    event=self.until(lambda event:any(item['kind']=='assistant' for item in event['items']))
                    self.assertFalse(event['requests'])
                    self.assertNotIn('RAW_THINKING',json.dumps(event))
                    self.assertEqual(session.thread_id==session.imported['source_thread_id'],mode=='resume')
                    self.assertFalse((self.root/'project'/f'{agent}-turn-count').exists())
                    self.assertNotIn('Saved '+('OpenCode' if agent=='opencode' else 'Claude')+' prompt',(self.state/'metadata.json').read_text())
                    self.end()

    def test_provider_permission_changes_apply_only_on_next_input(self):
        for agent, modes in [('claude',['bypassPermissions','acceptEdits','inherit']), ('opencode',['allow','ask','allow'])]:
            with self.subTest(agent=agent):
                session = self.begin(agent)
                for mode in modes:
                    status, result = self.api('POST', f'/v1/sessions/{session.id}/options', {'options':{'permission':mode},'request_id':str(uuid.uuid4())})
                    self.assertEqual(200,status,result)
                    self.message('permission transition')
                    self.until(lambda event:event['session']['turn_state']=='ready')
                    captured=json.loads((self.root/'project'/f'{agent}-options.json').read_text())
                    if agent=='claude':
                        self.assertEqual(None if mode=='inherit' else mode,captured.get('permissionMode'))
                    else:
                        self.assertEqual(mode,captured['body']['permission'][-1]['action'])
                if agent=='opencode':
                    status, result = self.api('POST',f'/v1/sessions/{session.id}/options', {'options':{'permission':'inherit'},'request_id':str(uuid.uuid4())})
                    self.assertEqual(400,status)
                    self.assertEqual('error_permission_default',result['code'])
                    self.assertEqual('allow',session.options['permission'])
                self.end()

    def test_each_provider_new_chat_explicit_approvals_multi_answers_interrupt_and_follow_up(self):
        for agent in ['opencode','claude']:
            with self.subTest(agent=agent):
                session=self.begin(agent)
                self.message('approval')
                event=self.until(lambda event:bool(event['requests']))
                self.assertEqual(1,len(event['requests']))
                request=event['requests'][0]
                self.assertFalse((self.root/'project'/f'{agent}-approved').exists())
                data={'prompt_id':request['id'],'decision':'decline','request_id':str(uuid.uuid4())}
                self.assertEqual(200,self.api('POST',f'/v1/sessions/{session.id}/respond',data)[0])
                self.until(lambda event:event['session']['turn_state']=='ready')
                self.assertFalse((self.root/'project'/f'{agent}-approved').exists())
                self.message('approval')
                request=self.until(lambda event:bool(event['requests']))['requests'][0]
                data={'prompt_id':request['id'],'decision':'accept','request_id':str(uuid.uuid4())}
                self.assertEqual(200,self.api('POST',f'/v1/sessions/{session.id}/respond',data)[0])
                self.assertEqual(200,self.api('POST',f'/v1/sessions/{session.id}/respond',data)[0])
                self.until(lambda event:event['session']['turn_state']=='ready')
                self.assertEqual('once',(self.root/'project'/f'{agent}-approved').read_text())
                self.message('question')
                request=self.until(lambda event:bool(event['requests']))['requests'][0]
                self.assertTrue(request['params']['questions'][0]['multiple'])
                data={'prompt_id':request['id'],'answers':{'0':['Unit','UI']},'request_id':str(uuid.uuid4())}
                self.assertEqual(200,self.api('POST',f'/v1/sessions/{session.id}/respond',data)[0])
                self.until(lambda event:event['session']['turn_state']=='ready')
                self.assertEqual('both',(self.root/'project'/f'{agent}-answers').read_text())
                self.message('wait')
                self.until(lambda event:event['session']['turn_state']=='running')
                self.assertEqual(409,self.message('must wait')[0])
                self.api('POST',f'/v1/sessions/{session.id}/interrupt',{})
                self.until(lambda event:event['session']['turn_state']=='ready')
                key=str(uuid.uuid4())
                self.assertEqual(200,self.message('follow up',key)[0])
                self.assertEqual(200,self.message('follow up',key)[0])
                event=self.until(lambda event:event['session']['turn_state']=='ready')
                self.assertTrue(any(item['kind']=='diff' for item in event['items']))
                self.assertEqual('5',(self.root/'project'/f'{agent}-turn-count').read_text())
                self.end()

    def test_provider_checks_and_wrong_project_are_localized(self):
        agents={agent['id']:agent for agent in self.bridge.agents()}
        self.assertIn('chat',agents['opencode']['modes'])
        self.assertIn('chat',agents['claude']['modes'])
        for agent,source in [('opencode','ses_foreign'),('claude','99999999-9999-4999-8999-999999999999')]:
            status,result=self.api('POST','/v1/sessions',{'agent':agent,'mode':'chat','request_id':str(uuid.uuid4()),'source_thread_id':source,'import_mode':'resume'})
            self.assertEqual(400,status)
            self.assertEqual('error_import_project',result['code'])
        with patch.dict(os.environ,{'BIBIMER_CLAUDE_SDK_PATH':str(self.root/'missing.mjs')}):
            self.assertEqual(['terminal'],next(agent for agent in self.bridge.agents() if agent['id']=='claude')['modes'])
            status,result=self.api('POST','/v1/sessions',{'agent':'claude','mode':'chat','request_id':str(uuid.uuid4())})
            self.assertEqual('error_claude_sdk',result['code'])
        (self.root/'claude').write_text('#!'+sys.executable+'\nraise SystemExit(1)\n')
        self.bridge.program_checks.clear()
        with patch.object(module.Path, 'home', return_value=self.root):
            self.assertFalse(next(agent for agent in self.bridge.agents() if agent['id']=='claude')['available'])
            self.assertEqual('error_program_unavailable',self.api('POST','/v1/sessions',{'agent':'claude','mode':'terminal','request_id':str(uuid.uuid4())})[1]['code'])

    def test_claude_repaired_runtime_is_shared_by_health_history_chat_and_terminal(self):
        managed = self.root / '.local/share/bibimer/claude-runtime/claude'
        managed.parent.mkdir(parents=True)
        managed.write_text((self.root / 'claude').read_text())
        managed.chmod(0o700)
        with patch.object(module.Path, 'home', return_value=self.root):
            # A working user installation keeps priority.
            self.assertEqual(str(self.root / 'claude'), self.bridge.agent_executable('claude'))
            (self.root / 'claude').write_text('#!' + sys.executable + '\nraise SystemExit(1)\n')
            self.bridge.program_checks.clear()
            self.assertEqual(str(managed), self.bridge.agent_executable('claude'))
            self.assertTrue(next(row for row in self.bridge.agents() if row['id'] == 'claude')['available'])
            session = self.begin('claude', imported=True)
            self.assertEqual(str(managed), session.process.args[2])
            self.message('follow up')
            self.until(lambda event: event['session']['turn_state'] == 'ready')
            self.end()
            status, result = self.api('POST', '/v1/sessions', {
                'agent': 'claude', 'mode': 'terminal', 'request_id': str(uuid.uuid4())})
            self.assertEqual(200, status, result)
            self.assertEqual(str(managed), self.bridge.session.process.args[-1])
            with patch.dict(os.environ, {'BIBIMER_CLAUDE_EXECUTABLE': str(self.root / 'missing')}):
                self.assertIsNone(self.bridge.agent_executable('claude'))
            with patch.dict(os.environ, {'BIBIMER_CLAUDE_EXECUTABLE': str(managed)}):
                self.assertEqual(str(managed), self.bridge.agent_executable('claude'))
