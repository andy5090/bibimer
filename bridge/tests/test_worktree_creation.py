import json
import os
from pathlib import Path
import subprocess
import threading
import time
import uuid
from unittest.mock import patch
from test_bridge import BridgeTestCase, module


class WorktreeCreationTests(BridgeTestCase):
    def setUp(self):
        super().setUp()
        self.api('POST','/v1/project',{'path':str(self.root/'project'),'create':True,'add':True})
        self.project=self.bridge.project.copy()
        self.git('init','-b','main')
        (Path(self.project['path'])/'tracked.txt').write_text('committed\n')
        self.git('add','tracked.txt')
        self.git('-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-m','initial')
        self.head=self.git('rev-parse','HEAD')

    def tearDown(self):
        self.bridge.worktree_creation.close()
        super().tearDown()

    def git(self,*args):
        return subprocess.run(['git','-C',self.project['path'],*args],check=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE).stdout.decode().strip()

    def request(self,action,**data):
        return self.api('POST','/v1/worktrees/manage',{'action':action,'project_id':self.project['id'],**data})

    def create(self,branch='feature/new',**extra):
        data={'branch':branch,'base':self.head,'agent':'shell','mode':'terminal','options':{},'request_id':str(uuid.uuid4()),**extra}
        status,result=self.request('create',**data)
        self.assertEqual(200,status,result)
        return result['job'],data

    def finish(self,identity):
        deadline=time.monotonic()+8
        while time.monotonic()<deadline:
            result=self.request('status')[1]
            row=next(row for row in result['jobs'] if row['id']==identity)
            if row['state']!='creating':return row
            time.sleep(.02)
        self.fail('worktree creation timed out')

    def test_new_branch_real_worktree_and_single_session_with_retries(self):
        original=Path(self.project['path'])
        (original/'tracked.txt').write_text('dirty original\n')
        (original/'private.env').write_text('fixture secret; never copy this\n')
        hook=original/'.git/hooks/post-checkout';hook.write_text('#!/bin/sh\ntouch '+str(self.root/'HOOK_RAN')+'\n');hook.chmod(0o700)
        status,options=self.request('options')
        self.assertEqual(200,status)
        self.assertEqual(self.head,options['refs'][0]['commit'])
        job,data=self.create(branch='feature/한글')
        for _ in range(2):self.assertEqual(job['id'],self.request('create',**data)[1]['job']['id'])
        job=self.finish(job['id']);self.assertEqual('complete',job['state'],job)
        folder=Path(job['path'])
        self.assertEqual('feature/한글',self.git('-C',str(folder),'branch','--show-current'))
        self.assertEqual('committed\n',(folder/'tracked.txt').read_text())
        self.assertFalse((folder/'private.env').exists());self.assertFalse((self.root/'HOOK_RAN').exists())
        self.assertEqual('dirty original\n',(original/'tracked.txt').read_text())
        self.assertTrue(job['new_branch'])
        self.assertEqual(0,self.bridge.active_count())
        self.assertIn(str(folder),[row['path'] for row in self.bridge.worktrees({'project_id':self.project['id']})['worktrees']])
        status,result=self.request('launch',request_id=job['id']);self.assertEqual(200,status,result)
        session=result['session'];self.assertEqual(str(folder),session['project']['path'])
        self.assertEqual(self.project['id'],session['project']['id'])
        self.assertEqual(session['id'],self.request('launch',request_id=job['id'])[1]['session']['id'])
        self.assertEqual(1,self.bridge.active_count())
        self.assertEqual(session['id'],self.request('status')[1]['jobs'][0]['session_id'])
        self.assertNotIn('fixture secret', (self.state/'worktree-jobs.json').read_text())

    def test_existing_branch_reused_without_reset_or_forced_checkout(self):
        self.git('branch','existing')
        (Path(self.project['path'])/'tracked.txt').write_text('new main tip\n')
        self.git('add','tracked.txt')
        self.git('-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-m','main advanced')
        new_head=self.git('rev-parse','HEAD')
        job,_=self.create('existing',base=new_head);job=self.finish(job['id'])
        self.assertEqual('complete',job['state'],job)
        self.assertFalse(job['new_branch'])
        self.assertEqual(self.head,self.git('rev-parse','existing'))
        self.assertEqual(self.head,job['base'])
        self.assertEqual('committed\n',(Path(job['path'])/'tracked.txt').read_text())
        self.assertEqual('existing',self.git('-C',job['path'],'branch','--show-current'))
        status,result=self.request('create',branch='existing',base=self.head,agent='shell',mode='terminal',request_id=str(uuid.uuid4()))
        self.assertEqual((409,'error_worktree_branch_used'),(status,result.get('code')))
        self.assertEqual(self.head,self.git('rev-parse','existing'))

    def test_validation_conflicts_non_git_and_missing_commit(self):
        for name in ['main','-bad','bad name','../escape','a..b','a@{b','HEAD','x\0y']:
            with self.subTest(name=name):
                status,result=self.request('create',branch=name,base=self.head,agent='shell',mode='terminal',request_id=str(uuid.uuid4()))
                self.assertIn(status,[400,409],result)
        for base in ['HEAD','--help','0'*40,{},None]:
            self.assertEqual(400,self.request('create',branch='valid',base=base,agent='shell',mode='terminal',request_id=str(uuid.uuid4()))[0])
        job,data=self.create();self.finish(job['id'])
        self.assertEqual(409,self.request('create',**{**data,'branch':'other'})[0])
        self.assertEqual(400,self.request('launch',request_id='invalid')[0])
        self.assertEqual(404,self.api('POST','/v1/worktrees/manage',{'action':'options','project_id':str(uuid.uuid4())})[0])
        (self.root/'non-git').mkdir()
        _,result=self.api('POST','/v1/project',{'path':str(self.root/'non-git'),'add':True})
        self.assertEqual(400,self.api('POST','/v1/worktrees/manage',{'action':'options','project_id':result['project']['id']})[0])

    def test_original_live_process_survives_and_failed_launch_keeps_worktree(self):
        _,result=self.api('POST','/v1/sessions',{'agent':'shell','mode':'terminal','project_id':self.project['id'],'request_id':str(uuid.uuid4())})
        first=self.bridge.get_session(result['session']['id'])
        job,_=self.create(agent='codex',mode='chat');job=self.finish(job['id'])
        with patch.object(self.bridge,'agent_executable',return_value=None):
            self.assertNotEqual(200,self.request('launch',request_id=job['id'])[0])
        self.assertEqual('complete',self.request('status')[1]['jobs'][0]['state'])
        self.assertTrue(Path(job['path']).is_dir())
        self.assertIsNone(first.process.poll())
        self.assertEqual(self.project['path'],first.project['path'])
        self.assertEqual(1,self.bridge.active_count())
        status,result=self.request('launch',request_id=job['id'])
        self.assertEqual(200,status,result)
        self.assertEqual(first.id,self.bridge.selected_id(self.project['id']))
        self.assertIsNone(first.process.poll())
        self.assertEqual(2,self.bridge.active_count())

    def test_checkout_never_overwrites_folder_appearing_after_validation(self):
        entered,release=threading.Event(),threading.Event()
        original=self.bridge.worktree_creation.worker
        def held(job,project):
            entered.set();release.wait(4);original(job,project)
        with patch.object(self.bridge.worktree_creation,'worker',side_effect=held):
            job,_=self.create('path-race')
            self.assertTrue(entered.wait(2))
            folder=Path(job['path']);folder.mkdir(parents=True)
            (folder/'keep.txt').write_text('keep existing folder')
            release.set();job=self.finish(job['id'])
        self.assertEqual('failed',job['state'])
        self.assertEqual('error_worktree_path',job['error'])
        self.assertEqual('keep existing folder',(folder/'keep.txt').read_text())
        self.assertEqual('',self.git('branch','--list','path-race'))

    def test_new_branch_uses_selected_commit_and_pending_checkout_cannot_launch(self):
        (Path(self.project['path'])/'tracked.txt').write_text('later original commit\n')
        self.git('add','tracked.txt')
        self.git('-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-m','original advances')
        self.assertNotEqual(self.head,self.git('rev-parse','HEAD'))
        entered,release=threading.Event(),threading.Event()
        original=self.bridge.worktree_creation.worker
        def held(job,project):
            original(job,project)
            with self.bridge.worktree_creation.lock:job['state']='creating'
            entered.set();release.wait(4)
            with self.bridge.worktree_creation.lock:job['state']='complete'
        with patch.object(self.bridge.worktree_creation,'worker',side_effect=held):
            job,_=self.create('pending')
            self.assertTrue(entered.wait(2))
            try:
                rows=self.bridge.worktrees({'project_id':self.project['id']})['worktrees']
                self.assertFalse(next(row for row in rows if row['path']==job['path'])['available'])
                self.assertEqual(409,self.request('launch',request_id=job['id'])[0])
                status,_=self.api('POST','/v1/sessions',{'agent':'shell','mode':'terminal','project_id':self.project['id'],
                    'worktree_path':job['path'],'new_session':True,'request_id':str(uuid.uuid4())})
                self.assertNotEqual(200,status)
            finally:release.set()
            job=self.finish(job['id'])
        self.assertEqual('complete',job['state'])
        self.assertEqual(self.head,self.git('-C',job['path'],'rev-parse','HEAD'))

    def test_busy_project_unregister_restart_and_metadata_recovery(self):
        entered,release=threading.Event(),threading.Event()
        original=self.bridge.worktree_creation.worker
        def held(job,project):
            entered.set();release.wait(4);original(job,project)
        with patch.object(self.bridge.worktree_creation,'worker',side_effect=held):
            job,data=self.create()
            self.assertTrue(entered.wait(2))
            try:
                self.assertEqual(409,self.request('create',**{**data,'branch':'other','request_id':str(uuid.uuid4())})[0])
                self.assertEqual(409,self.api('POST','/v1/project/manage',{'project_id':self.project['id'],'action':'delete'})[0])
                self.assertEqual(409,self.api('POST','/v1/shutdown',{})[0])
                self.assertEqual(0,self.bridge.active_count())
            finally:release.set()
            job=self.finish(job['id'])
        self.assertEqual('complete',job['state'])
        rows=json.loads((self.state/'worktree-jobs.json').read_text());rows[0]['state']='creating';module.save_json(self.state/'worktree-jobs.json',rows)
        restarted=module.Bridge(self.state)
        try:
            recovered=restarted.worktree_creation.status(self.project['id'])['jobs'][0]
            self.assertEqual('complete',recovered['state'])
            self.assertEqual(job['path'],recovered['path'])
            self.assertEqual(job['id'],restarted.worktree_creation.create({'project_id':self.project['id'],**data})['job']['id'])
            self.assertEqual(0,restarted.active_count())
        finally:restarted.worktree_creation.close()

    def test_receipt_save_failure_does_not_create_git_branch_or_folder(self):
        with patch.object(self.bridge.worktree_creation,'save',side_effect=OSError('controlled')):
            self.assertEqual(500,self.request('create',branch='not-created',base=self.head,agent='shell',mode='terminal',request_id=str(uuid.uuid4()))[0])
        self.assertEqual('',self.git('branch','--list','not-created'))
        self.assertEqual([],self.request('status')[1]['jobs'])
