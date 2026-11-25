"""Naming uses owned CLI fixtures; no real account, model or source-thread input."""
import importlib.util
import json
import time
import uuid
import os
from pathlib import Path
from unittest.mock import patch

from test_providers import ProviderFixture
from test_bridge import module


class TitleSuggestionTests(ProviderFixture):
    def call(self, key, action='start', **body):
        return self.api('POST',f'/v1/sessions/{key}/title-suggestion',{'action':action,**body})

    def done(self, key, job):
        deadline=time.monotonic()+8
        while time.monotonic()<deadline:
            status,result=self.call(key,'poll',id=job['id'])
            self.assertEqual(200,status,result)
            if result['job']['status']!='running': return result['job']
            time.sleep(.02)
        self.fail('naming fixture timed out')

    def test_codex_and_claude_proposals_do_not_rename_or_send_to_source_and_requests_are_idempotent(self):
        for agent in ('codex','claude'):
            with self.subTest(agent=agent):
                source=self.begin(agent)
                self.message('Rename the workspace controls')
                self.until(lambda event:event['session']['turn_state']=='ready' and any(row['kind']=='turn' for row in event['items']))
                before=source.events(0,0)['items']
                native=source.thread_id
                request=str(uuid.uuid4())
                status,result=self.call(source.id,request_id=request,language='ko')
                self.assertEqual(200,status,result)
                job=self.done(source.id,result['job'])
                self.assertEqual('succeeded',job['status'],job)
                self.assertEqual('Suggested workspace title',job['title'])
                self.assertEqual(job,self.call(source.id,request_id=request,language='ko')[1]['job'])
                self.assertEqual(before,source.events(0,0)['items'])
                self.assertEqual(native,source.thread_id)
                self.assertFalse(self.bridge.snapshot_by_id(source.id).get('title'))
                self.assertNotIn('Suggested workspace title',(self.state/'metadata.json').read_text())
                self.end()

    def test_empty_conversation_busy_source_and_shell_are_rejected(self):
        source=self.begin('codex')
        status,result=self.call(source.id,request_id=str(uuid.uuid4()))
        self.assertEqual(200,status)
        self.assertEqual('error_handoff_empty',self.done(source.id,result['job'])['error'])
        self.message('approval');self.until(lambda event:bool(event['requests']))
        self.assertEqual(409,self.call(source.id,request_id=str(uuid.uuid4()))[0])
        self.assertEqual(401,self.api('POST',f'/v1/sessions/{source.id}/title-suggestion',{'action':'start'},auth=False)[0])
        status,result=self.api('POST','/v1/sessions',{'agent':'shell','mode':'terminal','new_session':True,'request_id':str(uuid.uuid4())})
        self.assertEqual(200,status,result)
        self.assertEqual(400,self.call(result['session']['id'],request_id=str(uuid.uuid4()))[0])

    def test_cancel_before_start_prevents_model_execution_and_invalid_output_does_not_rename(self):
        source=self.begin('codex')
        request=str(uuid.uuid4())
        self.assertEqual('cancelled',self.call(source.id,'cancel',id=request)[1]['job']['status'])
        with patch.object(module.TitleClient,'generate',side_effect=AssertionError('cancelled job must not run')):
            self.assertEqual('cancelled',self.call(source.id,request_id=request)[1]['job']['status'])
        self.message('Completed task')
        self.until(lambda event:event['session']['turn_state']=='ready' and any(row['kind']=='turn' for row in event['items']))
        self.bridge.manage_session(source.id,{'action':'rename','title':'Manual name'})
        with patch.object(module.TitleClient,'generate',return_value='bad\nname'):
            result=self.call(source.id,request_id=str(uuid.uuid4()))[1]
            self.assertEqual('failed',self.done(source.id,result['job'])['status'])
        self.assertEqual('Manual name',self.bridge.snapshot_by_id(source.id)['title'])

    def test_saved_session_after_bridge_restart_uses_only_conversation_text(self):
        with patch.dict(os.environ,BIBIMER_TEST_CODEX_STORE=str(self.root/'native-title-history.json')):
            source=self.begin('codex')
            self.message('Saved title subject')
            self.until(lambda event:event['session']['turn_state']=='ready' and any(row['kind']=='turn' for row in event['items']))
            self.end()
            self.bridge=module.Bridge(self.state);self.server.bridge=self.bridge
            captured=[]
            def generate(client,agent,prompt,options):
                self.assertEqual('test-codex',options['model'])
                self.assertEqual('medium',options['effort'])
                captured.append(prompt);return 'Saved task title'
            with patch.object(module.TitleClient,'generate',generate):
                result=self.call(source.id,request_id=str(uuid.uuid4()))[1]
                job=self.done(source.id,result['job'])
                self.assertEqual('succeeded',job['status'],job)
            self.assertIn('Saved title subject',captured[0])
            self.assertNotIn('commandExecution',captured[0])
            self.assertEqual(0,self.bridge.active_count())

    def test_opencode_naming_denies_tools_uses_selected_model_and_removes_auxiliary_session(self):
        spec=importlib.util.spec_from_file_location('title_opencode',Path(module.__file__).with_name('provider_opencode.py'))
        adapter_module=importlib.util.module_from_spec(spec);spec.loader.exec_module(adapter_module)
        adapter=adapter_module.Adapter.__new__(adapter_module.Adapter);adapter.thread=None
        calls=[]
        def http(method,route,body=None,**kwargs):
            calls.append((method,route,body))
            if route=='/session':return {'id':'ses_naming'}
            if method=='POST':return {'parts':[{'type':'text','text':'Proposed name'}]}
        adapter.http=http
        self.assertEqual({'title':'Proposed name'},adapter.call('bibimer/title',{'prompt':'Only a name','options':{'model':'test/coder'}}))
        self.assertEqual('deny',calls[0][2]['permission'][0]['action'])
        self.assertEqual({'*':False},calls[1][2]['tools'])
        self.assertEqual({'providerID':'test','modelID':'coder'},calls[1][2]['model'])
        self.assertEqual(('DELETE','/session/ses_naming',None),calls[-1])
