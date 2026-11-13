"""Queued edits use the same pause/save/resume contract for native adapters."""
import uuid
from test_providers import ProviderFixture

class QueueEditProviderTests(ProviderFixture):
    def test_claude_and_opencode_only_receive_revised_queue_after_explicit_resume(self):
        for agent in ['claude','opencode']:
            with self.subTest(agent=agent):
                session=self.begin(agent)
                self.message('approval');prompt=self.until(lambda e:bool(e['requests']))['requests'][0]['id']
                path=f'/v1/sessions/{session.id}/queue'
                first=str(uuid.uuid4())
                self.assertEqual(200,self.api('POST',path,{'action':'add','text':'original queued text','request_id':first})[0])
                self.api('POST',path,{'action':'add','text':'second queued text','request_id':str(uuid.uuid4())})
                status,result=self.api('POST',path,{'action':'edit_begin','entry_id':first,'request_id':str(uuid.uuid4())})
                self.assertEqual(200,status);self.assertTrue(result['session']['queue_paused'])
                status,result=self.api('POST',path,{'action':'edit','entry_id':first,'expected_revision':0,'text':'revised queued text','request_id':str(uuid.uuid4())})
                self.assertEqual(200,status);self.assertEqual(first,result['queue'][0]['id'])
                self.api('POST',f'/v1/sessions/{session.id}/respond',{'prompt_id':prompt,'decision':'decline','request_id':str(uuid.uuid4())})
                event=self.until(lambda e:e['session']['turn_state']=='ready')
                self.assertTrue(event['session']['queue_paused']);self.assertEqual(2,len(event['queue']))
                self.assertEqual('1',(self.root/'project'/f'{agent}-turn-count').read_text())
                self.api('POST',path,{'action':'resume','request_id':str(uuid.uuid4())})
                event=self.until(lambda e:not e['queue'] and e['session']['turn_state']=='ready')
                self.assertTrue(any(row.get('text')=='revised queued text\n\nsecond queued text' for row in event['items']),event['items'])
                self.assertEqual('2',(self.root/'project'/f'{agent}-turn-count').read_text());self.end()
