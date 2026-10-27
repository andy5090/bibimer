"""Fictional native accounts only; never reads this phone's credentials or calls a model."""
import json
import os
from pathlib import Path
import subprocess
import sys
import time
import uuid
from unittest.mock import patch
from test_bridge import BridgeTestCase, module

CODEX = r'''
import json,sys,pathlib
root=pathlib.Path(__file__).parent
login=None
for line in sys.stdin:
 v=json.loads(line);m=v.get('method');p=v.get('params',{})
 if m=='initialized':continue
 if m=='initialize':r={}
 elif m=='account/read':
  if login and (root/'complete').exists():
   print(json.dumps({'method':'account/login/completed','params':{'loginId':login,'success':True,'error':'PRIVATE_NATIVE_ERROR'}}),flush=True)
  r={'account':{'type':'chatgpt','email':'PRIVATE_EMAIL','accessToken':'PRIVATE_TOKEN'}}
 elif m=='account/login/start':
  if p['type']=='apiKey':
   (root/'native-key').write_text(p['apiKey']);r={'type':'apiKey'}
  else:
   login='native-login';r={'type':'chatgpt','authUrl':'https://auth.example.test/login?state=PRIVATE_STATE','loginId':login}
 elif m=='account/login/cancel':r={}
 else:raise RuntimeError('Model/session APIs must not run')
 print(json.dumps({'id':v.get('id'),'result':r}),flush=True)
'''
OPENCODE = r'''
import json,sys,http.server,pathlib,time
root=pathlib.Path(__file__).parent
if sys.argv[1:] == ['--version']:
 print('opencode 1.17.13 PRIVATE_VERSION_DETAIL');sys.exit()
assert sys.argv[1]=='serve'
class H(http.server.BaseHTTPRequestHandler):
 def log_message(self,*a):pass
 def do_GET(self):
  route=self.path.split('?')[0]
  if route=='/provider':v={'all':[{'id':'test','name':'Test <b>literal</b>','models':{},'secret':'PRIVATE_TOKEN'},{'id':'../unsafe','name':'unsafe'}],'connected':['test'],'default':{'PRIVATE_TOKEN':'PRIVATE_TOKEN'}}
  elif route=='/provider/auth':v={'test':[{'type':'api','label':'API key'},{'type':'oauth','label':'Browser'},{'type':'oauth','label':'Native form','prompts':[{'type':'text','key':'private'}]},{'type':'oauth','label':'Automatic browser'}]}
  else:raise RuntimeError('Unexpected read')
  self.send_response(200);self.end_headers();self.wfile.write(json.dumps(v).encode())
 def do_PUT(self):
  assert self.path.split('?')[0]=='/auth/test'
  v=json.loads(self.rfile.read(int(self.headers['Content-Length'])))
  assert v['type']=='api';(root/'native-key').write_text(v['key'])
  self.send_response(200);self.end_headers();self.wfile.write(b'true')
 def do_POST(self):
  route=self.path.split('?')[0];v=json.loads(self.rfile.read(int(self.headers['Content-Length'])))
  if route=='/provider/test/oauth/authorize':r={'url':'https://auth.example.test/login','method':'auto' if v['method']==3 else 'code','instructions':'Enter the code yourself'}
  elif route=='/provider/test/oauth/callback':
   assert v['method']==3 or v['code']=='fictional-code'
   (root/'callback-complete').write_text('ok');r=True
  else:raise RuntimeError('Model/session APIs must not run')
  self.send_response(200);self.end_headers();self.wfile.write(json.dumps(r).encode())
s=http.server.ThreadingHTTPServer(('127.0.0.1',0),H)
print('http://127.0.0.1:'+str(s.server_port),flush=True);s.serve_forever()
'''

