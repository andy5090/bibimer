"""Owned X11/Firefox fixtures; no installed browser, account or model is used."""
import base64
import hashlib
import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import time
import uuid
from unittest.mock import patch

from test_bridge import BridgeTestCase, module


X11 = '''
import os, pathlib, signal, socket, sys
if '-nolisten' not in sys.argv or '-tag' not in sys.argv: sys.exit(2)
path = pathlib.Path(os.environ['TMPDIR'])/'.X11-unix'/('X'+sys.argv[1][1:])
path.parent.mkdir(exist_ok=True)
connection=socket.socket(socket.AF_UNIX); connection.bind(str(path)); connection.listen()
def stop(*_):
 connection.close(); path.unlink(missing_ok=True); sys.exit(0)
signal.signal(signal.SIGTERM,stop)
while True:
 client,_=connection.accept()
 with client:
  request=client.recv(64)
  if not os.environ.get('BIBIMER_TEST_X11_FAIL'): client.sendall(bytes([1,0,11,0,0,0,0,0]))
'''
FIREFOX = '''
import os, pathlib, signal, sys, time
if os.environ.get('BIBIMER_TEST_BROWSER_FAIL'): sys.exit(2)
if os.environ.get('LD_LIBRARY_PATH') or os.environ.get('LD_PRELOAD'): sys.exit(5)
profile=pathlib.Path(sys.argv[sys.argv.index('--profile')+1])
if '--no-remote' not in sys.argv or '--new-window' not in sys.argv: sys.exit(3)
if any('debug' in arg or 'headless' in arg for arg in sys.argv): sys.exit(4)
(profile/'retained-profile').write_text('simulated login')
with open(pathlib.Path.cwd()/'browser-starts','a') as output: output.write(str(profile)+'\\n')
print('PRIVATE_BROWSER_DIAGNOSTIC',flush=True)
print('PRIVATE_BROWSER_DIAGNOSTIC',file=sys.stderr,flush=True)
signal.signal(signal.SIGTERM,lambda *_:sys.exit(0))
while True:time.sleep(.05)
'''


