import base64
import concurrent.futures
import importlib.util
from pathlib import Path
import stat
import threading
import time
import types
import unittest
import uuid
from unittest.mock import patch
import test_ios_bridge as fixture
ROOT=fixture.ROOT

spec=importlib.util.spec_from_file_location('browser_native_tests',ROOT/'ios/bridge/browser_native.py')
native=importlib.util.module_from_spec(spec);spec.loader.exec_module(native)

class CommandTests(unittest.TestCase):
    def test_matching_receipt_only_once_and_bounded_result(self):
        transport=native.NativeCommands();session=types.SimpleNamespace(id='s',launch_id='l',project={'id':'p'})
        with concurrent.futures.ThreadPoolExecutor() as pool:
            future=pool.submit(transport.call,session,'screenshot')
            deadline=time.monotonic()+2;command=None
            while command is None and time.monotonic()<deadline:command=transport.take()['command']
            self.assertIsNotNone(command);self.assertIsNone(transport.take()['command'])
            with self.assertRaises(ValueError):transport.finish({'id':command['id'],'launch_id':'other','result':{'ok':True}})
            with self.assertRaises(ValueError):transport.finish({'id':command['id'],'launch_id':'l','result':{'cookie':'secret'}})
            transport.finish({'id':command['id'],'launch_id':'l','result':{'ok':True}})
            self.assertEqual({'ok':True},future.result(timeout=2))
            with self.assertRaises(ValueError):transport.finish({'id':command['id'],'launch_id':'l','result':{'ok':True}})
        self.assertFalse(transport.commands)

class NativeBrowserTests(unittest.TestCase):
    setUp=fixture.BridgeTests.setUp
    def tearDown(self):
        self.bridge.native_browser_commands.call=lambda *args,**kwargs:{'ok':True}
        for key,row in list(self.bridge.sessions.items()):
            if isinstance(row,types.SimpleNamespace):self.bridge.sessions.pop(key,None)
        fixture.BridgeTests.tearDown(self)

    def launch_browser(self):
        self.calls=[]
        def call(session,action,data=None):
            self.calls.append(action)
            return {'png':base64.b64encode(b'\x89PNG\r\n\x1a\nfixture').decode()} if action=='screenshot' else {'ok':True}
        self.bridge.native_browser_commands.call=call
        return self.bridge.browser({'action':'start','project_id':self.project['id'],'request_id':str(uuid.uuid4()),'url':'https://example.com'})['session']

    def agent(self,permission='inherit'):
        row=types.SimpleNamespace(id=str(uuid.uuid4()),browser_key='capability',state='running',process=types.SimpleNamespace(poll=lambda:None),project=self.project,options={'permission':permission})
        self.bridge.sessions[row.id]=row
        self.addCleanup(lambda:self.bridge.sessions.pop(row.id,None))
        return row

    def test_manual_guard_launch_binding_and_native_capture_only(self):
        row=self.launch_browser();agent=self.agent();tool=self.bridge.browser_tools
        with self.assertRaisesRegex(ValueError,'error_browser_manual'):tool.handle({'action':'screenshot','capability':agent.browser_key})
        self.assertEqual(['open'],self.calls)
        self.assertEqual('',self.bridge.session_events(row['id'],0,0)['data'])
        allow={'action':'allow','project_id':self.project['id'],'session_id':row['id'],'launch_id':row['launch_id']}
        with self.assertRaises(self.base.Problem):self.bridge.browser(dict(allow,launch_id=str(uuid.uuid4())))
        self.assertTrue(self.bridge.browser({'action':'status','project_id':self.project['id']})['session']['browser_manual'])
        self.assertFalse(self.bridge.browser(allow)['session']['browser_manual'])
        path=Path(tool.handle({'action':'screenshot','capability':agent.browser_key})['path'])
        self.assertTrue(path.read_bytes().startswith(b'\x89PNG'));self.assertEqual(0o600,stat.S_IMODE(path.stat().st_mode))
        for action in ('click','type','key'):
            with self.assertRaises(ValueError):tool.handle({'action':action,'capability':agent.browser_key})
        self.bridge.browser(dict(allow,action='manual'));self.assertFalse(path.exists())
        with self.assertRaises(ValueError):tool.handle({'action':'scroll','steps':3,'capability':agent.browser_key})

    def test_native_http_transport_is_authenticated_and_not_origin_accessible(self):
        import http.client,json
        for token,origin,expected in ((None,None,401),(self.bridge.token,'https://evil.invalid',403),(self.bridge.token,None,200)):
            connection=http.client.HTTPConnection('127.0.0.1',self.server.server_port,timeout=2)
            headers={}
            if token:headers['Authorization']='Bearer '+token
            if origin:headers['Origin']=origin
            connection.request('GET','/v1/ios/browser/commands',headers=headers)
            response=connection.getresponse();self.assertEqual(expected,response.status);response.read();connection.close()
        row=self.launch_browser()
        other=self.folder/'other';other.mkdir()
        project=self.bridge.register({'path':str(other),'create':False})
        with self.assertRaises(self.base.Problem):
            self.bridge.browser({'action':'allow','project_id':project['id'],'session_id':row['id'],'launch_id':row['launch_id']})

    def test_permission_and_project_isolation_and_no_reused_url_navigation(self):
        row=self.launch_browser();agent=self.agent('read-only');tool=self.bridge.browser_tools
        with self.assertRaisesRegex(ValueError,'error_browser_permission'):tool.handle({'action':'open','capability':agent.browser_key})
        with self.assertRaises(ValueError):tool.handle({'action':'status','capability':'wrong'})
        same=self.bridge.browser({'action':'start','project_id':self.project['id'],'request_id':str(uuid.uuid4()),'url':'https://other.example'})['session']
        self.assertEqual(row['id'],same['id']);self.assertEqual(['open','show'],self.calls)
        for url in ('javascript:alert(1)','https://user:password@example.com'):
            with self.assertRaises(self.base.Problem):self.bridge.browser({'action':'start','project_id':self.project['id'],'request_id':str(uuid.uuid4()),'url':url})
        self.assertIn('Only screenshots and scrolling',tool.child_environment('cap')['BIBIMER_BROWSER_INSTRUCTIONS'])
