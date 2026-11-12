"""Reviewed agent-only stop/install-or-login/reopen, using owned fake CLIs."""
import json
import os
from pathlib import Path
import threading
import time
import uuid
from unittest.mock import patch
from test_providers import ProviderFixture
from test_bridge import module

class AgentMaintenanceTests(ProviderFixture):
 def setUp(self):
  super().setUp()
  self.up=self.bridge.agent_updates
  self.installs=[]
  self.fake=self.root/'claude'
  self.patches=[
   patch.object(self.up,'installation',side_effect=lambda agent:{'agent':agent,'executable':str(self.fake),'current':'2.1.283','fingerprint':self.up.fingerprint(self.fake),'kind':'claude-runtime','package':'@anthropic-ai/claude-code-linux-arm64','target':str(self.root/'fake-runtime')}),
   patch.object(self.up,'metadata',return_value={'version':'2.1.284','dist':{}}),
   patch.object(self.up,'native_install',side_effect=lambda plan:self.installs.append(plan['agent'])),
   patch.object(self.up,'probe',return_value='2.1.284')]
  for value in self.patches:value.start();self.addCleanup(value.stop)
 def call(self,action,agent='claude',**body):return self.api('POST','/v1/agent-updates',dict(agent=agent,action=action,**body))
 def plan(self,agent='claude'):
  status,result=self.call('check',agent);self.assertEqual(200,status,result);return result['plan']
 def prepare(self,plan):
  status,result=self.call('prepare',plan['agent'],plan_id=plan['id']);self.assertEqual(200,status,result);return result['confirmation']
 def wait_update(self,job,agent='claude'):
  end=time.monotonic()+10
  while time.monotonic()<end:
   status,result=self.call('poll',agent,id=job['id']);self.assertEqual(200,status,result)
   if result['job']['status'] in {'succeeded','failed'}:return result['job']
   time.sleep(.02)
  self.fail('agent operation did not finish')
 def shell(self):
  status,result=self.api('POST','/v1/sessions',{'agent':'shell','mode':'terminal','new_session':True,'project_id':self.bridge.project['id'],'request_id':str(uuid.uuid4())})
  self.assertEqual(200,status,result);return result['session']['id']
 def saved_claude(self):
  session=self.begin('claude',imported=True,mode='resume')
  self.message('PRIVATE_SAVED_TURN')
  self.until(lambda event:event['session']['turn_state']=='ready' and any(item['kind']=='turn' for item in event['items']))
  return session
 def test_update_reopens_exact_saved_chat_and_preserves_unrelated_work_and_archive(self):
  session=self.saved_claude();native=session.thread_id;old_launch=session.launch_id
  self.api('POST',f'/v1/sessions/{session.id}/manage',{'action':'archive'})
  unrelated=self.shell();other=self.bridge.get_session(unrelated);other_process=other.process
  plan=self.plan();confirmation=self.prepare(plan)
  self.assertEqual([session.id],[row['id'] for row in confirmation['targets']]);self.assertTrue(confirmation['targets'][0]['archived'])
  self.assertEqual('running',session.state);self.assertFalse(self.installs)
  key=str(uuid.uuid4());payload=dict(plan_id=plan['id'],confirmation_id=confirmation['id'],reopen=True,request_id=key)
  status,result=self.call('start',**payload);self.assertEqual(200,status,result)
  done=self.wait_update(result['job']);self.assertEqual('succeeded',done['status'],done);self.assertEqual(1,done['recovery']['restored'],done)
  restored=self.bridge.get_session(session.id);self.assertNotEqual(old_launch,restored.launch_id);self.assertEqual(native,restored.thread_id)
  self.assertFalse(restored.queue);self.assertEqual('1',(self.root/'project/claude-turn-count').read_text())
  self.assertTrue(next(row for row in self.bridge.snapshots() if row['id']==session.id)['archived'])
  self.assertIs(other_process,self.bridge.get_session(unrelated).process);self.assertIsNone(other_process.poll())
  self.assertEqual(['claude'],self.installs);self.assertEqual(key,self.call('start',**payload)[1]['job']['id']);self.assertEqual(['claude'],self.installs)
  self.assertNotIn('PRIVATE',json.dumps(done));self.assertFalse((self.state/'maintenance-recovery.json').exists())
 def test_changed_targets_and_cancelled_preview_never_stop_or_install(self):
  first=self.saved_claude();plan=self.plan();confirmation=self.prepare(plan)
  second=self.bridge.get_session(self.shell());second.agent='claude'
  status,result=self.call('start',plan_id=plan['id'],confirmation_id=confirmation['id'],reopen=True,request_id=str(uuid.uuid4()))
  self.assertEqual(409,status,result);self.assertEqual('running',first.state);self.assertEqual('running',second.state);self.assertFalse(self.installs)
 def test_stop_failure_and_install_failure_never_claim_or_automatically_reopen(self):
  session=self.saved_claude();plan=self.plan();confirmation=self.prepare(plan)
  with patch.object(session,'stop',side_effect=OSError('fixture stop failure')):
   status,result=self.call('start',plan_id=plan['id'],confirmation_id=confirmation['id'],reopen=True,request_id=str(uuid.uuid4()));self.assertEqual(200,status,result)
   done=self.wait_update(result['job']);self.assertEqual('failed',done['status']);self.assertEqual('error_agent_operation_stop',done['error'])
  self.assertEqual('running',session.state);self.assertFalse(self.installs)
  plan=self.plan();confirmation=self.prepare(plan)
  with patch.object(self.up,'native_install',side_effect=ValueError('fixture install failure')):
   status,result=self.call('start',plan_id=plan['id'],confirmation_id=confirmation['id'],reopen=True,request_id=str(uuid.uuid4()));self.assertEqual(200,status,result)
   done=self.wait_update(result['job']);self.assertEqual('failed',done['status'])
  self.assertEqual('exited',self.bridge.get_session(session.id).state);self.assertEqual(0,done['recovery']['restored'])
 def test_update_queue_keeps_next_targets_running_until_its_install_slot(self):
  first=self.saved_claude();p1=self.plan();c1=self.prepare(p1)
  started=threading.Event();release=threading.Event()
  def install(plan):
   self.installs.append(plan['agent'])
   if plan['agent']=='claude':started.set();release.wait(timeout=5)
  with patch.object(self.up,'native_install',side_effect=install):
   j1=self.call('start',plan_id=p1['id'],confirmation_id=c1['id'],reopen=True,request_id=str(uuid.uuid4()))[1]['job']
   self.assertTrue(started.wait(3))
   # A different agent's normal work remains live while the package manager is busy.
   second=self.begin('codex',imported=False);p2=self.plan('codex');c2=self.prepare(p2)
   status,result=self.call('start','codex',plan_id=p2['id'],confirmation_id=c2['id'],reopen=False,request_id=str(uuid.uuid4()));self.assertEqual(200,status,result)
   self.assertEqual('waiting',result['job']['status']);self.assertEqual('running',second.state)
   release.set();self.assertEqual('succeeded',self.wait_update(j1)['status']);self.assertEqual('succeeded',self.wait_update(result['job'],'codex')['status'])
  self.assertEqual(['claude','codex'],self.installs)
 def native_auth(self):
  self.fake.write_text('#!'+module.sys.executable+'\nimport sys,json,pathlib\np=pathlib.Path('+repr(str(self.root/'auth-ok'))+')\nif sys.argv[1:]==["--version"]:print("2.1.283");sys.exit()\nif sys.argv[1:]==["auth","status"]:print(json.dumps({"loggedIn":p.exists()}));sys.exit()\nif sys.argv[1:]==["auth","login","--help"]:print("--console");sys.exit()\nassert sys.argv[1:]==["auth","login"]\nprint("https://claude.com/cai/oauth/authorize?state=fictional",flush=True)\nprint("Paste code here if prompted > ",flush=True)\nassert input()=="fixture-code"\np.write_text("ok")\n')
 def auth(self,action,**body):return self.api('POST','/v1/agent-connections',dict(agent='claude',action=action,method='claudeai',project_id=self.bridge.project['id'],**body))
 def test_account_connection_stops_only_reviewed_agent_and_reopens_after_native_success(self):
  session=self.saved_claude();native=session.thread_id;self.native_auth()
  unrelated=self.shell();other=self.bridge.get_session(unrelated)
  status,result=self.auth('prepare');self.assertEqual(200,status,result);confirmation=result['confirmation']
  self.assertEqual([session.id],[row['id'] for row in confirmation['targets']]);self.assertEqual('running',session.state)
  key=str(uuid.uuid4());status,result=self.auth('start',confirmation_id=confirmation['id'],reopen=True,request_id=key);self.assertEqual(200,status,result);job=result['job']
  deadline=time.monotonic()+8
  while time.monotonic()<deadline:
   status,result=self.auth('poll',id=job['id']);self.assertEqual(200,status,result)
   if result['job'].get('code_required'):break
   time.sleep(.02)
  self.assertTrue(result['job']['code_required']);self.assertEqual('exited',session.state);self.assertIsNone(other.process.poll())
  status,result=self.auth('code',id=job['id'],code='fixture-code');self.assertEqual(200,status,result)
  while time.monotonic()<deadline:
   status,result=self.auth('poll',id=job['id']);self.assertEqual(200,status,result)
   if result['job']['status']=='saved':break
   time.sleep(.02)
  self.assertEqual('saved',result['job']['status'],result);self.assertEqual(1,result['job']['recovery']['restored'],result)
  self.assertEqual(native,self.bridge.get_session(session.id).thread_id);self.assertEqual('1',(self.root/'project/claude-turn-count').read_text());self.assertFalse(self.installs)
  self.assertNotIn('PRIVATE',json.dumps(result));self.assertIsNone(other.process.poll())
 def test_another_agents_account_request_is_not_rejected_by_claude_account_work(self):
  lock=self.bridge.agent_connections.agent_locks['claude'];entered=threading.Event();release=threading.Event()
  def hold():
   with lock:entered.set();release.wait(timeout=3)
  thread=threading.Thread(target=hold);thread.start();self.assertTrue(entered.wait(1))
  try:
   with patch.object(self.bridge,'agent_executable',return_value=str(self.fake)):
    status,result=self.api('POST','/v1/agent-connections',{'agent':'codex','action':'version'});self.assertEqual(200,status,result)
  finally:release.set();thread.join(timeout=2)
 def test_recovery_retry_reopens_only_failed_session_without_installing_again(self):
  session=self.saved_claude();native=session.thread_id;plan=self.plan();confirmation=self.prepare(plan)
  with patch.object(module.maintenance_recovery.Recovery,'_open',side_effect=ValueError('fixture reopen failure')):
   status,result=self.call('start',plan_id=plan['id'],confirmation_id=confirmation['id'],reopen=True,request_id=str(uuid.uuid4()));self.assertEqual(200,status,result)
   done=self.wait_update(result['job']);self.assertEqual('succeeded',done['status']);self.assertEqual(1,done['recovery']['failed']);self.assertTrue(done['recovery']['retryable'])
  deadline=time.monotonic()+2
  while self.bridge.agent_sessions.busy('claude') and time.monotonic()<deadline:time.sleep(.01)
  status,result=self.call('retry_restore',id=done['id']);self.assertEqual(200,status,result)
  done=self.wait_update(result['job']);self.assertEqual(1,done['recovery']['restored']);self.assertFalse(done['recovery']['retryable'])
  self.assertEqual(native,self.bridge.get_session(session.id).thread_id);self.assertEqual(['claude'],self.installs)
  self.assertEqual('1',(self.root/'project/claude-turn-count').read_text())
  self.assertEqual(409,self.call('retry_restore',id=done['id'])[0]);self.assertEqual(['claude'],self.installs)
 def test_login_cancel_leaves_reviewed_sessions_stopped_and_other_work_live(self):
  session=self.saved_claude();self.native_auth();other=self.bridge.get_session(self.shell())
  confirmation=self.auth('prepare')[1]['confirmation']
  status,result=self.auth('start',confirmation_id=confirmation['id'],reopen=True,request_id=str(uuid.uuid4()));self.assertEqual(200,status,result);job=result['job']
  deadline=time.monotonic()+8
  while time.monotonic()<deadline:
   status,result=self.auth('poll',id=job['id']);self.assertEqual(200,status,result)
   if result['job'].get('code_required'):break
   time.sleep(.02)
  self.assertTrue(result['job'].get('code_required'),result)
  status,result=self.auth('cancel',id=job['id']);self.assertEqual(200,status,result);self.assertEqual('cancelled',result['job']['status'])
  self.assertEqual('exited',self.bridge.get_session(session.id).state);self.assertEqual(0,result['job']['recovery']['restored']);self.assertIsNone(other.process.poll())
  self.assertFalse(self.bridge.agent_sessions.busy('claude'));self.assertFalse((self.root/'auth-ok').exists());self.assertEqual('1',(self.root/'project/claude-turn-count').read_text())
 def test_unsaved_chat_is_skipped_instead_of_starting_a_new_conversation(self):
  session=self.saved_claude();session.history_persisted=False
  plan=self.plan();confirmation=self.prepare(plan)
  status,result=self.call('start',plan_id=plan['id'],confirmation_id=confirmation['id'],reopen=True,request_id=str(uuid.uuid4()));self.assertEqual(200,status,result)
  done=self.wait_update(result['job']);self.assertEqual('succeeded',done['status']);self.assertEqual(1,done['recovery']['skipped']);self.assertFalse(done['recovery']['retryable'])
  self.assertEqual('maintenance_recovery_no_history',done['recovery']['rows'][0]['error']);self.assertEqual('exited',self.bridge.get_session(session.id).state)
 def test_login_terminal_reopens_as_fresh_shell_without_repeating_auth(self):
  self.native_auth()
  status,result=self.auth('terminal',request_id=str(uuid.uuid4()));self.assertEqual(200,status,result)
  session=self.bridge.get_session(result['session']['id']);old_launch=session.launch_id
  plan=self.plan();confirmation=self.prepare(plan);self.assertEqual([session.id],[row['id'] for row in confirmation['targets']])
  status,result=self.call('start',plan_id=plan['id'],confirmation_id=confirmation['id'],reopen=True,request_id=str(uuid.uuid4()));self.assertEqual(200,status,result)
  done=self.wait_update(result['job']);self.assertEqual(1,done['recovery']['restored'],done)
  restored=self.bridge.get_session(session.id);self.assertNotEqual(old_launch,restored.launch_id);self.assertEqual('shell',restored.agent);self.assertFalse(restored.snapshot().get('authentication_agent'));self.assertEqual(session.project['path'],restored.project['path']);self.assertIsNone(restored.process.poll())