class BrowserTests(BridgeTestCase):
    def setUp(self):
        super().setUp()
        self.register()
        self.binaries = self.root/'bin'
        self.binaries.mkdir()
        self.tmp = self.root/'tmp'
        self.tmp.mkdir()
        for name, source in [('termux-x11', X11), ('firefox', FIREFOX), ('openbox', 'import time\nwhile True: time.sleep(.1)'), ('xdotool', ''), ('xclip', ''), ('import', '')]:
            target = self.binaries/name
            target.write_text('#!'+sys.executable+'\n'+source)
            target.chmod(0o700)
        self.environment = patch.dict(os.environ, PATH=str(self.binaries)+os.pathsep+os.environ['PATH'], TMPDIR=str(self.tmp))
        self.environment.start()

    def tearDown(self):
        try:
            super().tearDown()
        finally:
            self.environment.stop()

    def payload(self, **extra):
        return dict(action='start', project_id=self.bridge.project['id'],
                    request_id=str(uuid.uuid4()), url='https://example.com/login?test=PRIVATE_URL', **extra)

    def start(self, body=None):
        status, result = self.api('POST','/v1/browser',body or self.payload())
        self.assertEqual(200,status,result)
        return result['session']

    def stop(self, row):
        status, _ = self.api('POST',f"/v1/sessions/{row['id']}/stop",{})
        self.assertEqual(200,status)
        self.bridge.sessions[row['id']].process.wait(timeout=5)
        end=time.monotonic()+3
        while time.monotonic()<end and self.bridge.sessions[row['id']].state!='exited': time.sleep(.02)
        self.assertEqual('exited', self.bridge.sessions[row['id']].state)

    def test_explicit_maintenance_reopens_same_profile_and_id_in_manual_mode(self):
        row=self.start()
        session=self.bridge.get_session(row['id'])
        old_pid=session.process.pid
        # The user previously allowed control; reopening must revoke it.
        self.api('POST','/v1/browser',dict(action='allow',project_id=row['project']['id'],session_id=row['id']))
        self.stop(row)
        request=dict(id=str(uuid.uuid4()),instance=self.bridge.instance,session_ids=[row['id']])
        module.maintenance_recovery.prepare(self.state,self.bridge.health(),request)
        self.bridge.recovery=module.maintenance_recovery.Recovery(self.bridge)
        self.bridge.recovery.begin(request['id'])
        deadline=time.monotonic()+8
        while self.bridge.recovery.running and time.monotonic()<deadline:time.sleep(.02)
        summary=self.bridge.recovery.snapshot()
        self.assertEqual(1,summary['restored'],summary)
        reopened=self.bridge.get_session(row['id'])
        self.assertNotEqual(old_pid,reopened.process.pid)
        self.assertTrue(reopened.browser_manual)
        self.assertIsNone(reopened.browser_owner)
        deadline=time.monotonic()+3
        while (self.root/'project/browser-starts').read_text().count('\n')<2 and time.monotonic()<deadline:time.sleep(.02)
        starts=(self.root/'project/browser-starts').read_text().splitlines()
        self.assertEqual(2,len(starts))
        self.assertEqual(starts[0],starts[1])
        self.assertTrue((Path(starts[0])/'retained-profile').exists())
        self.assertNotIn('PRIVATE_URL',(self.state/module.maintenance_recovery.NAME).read_text())

    def test_authenticated_status_does_not_launch_and_rejects_untrusted_url_or_workspace(self):
        data={'action':'status','project_id':self.bridge.project['id']}
        self.assertEqual(401,self.api('POST','/v1/browser',data,auth=False)[0])
        self.assertEqual(403,self.api('POST','/v1/browser',data,headers={'Origin':'https://example.com'})[0])
        status,result=self.api('POST','/v1/browser',data)
        self.assertEqual(200,status); self.assertTrue(all(result['installed'].values())); self.assertIsNone(result['session'])
        self.assertFalse((self.root/'project/browser-starts').exists())
        for url in ['javascript:alert(1)','file:///etc/passwd','https://user:secret@example.com','https://example.com\nX','--no-sandbox','https://example.com:99999','https://example.com\\@evil.test','data:text/plain,hello']:
            body=self.payload(); body['url']=url
            status,result=self.api('POST','/v1/browser',body)
            self.assertEqual(400,status,url); self.assertEqual('error_browser_url',result['code'])
        body=self.payload(worktree_path=str(self.root))
        self.assertEqual(400,self.api('POST','/v1/browser',body)[0])
        self.assertEqual([],list(self.bridge.sessions))

    def test_browser_keeps_agent_draft_boundary_and_profile_without_output_or_url_metadata(self):
        # A normal shell remains selected while the browser appears in the library.
        shell_id=self.launch()
        selected=self.bridge.selected_id(self.bridge.project['id'])
        body=self.payload(); row=self.start(body)
        self.assertEqual('browser',row['kind']); self.assertEqual('shell',row['agent'])
        self.assertEqual(selected,self.bridge.selected_id(self.bridge.project['id']))
        self.assertEqual('running',self.bridge.sessions[shell_id].state)
        self.assertEqual(2,self.bridge.active_count())
        repeated=self.start(body); self.assertEqual(row['id'],repeated['id'])
        status,result=self.api('POST','/v1/sessions',dict(agent='shell',request_id=body['request_id']))
        self.assertEqual(409,status)
        status,event=self.api('GET',f"/v1/sessions/{row['id']}/events?cursor=0&wait=0")
        self.assertEqual(200,status); self.assertEqual(b'',base64.b64decode(event['data']))
        self.assertEqual(400,self.send(row['id'],'PRIVATE_INPUT')[0])
        metadata=(self.state/'metadata.json').read_text()
        for private in ['PRIVATE_URL','PRIVATE_INPUT','PRIVATE_BROWSER_DIAGNOSTIC','simulated login']: self.assertNotIn(private,metadata)
        self.assertEqual(409,self.api('POST','/v1/shutdown',{})[0])
        self.assertEqual(409,self.api('POST','/v1/project/manage',dict(project_id=row['project']['id'],action='delete'))[0])
        profile=Path((self.root/'project/browser-starts').read_text().splitlines()[0])
        self.assertEqual(0o700,profile.stat().st_mode & 0o777)
        self.assertEqual(row['id'],self.api('POST','/v1/browser',self.payload())[1]['session']['id'])
        self.stop(row)
        self.assertTrue((profile/'retained-profile').exists())
        next_row=self.start()
        self.assertEqual([str(profile),str(profile)],(self.root/'project/browser-starts').read_text().splitlines())
        self.stop(next_row)

    def test_idempotency_conflicts_and_missing_packages_do_not_spawn(self):
        body=self.payload(); row=self.start(body)
        changed=dict(body,url='https://example.org')
        self.assertEqual(409,self.api('POST','/v1/browser',changed)[0])
        self.stop(row)
        lookup=module.shutil.which
        with patch.object(module.shutil, 'which', side_effect=lambda name: None if name == 'firefox' else lookup(name)):
            status,result=self.api('POST','/v1/browser',self.payload())
        self.assertEqual(400,status); self.assertEqual('error_browser_setup',result['code'])

    def test_profile_lock_survives_other_bridge_and_only_owned_processes_stop(self):
        row=self.start()
        # Separate bridge state must not open the same retained profile twice.
        profile=next((self.state/'browser-profiles').iterdir())
        displays=module.private_dir(self.tmp/'other-displays')
        probe=subprocess.run([sys.executable,str(Path(module.__file__)), '_browser',str(profile),str(displays),
                              'bibimer-'+str(uuid.uuid4()),'about:blank'],capture_output=True,timeout=3)
        self.assertEqual('error_browser_busy',json.loads(probe.stdout)['code'])
        self.assertEqual('running',self.bridge.sessions[row['id']].state)
        other=subprocess.Popen([sys.executable,'-c','import time;time.sleep(30)'],start_new_session=True)
        try:
            self.stop(row)
            self.assertIsNone(other.poll())
        finally:
            other.terminate(); other.wait(timeout=3)

    def test_restore_marks_lost_without_opening_browser_and_retains_profile(self):
        row=self.start()
        self.stop(row)
        # Simulate metadata saved while running, then a bridge restart.
        saved=json.loads((self.state/'metadata.json').read_text())
        for value in saved['sessions']:
            if value['id']==row['id']: value['state']='running'
        module.save_json(self.state/'metadata.json',saved)
        reopened=module.Bridge(self.state)
        restored=next(value for value in reopened.snapshots() if value['id']==row['id'])
        self.assertEqual('lost',restored['state']); self.assertEqual('browser',restored['kind'])
        self.assertEqual(0,reopened.active_count()); self.assertEqual(1,len((self.root/'project/browser-starts').read_text().splitlines()))
        reopened.linked_files.close(); reopened.github.close(); reopened.worktree_creation.close()

    def test_failed_browser_releases_profile_and_does_not_leave_session(self):
        with patch.dict(os.environ,BIBIMER_TEST_BROWSER_FAIL='1'):
            status,result=self.api('POST','/v1/browser',self.payload())
        self.assertEqual(400,status); self.assertEqual('error_browser_start',result['code'])
        self.assertEqual(0,self.bridge.active_count()); self.assertFalse(self.bridge.sessions)
        row=self.start(); self.stop(row)

    def test_x11_protocol_failure_never_starts_firefox(self):
        with patch.dict(os.environ,BIBIMER_TEST_X11_FAIL='1'):
            status,result=self.api('POST','/v1/browser',self.payload())
        self.assertEqual(400,status); self.assertEqual('error_browser_start',result['code'])
        self.assertFalse((self.root/'project/browser-starts').exists())
        self.assertEqual(0,self.bridge.active_count())

    def test_registered_worktree_reuses_project_window_and_profile(self):
        project=self.root/'project'
        for args in [('init',),('config','user.email','fixture@example.test'),('config','user.name','Fixture')]:
            subprocess.run(['git','-C',str(project),*args],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        (project/'README').write_text('fixture')
        subprocess.run(['git','-C',str(project),'add','README'],check=True)
        subprocess.run(['git','-C',str(project),'commit','-m','fixture'],check=True,stdout=subprocess.DEVNULL)
        tree=self.root/'worktree'
        subprocess.run(['git','-C',str(project),'worktree','add','-b','browser-fixture',str(tree)],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        original=self.start()
        other=self.start(self.payload(worktree_path=str(tree)))
        self.assertEqual(original['id'],other['id'])
        self.assertFalse((tree/'browser-starts').exists())
        self.stop(original)
        next_row=self.start(self.payload(worktree_path=str(tree)))
        self.assertEqual((project/'browser-starts').read_text().strip(),(tree/'browser-starts').read_text().strip())
        self.stop(next_row)

    def agent(self, permission='inherit'):
        executable=self.binaries/'codex'
        executable.write_text('#!'+sys.executable+'\n'+Path(__file__).with_name('fake_codex.py').read_text())
        executable.chmod(0o700)
        status,result=self.api('POST','/v1/sessions',dict(project_id=self.bridge.project['id'],agent='codex',mode='chat',new_session=True,
            request_id=str(uuid.uuid4()),options={'permission':permission}))
        self.assertEqual(200,status,result)
        return self.bridge.sessions[result['session']['id']]

    def tool(self, agent, action, **data):
        return self.bridge.browser_tools.handle(dict(capability=agent.browser_key,action=action,**data))

    def test_manual_handoff_blocks_capture_and_input_and_never_grants_tools_an_unlock(self):
        agent=self.agent()
        result=self.tool(agent,'open')
        self.assertTrue(result['manual_login'])
        browser=next(row for row in self.bridge.sessions.values() if isinstance(row,module.BrowserSession))
        for action in ('screenshot','click','type','key','scroll','allow','manual'):
            with self.assertRaises(ValueError): self.tool(agent,action,text='PRIVATE_INPUT',x=1,y=1,key='ctrl+l')
        body=dict(project_id=agent.project['id'],session_id=browser.id)
        self.assertEqual(401,self.api('POST','/v1/browser',dict(body,action='allow'),auth=False)[0])
        self.assertEqual(200,self.api('POST','/v1/browser',dict(body,action='allow'))[0])
        with patch.object(module.browser_tools,'control',return_value={'ok':True}) as control:
            self.assertTrue(self.tool(agent,'click',x=1,y=2)['ok'])
            control.assert_called_once()
        self.assertEqual(200,self.api('POST','/v1/browser',dict(body,action='manual'))[0])
        self.assertTrue(browser.browser_manual)
        self.assertIsNone(browser.browser_owner)
        with self.assertRaisesRegex(ValueError,'error_browser_manual'): self.tool(agent,'screenshot')
        text=(self.state/'metadata.json').read_text()
        self.assertNotIn(agent.browser_key,text)
        self.assertNotIn('PRIVATE_INPUT',text)

    def test_tools_use_one_agent_at_a_time_and_revoke_exited_sessions(self):
        one=self.agent();two=self.agent()
        browser=self.start()
        self.api('POST','/v1/browser',dict(action='allow',project_id=one.project['id'],session_id=browser['id']))
        with patch.object(module.browser_tools,'control',return_value={'ok':True}):
            self.tool(one,'click',x=1,y=1)
            with self.assertRaisesRegex(ValueError,'error_browser_busy'): self.tool(two,'click',x=1,y=1)
            self.tool(one,'release')
            self.tool(two,'click',x=1,y=1)
            two.stop();two.process.wait(timeout=3)
            with self.assertRaisesRegex(ValueError,'error_browser_control'): self.tool(two,'screenshot')
            self.tool(one,'click',x=1,y=1)

    def test_setting_default_saved_disabled_access_and_native_permissions(self):
        self.assertTrue(self.bridge.browser_enabled)
        agent=self.agent('read-only')
        with self.assertRaisesRegex(ValueError,'error_browser_permission'): self.tool(agent,'open')
        self.assertIn('bibimer-browser',agent.browser_instructions)
        status,result=self.api('POST','/v1/browser',dict(action='configure',project_id=agent.project['id'],enabled=False))
        self.assertEqual(200,status);self.assertFalse(result['enabled'])
        self.assertFalse(json.loads((self.state/'metadata.json').read_text())['browser_enabled'])
        with self.assertRaisesRegex(ValueError,'error_browser_control'): self.tool(agent,'status')
        other=self.agent();self.assertIsNone(other.browser_key)

    def test_cli_is_scoped_and_reads_only_the_managed_display(self):
        agent=self.agent()
        env={**os.environ,**self.bridge.browser_tools.child_environment(agent.browser_key)}
        result=subprocess.run([str(self.bridge.browser_tools.bin/'bibimer-browser'),'status'],input='',text=True,
                              capture_output=True,env=env,timeout=3)
        self.assertEqual(0,result.returncode);self.assertFalse(json.loads(result.stdout)['running'])
        env['BIBIMER_BROWSER_SESSION']='invalid'
        result=subprocess.run([str(self.bridge.browser_tools.bin/'bibimer-browser'),'status'],input='',text=True,
                              capture_output=True,env=env,timeout=3)
        self.assertEqual(1,result.returncode);self.assertEqual('error_browser_control',json.loads(result.stdout)['error'])

    def test_only_browser_children_clear_library_overrides_and_auth_is_private(self):
        with patch.dict(os.environ,LD_LIBRARY_PATH='/agent/private/libs',LD_PRELOAD='/agent/private/preload'):
            browser=self.start()
        self.assertEqual('running',browser['state'])
        session=self.bridge.sessions[browser['id']]
        self.assertEqual(0o600,session.browser_authority.stat().st_mode & 0o777)
        self.assertLessEqual(len(str(session.browser_authority).encode()),128)
        self.assertEqual(0o700,session.browser_authority.parent.stat().st_mode & 0o777)
        self.assertIn(b'MIT-MAGIC-COOKIE-1',session.browser_authority.read_bytes())