class ConnectionTests(BridgeTestCase):
 def setUp(self):
  super().setUp();self.bin=self.root/'bin';self.bin.mkdir()
  sources={'codex':CODEX,'opencode':OPENCODE,'claude':"import json,sys\nprint('2.1.283 PRIVATE_DETAIL' if '--version' in sys.argv else json.dumps({'loggedIn':True,'authMethod':'api_key','secret':'PRIVATE_TOKEN','email':'PRIVATE_EMAIL'}))",'gemini':"print('0.58.0 PRIVATE_DETAIL')"}
  for agent,source in sources.items():
   p=self.bin/agent;p.write_text('#!'+sys.executable+'\n'+source);p.chmod(0o700)
  self.lookup=patch.object(self.bridge,'agent_executable',side_effect=lambda a:str(self.bin/a));self.lookup.start();self.addCleanup(self.lookup.stop)
 def call(self,agent='codex',action='status',**params):return self.api('POST','/v1/agent-connections',dict(agent=agent,action=action,**params))
 def start(self,agent='codex',method='chatgpt',**params):
  status,result=self.call(agent,'start',method=method,request_id=str(uuid.uuid4()),**params);self.assertEqual(200,status,result);return result['job']
 def test_status_versions_are_allowlisted_without_project_session_or_credentials(self):
  for agent in ['codex','claude','opencode','gemini']:
   status,result=self.call(agent);self.assertEqual(200,status,result)
   self.assertNotIn('PRIVATE_',json.dumps(result));self.assertFalse(self.bridge.sessions)
   if agent=='gemini':self.assertEqual('unknown',result['state'])
   if agent=='opencode':
    self.assertEqual(['test'],[r['id'] for r in result['providers']]);self.assertFalse(result['providers'][0]['methods'][2]['supported'])
  for agent,version in [('opencode','1.17.13'),('claude','2.1.283'),('gemini','0.58.0')]:
   status,result=self.call(agent,'version');self.assertEqual(200,status,result);self.assertEqual(version,result['version']);self.assertNotIn('PRIVATE_',json.dumps(result))
 def test_authentication_route_validation_and_unsupported_methods(self):
  self.assertEqual(401,self.api('POST','/v1/agent-connections',{},auth=False)[0])
  for payload in [{'agent':'shell','action':'status'},{'agent':'codex','action':'arbitrary'},{'agent':'codex','action':'status','project_id':'missing'},{'agent':'claude','action':'start','request_id':str(uuid.uuid4())}]:
   status,result=self.api('POST','/v1/agent-connections',payload);self.assertIn(status,[400,404],result)
  self.assertFalse(self.bridge.sessions)
 def test_key_goes_to_native_store_only_and_same_request_is_idempotent(self):
  for agent,method,extra in [('codex','apiKey',{}),('opencode','0',{'provider':'test'})]:
   payload=dict(request_id=str(uuid.uuid4()),method=method,key='fictional-private-key',**extra)
   status,result=self.call(agent,'start',**payload);self.assertEqual(200,status,result);self.assertEqual('saved',result['job']['status'])
   self.assertNotIn('fictional-private-key',json.dumps(result));self.assertEqual('fictional-private-key',(self.bin/'native-key').read_text())
   self.assertEqual(result,self.call(agent,'start',**payload)[1])
   self.assertEqual(409,self.call(agent,'start',**dict(payload,key='different-key'))[0])
  metadata=(self.state/'metadata.json').read_text() if (self.state/'metadata.json').exists() else ''
  self.assertNotIn('fictional-private-key',metadata);self.assertFalse(self.bridge.sessions)
 def test_codex_login_needs_matching_completion_and_can_recover_pending_job(self):
  job=self.start();self.assertEqual('pending',job['status']);self.assertEqual(job,self.call()[1]['job'])
  self.assertEqual('pending',self.call(action='poll',id=job['id'])[1]['job']['status'])
  self.assertEqual(409,self.call(action='start',method='chatgpt',request_id=str(uuid.uuid4()))[0])
  (self.bin/'complete').write_text('ok')
  job=self.call(action='poll',id=job['id'])[1]['job'];self.assertEqual('saved',job['status']);self.assertNotIn('url',job)
 def test_cancel_expiry_and_project_scope_never_stop_existing_session(self):
  self.register();project=self.bridge.project['id'];job=self.start(project_id=project)
  self.assertEqual(409,self.call(action='poll',id=job['id'])[0])
  status,result=self.call(action='cancel',id=job['id'],project_id=project);self.assertEqual(200,status,result);self.assertEqual('cancelled',result['job']['status'])
  job=self.start(project_id=project);self.bridge.agent_connections.jobs['codex']['expires_at']=0
  self.assertEqual('expired',self.call(action='poll',id=job['id'],project_id=project)[1]['job']['status'])
  self.assertFalse(self.bridge.sessions)
 def test_opencode_browser_code_and_automatic_callback(self):
  for method in ['1','3']:
   job=self.start('opencode',method,provider='test');self.assertEqual('pending',job['status'])
   if method=='1':
    status,result=self.call('opencode','code',id=job['id'],code='fictional-code');self.assertEqual(200,status,result)
   end=time.monotonic()+3
   while time.monotonic()<end:
    status,result=self.call('opencode','poll',id=job['id'])
    if result.get('job',{}).get('status')!='pending':break
    time.sleep(.03)
   self.assertEqual('saved',result['job']['status'],result);self.assertTrue((self.bin/'callback-complete').exists())
 def test_native_forms_and_url_injection_are_rejected(self):
  status,result=self.call('opencode','start',method='2',provider='test',request_id=str(uuid.uuid4()));self.assertEqual(400,status,result)
  status,result=self.call('opencode','start',method='0',provider='../test',key='fictional-key',request_id=str(uuid.uuid4()));self.assertEqual(400,status,result)
  for url in ['http://example.test','https://user:pass@example.test','javascript:alert(1)','https://example.test/\nsecret']:
   with self.assertRaises(ValueError):module.AgentConnections.login_url(url)
 def test_service_shutdown_closes_only_its_pending_process(self):
  job=self.start();process=self.bridge.agent_connections.jobs['codex']['client'].process
  self.assertIsNone(process.poll());self.bridge.agent_connections.close();self.assertIsNotNone(process.poll());self.assertFalse(self.bridge.sessions)
