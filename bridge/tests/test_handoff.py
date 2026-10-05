import itertools
import subprocess
import uuid
from test_providers import ProviderFixture
from test_bridge import module


class HandoffTests(ProviderFixture):
    def preview(self, source):
        return self.api('POST', f'/v1/sessions/{source.id}/handoff', {'action':'preview'})

    def start(self, source, agent, preview, **extra):
        data={'action':'start','agent':agent,'context':preview['context'],'instruction':'Continue the controlled task',
              'revision':preview['revision'],'request_id':str(uuid.uuid4()), **extra}
        return data, self.api('POST',f'/v1/sessions/{source.id}/handoff',data)

    def test_all_provider_directions_keep_source_and_native_context(self):
        for source_agent, target_agent in itertools.permutations(['codex','claude','opencode'],2):
            with self.subTest(source=source_agent,target=target_agent):
                source=self.begin(source_agent)
                self.message('Source task: retain this context')
                self.until(lambda e:e['session']['turn_state']=='ready')
                status,preview=self.preview(source);self.assertEqual(200,status,preview)
                self.assertIn('Source task: retain this context',preview['context'])
                self.assertNotIn('controlled output',preview['context'])
                self.assertNotIn('RAW_THINKING',preview['context'])
                options={'permission':'read-only','fast':False} if target_agent=='codex' else {'permission':'plan'} if target_agent=='claude' else {'permission':'ask'}
                data,(status,result)=self.start(source,target_agent,preview,options=options)
                self.assertEqual(200,status,result)
                target=result['session'];self.session_id=target['id']
                event=self.until(lambda e:e['session']['turn_state']=='ready' and not e['queue'])
                self.assertNotEqual(source.id,target['id'])
                self.assertEqual(source.project,event['session']['project'])
                self.assertIsNone(source.process.poll());self.assertEqual('ready',source.turn_state)
                self.assertEqual(options['permission'],event['session']['options']['permission'])
                self.assertEqual(source.id,event['session']['handoff']['source_session_id'])
                user='\n'.join(i.get('text','') for i in event['items'] if i['kind']=='user')
                self.assertIn('Source task: retain this context',user)
                self.assertTrue(user.startswith('Continue the controlled task\n\n'))
                self.assertEqual('Continue the controlled task',event['session']['display_title'])
                metadata=(self.state/'metadata.json').read_text()
                self.assertNotIn('Source task: retain this context',metadata)
                self.assertNotIn('Continue the controlled task',metadata)
                # Retry the exact request after a successful turn must reuse the session.
                before=len(self.bridge.sessions)
                status,retry=self.api('POST',f'/v1/sessions/{source.id}/handoff',data)
                self.assertEqual(200,status,retry);self.assertEqual(target['id'],retry['session']['id'])
                self.assertEqual(before,len(self.bridge.sessions))
                self.end()
                source.stop(); source.process.wait(timeout=6)
                self.session_id=source.id
                self.until(lambda e:e['session']['state']=='exited')

    def test_busy_approval_queue_and_stale_preview_are_rejected(self):
        source=self.begin('codex')
        self.assertEqual('error_handoff_empty',self.preview(source)[1]['code'])
        self.message('seed');self.until(lambda e:e['session']['turn_state']=='ready')
        _,preview=self.preview(source)
        self.message('approval');self.until(lambda e:bool(e['requests']))
        self.assertEqual('error_handoff_busy',self.preview(source)[1]['code'])
        _,(status,error)=self.start(source,'claude',preview)
        self.assertEqual(409,status);self.assertEqual('error_handoff_busy',error['code'])
        self.api('POST',f'/v1/sessions/{source.id}/interrupt',{})
        self.until(lambda e:e['session']['turn_state']=='ready')
        _,(status,error)=self.start(source,'claude',preview)
        self.assertEqual(409,status);self.assertEqual('error_handoff_changed',error['code'])
        self.message('wait');self.until(lambda e:e['session']['turn_state']=='running')
        self.api('POST',f'/v1/sessions/{source.id}/queue',{'action':'add','text':'keep queued','request_id':str(uuid.uuid4())})
        self.api('POST',f'/v1/sessions/{source.id}/interrupt',{})
        self.until(lambda e:e['session']['turn_state']=='ready')
        self.assertEqual('error_handoff_busy',self.preview(source)[1]['code'])
        self.assertEqual(1,len(self.bridge.sessions));self.assertEqual(1,len(source.queue))

    def test_preview_bounded_utf8_and_excludes_private_activity(self):
        source=self.begin('codex')
        with source.condition:
            source._put({'id':'first','kind':'user','status':'completed','text':'original request'})
            for kind in ['command','tool','plan','notice']:
                source._put({'id':kind,'kind':kind,'status':'completed','text':'DO_NOT_TRANSFER_'+kind})
            source._put({'id':'comment','kind':'assistant','phase':'commentary','status':'completed','text':'DO_NOT_TRANSFER_thought'})
            source._put({'id':'stream','kind':'assistant','status':'inProgress','text':'DO_NOT_TRANSFER_stream'})
            source._put({'id':'answer','kind':'assistant','status':'completed','text':'한글🙂'*6000})
        status,preview=self.preview(source);self.assertEqual(200,status,preview)
        self.assertTrue(preview['truncated']);self.assertLessEqual(len(preview['context'].encode()),12000)
        self.assertNotIn('DO_NOT_TRANSFER',preview['context']);self.assertIn('한글',preview['context'])
        self.assertEqual(1,len(self.bridge.sessions))

    def test_validation_idempotence_and_resume_lineage(self):
        source=self.begin('codex');self.message('seed')
        self.until(lambda e:e['session']['turn_state']=='ready');_,preview=self.preview(source)
        for fields in [{'agent':'codex'},{'context':'x'*12001},{'instruction':'🙂'*1001},{'instruction':' '},{'revision':True}]:
            agent=fields.pop('agent','claude')
            _,(status,_)=self.start(source,agent,preview,**fields);self.assertEqual(400,status)
        data,(status,result)=self.start(source,'claude',preview)
        self.assertEqual(200,status,result);target=result['session'];self.session_id=target['id']
        self.until(lambda e:e['session']['turn_state']=='ready' and not e['queue'])
        self.assertEqual(409,self.api('POST',f'/v1/sessions/{source.id}/handoff',{**data,'instruction':'changed'})[0])
        self.assertEqual(409,self.api('POST','/v1/sessions',{'agent':'claude','mode':'chat','new_session':True,'project_id':source.project['id'],'request_id':data['request_id']})[0])
        native=self.bridge.sessions[target['id']].thread_id
        self.end()
        resumed={'agent':'claude','mode':'chat','project_id':source.project['id'],'new_session':True,'request_id':str(uuid.uuid4()),'source_thread_id':native,'import_mode':'resume'}
        status,result=self.api('POST','/v1/sessions',resumed);self.assertEqual(200,status,result)
        self.assertEqual(source.id,result['session']['handoff']['source_session_id'])
        self.assertEqual(200,self.api('POST','/v1/sessions',resumed)[0])
        # Restarts retain links, not the transferred transcript in bridge metadata.
        restored=module.Bridge(self.state)
        self.assertEqual(source.id,restored.snapshot_by_id(target['id'])['handoff']['source_session_id'])
        self.assertEqual(target['id'],restored.handoff(source.id,data)['session']['id'])
        with self.assertRaises(module.Problem) as error:restored.handoff(target['id'],{'action':'preview'})
        self.assertEqual('error_handoff_source',error.exception.code)

    def test_unavailable_model_does_not_replay_or_destroy_original(self):
        source=self.begin('codex');self.message('seed');self.until(lambda e:e['session']['turn_state']=='ready')
        _,preview=self.preview(source)
        # Unavailable model fails before a destination session is created.
        _,(status,error)=self.start(source,'claude',preview,options={'model':'not-installed','permission':'plan'})
        self.assertEqual(400,status,error);self.assertEqual(1,len(self.bridge.sessions))
        self.assertIsNone(source.process.poll());self.assertEqual('ready',source.turn_state)

    def test_handoff_pins_real_worktree_and_keeps_existing_destination(self):
        project=self.bridge.project.copy()
        def git(*args):
            subprocess.run(['git','-C',project['path'],*args],check=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
        git('init','-b','main')
        git('-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','--allow-empty','-m','fixture')
        linked=self.root/'feature 한글 space'
        git('worktree','add','-b','feature',str(linked))
        existing=self.begin('claude')
        status,result=self.api('POST','/v1/sessions',{'agent':'codex','mode':'chat','new_session':True,
            'project_id':project['id'],'worktree_path':str(linked),'request_id':str(uuid.uuid4())})
        self.assertEqual(200,status,result);self.session_id=result['session']['id']
        self.until(lambda e:e['session']['ready'])
        source=self.bridge.sessions[self.session_id]
        self.message('Continue in the feature worktree');self.until(lambda e:e['session']['turn_state']=='ready')
        _,preview=self.preview(source)
        _,(status,result)=self.start(source,'claude',preview)
        self.assertEqual(200,status,result);self.session_id=result['session']['id']
        event=self.until(lambda e:e['session']['turn_state']=='ready' and not e['queue'])
        self.assertEqual(str(linked),event['session']['project']['path'])
        self.assertEqual(project['id'],event['session']['project']['id'])
        self.assertNotEqual(existing.id,self.session_id)
        self.assertIsNone(existing.process.poll());self.assertIsNone(source.process.poll())
        self.assertTrue((linked/'claude-turn-count').exists())
        self.assertFalse((self.root/'project'/'claude-turn-count').exists())
