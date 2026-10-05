import json
import uuid
from pathlib import Path
from test_providers import ProviderFixture


class CommandTests(ProviderFixture):
    def catalog(self, agent, **extra):
        status, result = self.api('POST', '/v1/commands', {'project_id': self.bridge.project['id'], 'agent': agent, **extra})
        self.assertEqual(200, status, result)
        return result['commands']

    def send_command(self, row, text, action='message', **extra):
        return self.api('POST', f'/v1/sessions/{self.session_id}/{action}',
                        {'command_id': row['id'], 'text': text, 'request_id': str(uuid.uuid4()), **extra})

    def test_catalog_and_native_execution(self):
        for agent in ['codex', 'claude', 'opencode']:
            with self.subTest(agent=agent):
                rows = self.catalog(agent)
                self.assertNotIn('PRIVATE_', json.dumps(rows))
                self.assertFalse(any(k.startswith('_') for row in rows for k in row))
                self.assertFalse(any(row['name'] in {'disabled', 'bad name'} for row in rows))
                self.assertIsNone(self.bridge.session) if agent == 'codex' else None
                row = next(row for row in rows if row['name'] == 'review')
                session = self.begin(agent)
                status, result = self.send_command(row, '/review src/main.py')
                self.assertEqual(200, status, result)
                self.until(lambda event: event['session']['turn_state'] == 'ready')
                folder = self.root/'project'
                if agent == 'codex':
                    inputs = json.loads((folder/'codex-inputs.jsonl').read_text().splitlines()[-1])['input']
                    self.assertEqual('$review src/main.py', inputs[0]['text'])
                    self.assertEqual({'type':'skill','name':'review','path':str(folder/'.agents/skills/review/SKILL.md')}, inputs[1])
                elif agent == 'claude':
                    self.assertEqual('/review src/main.py', json.loads((folder/'claude-input.json').read_text())['text'])
                else:
                    capture = json.loads((folder/'opencode-command.json').read_text())
                    self.assertEqual(('review', 'src/main.py'), (capture['command'], capture['arguments']))
                self.end()

    def test_command_identity_is_scoped_and_not_client_controlled(self):
        row = self.catalog('codex')[0]
        self.begin('codex')
        for bad, text in [({**row, 'id':'bad'}, '/review'), (row, '/reviewer'), (row, ' /review')]:
            self.assertEqual(400, self.send_command(bad, text)[0])
        other = self.root/'other'; other.mkdir()
        other_project = self.api('POST','/v1/project',{'path':str(other),'add':True})[1]['project']
        status, rows = self.api('POST','/v1/commands',{'agent':'codex','project_id':other_project['id']})
        self.assertEqual(200,status)
        self.assertEqual(400,self.send_command(rows['commands'][0],'/review')[0])
        # Internal invocation fields from a caller cannot inject arbitrary skill paths.
        status, result = self.message('ordinary input')
        self.assertEqual(200,status,result)
        self.until(lambda event:event['session']['turn_state']=='ready')
        inputs=json.loads((self.root/'project/codex-inputs.jsonl').read_text().splitlines()[-1])['input']
        self.assertEqual([{'type':'text','text':'ordinary input'}],inputs)

    def test_queued_skill_and_steer_preserve_native_input_without_exposing_paths(self):
        row = self.catalog('codex')[0]; session = self.begin('codex')
        self.message('wait'); self.until(lambda event:event['session']['turn_state']=='running')
        status, result = self.api(
            'POST', f'/v1/sessions/{self.session_id}/queue', {'command_id':row['id'],'text':'/review queued','action':'add','request_id':str(uuid.uuid4())})
        self.assertEqual(200,status,result)
        self.assertNotIn('_invocation',json.dumps(result)); self.assertNotIn('SKILL.md',json.dumps(result))
        entry = result['queue'][0]['id']
        self.assertEqual(200,self.api('POST',f'/v1/sessions/{self.session_id}/queue',{'action':'steer','entry_id':entry,'turn_id':session.turn_id,'request_id':str(uuid.uuid4())})[0])
        captured=json.loads((self.root/'project/codex-inputs.jsonl').read_text().splitlines()[-1])
        self.assertEqual('turn/steer',captured['method']); self.assertEqual('skill',captured['input'][1]['type'])
        self.assertEqual([],session.events(0,0)['queue'])
        status, result=self.api('POST',f'/v1/sessions/{self.session_id}/queue',{'command_id':row['id'],'text':'/review fifo','action':'add','request_id':str(uuid.uuid4())})
        self.assertEqual(200,status,result)
        self.api('POST',f'/v1/sessions/{self.session_id}/interrupt',{})
        self.until(lambda event:event['session']['turn_state']=='ready')
        self.api('POST',f'/v1/sessions/{self.session_id}/queue',{'action':'resume','request_id':str(uuid.uuid4())})
        self.until(lambda event:event['session']['turn_state']=='ready' and not event['queue'])
        captured=json.loads((self.root/'project/codex-inputs.jsonl').read_text().splitlines()[-1])
        self.assertEqual('turn/start',captured['method']); self.assertEqual('$review fifo',captured['input'][0]['text'])
        self.assertEqual('skill',captured['input'][1]['type'])

    def test_opencode_command_keeps_approval_channel_available(self):
        row=self.catalog('opencode')[0]; self.begin('opencode',options={'model':'test/coder','effort':'high'})
        self.assertEqual(200,self.send_command(row,'/review approval')[0])
        event=self.until(lambda event:bool(event['requests']))
        request=event['requests'][0]
        status, result=self.api('POST',f'/v1/sessions/{self.session_id}/respond',{'request_id':str(uuid.uuid4()),'prompt_id':request['id'],'decision':'decline'})
        self.assertEqual(200,status,result)
        self.until(lambda event:event['session']['turn_state']=='ready')
        capture=json.loads((self.root/'project/opencode-command.json').read_text())
        self.assertEqual('test/coder',capture['model']); self.assertEqual('high',capture['variant'])
        self.assertFalse((self.root/'project/opencode-approved').exists())


    def test_claude_builtin_command_result_is_rendered(self):
        row=next(row for row in self.catalog('claude') if row['name']=='context')
        self.begin('claude')
        self.assertEqual(200,self.send_command(row,'/context')[0])
        event=self.until(lambda event:event['session']['turn_state']=='ready')
        self.assertIn('Context: controlled session',json.dumps(event['items']))
