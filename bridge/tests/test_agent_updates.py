"""Isolated fake installers only. Never updates this phone's tools or credentials."""
import base64
import hashlib
import io
import json
from pathlib import Path
import sys
import tarfile
import time
import uuid
from unittest.mock import patch
from test_bridge import BridgeTestCase, module

class UpdateTests(BridgeTestCase):
 def setUp(self):
  super().setUp()
  self.bin=self.root/'updates-bin';self.bin.mkdir()
  self.global_root=self.root/'global/node_modules';self.global_root.mkdir(parents=True)
  self.package=self.global_root/'@mmmbuto/codex-cli-termux';self.package.mkdir(parents=True)
  self.manifest=self.package/'package.json';self.manifest.write_text(json.dumps({'name':'@mmmbuto/codex-cli-termux','version':'0.160.0-termux.1'}))
  self.entry=self.package/'codex';self.entry.write_text('#!'+sys.executable+'\nimport pathlib,json,sys,time\nif "--version" in sys.argv:print(json.loads(pathlib.Path(__file__).resolve().with_name("package.json").read_text())["version"])\nelse:time.sleep(30)\n');self.entry.chmod(0o700)
  self.executable=self.bin/'codex';self.executable.symlink_to(self.entry)
  self.npm=self.bin/'npm';self.npm.write_text('#!'+sys.executable+'\nimport pathlib,sys,json,time\nroot=pathlib.Path('+repr(str(self.global_root))+')\nif sys.argv[1:]==["root","--global"]:print(root);sys.exit()\nassert sys.argv[1:]==["install","--global","@mmmbuto/codex-cli-termux@0.161.0-termux.2","--registry=https://registry.npmjs.org","--no-audit","--no-fund"]\n(root/"count").write_text((root/"count").read_text()+"1" if (root/"count").exists() else "1")\nwhile (root/"hold").exists():time.sleep(.01)\np=root/"@mmmbuto/codex-cli-termux/package.json"\nx=json.loads(p.read_text());x["version"]="0.161.0-termux.2";p.write_text(json.dumps(x))\n');self.npm.chmod(0o700)
  self.up=self.bridge.agent_updates
  self.patches=[patch.object(self.bridge,'agent_executable',return_value=str(self.executable)),patch.object(self.up,'npm',return_value=[str(self.npm)]),patch.object(self.up,'metadata',return_value={'name':'@mmmbuto/codex-cli-termux','version':'0.161.0-termux.2','dist':{}})]
  for p in self.patches:p.start();self.addCleanup(p.stop)
 def call(self,action,**kw):return self.api('POST','/v1/agent-updates',dict(agent='codex',action=action,**kw))
 def check(self):
  status,result=self.call('check');self.assertEqual(200,status,result);return result['plan']
 def wait(self,job):
  end=time.monotonic()+5
  while time.monotonic()<end:
   status,result=self.call('poll',id=job['id']);self.assertEqual(200,status,result)
   if result['job']['status'] in {'succeeded','failed'}:return result['job']
   time.sleep(.02)
  self.fail('fake update did not finish')
 def test_check_is_read_only_and_update_pins_same_package_and_verifies_version(self):
  sentinel=self.root/'fake-auth.json';sentinel.write_text('PRIVATE_CREDENTIAL_FIXTURE')
  plan=self.check();self.assertTrue(plan['supported']);self.assertTrue(plan['available']);self.assertEqual('npm',plan['method']);self.assertFalse((self.global_root/'count').exists())
  key=str(uuid.uuid4());payload=dict(plan_id=plan['id'],request_id=key,command='ignored arbitrary command',version='99.0.0')
  status,result=self.call('start',**payload);self.assertEqual(200,status,result)
  done=self.wait(result['job']);self.assertEqual('succeeded',done['status']);self.assertEqual('0.161.0-termux.2',done['installed_version'])
  self.assertEqual('1',(self.global_root/'count').read_text());self.assertEqual(result['job']['id'],self.call('start',**payload)[1]['job']['id']);self.assertEqual('1',(self.global_root/'count').read_text())
  self.assertEqual('PRIVATE_CREDENTIAL_FIXTURE',sentinel.read_text());self.assertNotIn('PRIVATE',json.dumps(done));self.assertFalse(self.bridge.sessions)
 def test_running_sessions_block_without_termination_and_update_blocks_new_launch(self):
  existing=self.launch();self.bridge.get_session(existing).agent='codex'
  plan=self.check();self.assertTrue(plan['blocked']);self.assertEqual(409,self.call('start',plan_id=plan['id'],request_id=str(uuid.uuid4()))[0]);self.assertEqual('running',self.bridge.get_session(existing).state)
  self.bridge.get_session(existing).agent='shell'
  hold=self.global_root/'hold';hold.touch();plan=self.check();key=str(uuid.uuid4())
  status,result=self.call('start',plan_id=plan['id'],request_id=key);self.assertEqual(200,status,result)
  self.assertEqual(result['job']['id'],self.call('start',plan_id=plan['id'],request_id=key)[1]['job']['id'])
  self.assertEqual(409,self.api('POST','/v1/sessions',dict(agent='codex',mode='terminal',new_session=True,request_id=str(uuid.uuid4())))[0])
  self.assertEqual(409,self.api('POST','/v1/agent-connections',dict(agent='codex',action='start',method='chatgpt',request_id=str(uuid.uuid4())))[0])
  with self.assertRaises(module.Problem):self.bridge.begin_shutdown()
  hold.unlink();self.assertEqual('succeeded',self.wait(result['job'])['status']);self.assertEqual('running',self.bridge.get_session(existing).state)
 def test_auth_validation_stale_plan_and_major_migration_are_rejected(self):
  self.assertEqual(401,self.api('POST','/v1/agent-updates',{},auth=False)[0])
  for payload in [{'agent':'shell','action':'check'},{'agent':'codex','action':'arbitrary'}]:self.assertEqual(400,self.api('POST','/v1/agent-updates',payload)[0])
  plan=self.check();self.entry.write_text(self.entry.read_text()+'\n# changed\n')
  self.assertEqual(409,self.call('start',plan_id=plan['id'],request_id=str(uuid.uuid4()))[0])
  with patch.object(self.up,'metadata',return_value={'version':'1.0.0','dist':{}}):
   plan=self.check();self.assertFalse(plan['supported']);self.assertFalse(plan['available'])
  self.assertFalse((self.global_root/'count').exists())
 def test_installer_exit_zero_without_target_version_is_failure(self):
  plan=self.check()
  with patch.object(self.up,'run',return_value=None):
   status,result=self.call('start',plan_id=plan['id'],request_id=str(uuid.uuid4()));self.assertEqual(200,status,result)
   self.assertEqual('failed',self.wait(result['job'])['status'])
  self.assertEqual('0.160.0-termux.1',json.loads(self.manifest.read_text())['version'])
  self.assertFalse((self.global_root/'count').exists())
 def test_unknown_installation_is_not_overwritten(self):
  other=self.root/'unknown';other.write_text('#!'+sys.executable+'\nprint("0.1.0")\n');other.chmod(0o700)
  with patch.object(self.bridge,'agent_executable',return_value=str(other)):
   plan=self.check();self.assertFalse(plan['supported']);self.assertEqual(400,self.call('start',plan_id=plan['id'],request_id=str(uuid.uuid4()))[0])
  self.assertTrue(other.exists());self.assertFalse((self.global_root/'count').exists())
 def test_download_checks_integrity_and_rejects_external_registry(self):
  content=b'fictional archive';integrity='sha512-'+base64.b64encode(hashlib.sha512(content).digest()).decode();target=self.root/'archive'
  plan={'dist':{'tarball':'https://registry.npmjs.org/fixed/-/fixed-1.0.0.tgz','integrity':integrity}}
  with patch.object(module.urllib.request,'urlopen',return_value=io.BytesIO(content)):
   self.up.download(plan,target);self.assertEqual(content,target.read_bytes())
  with patch.object(module.urllib.request,'urlopen',return_value=io.BytesIO(b'tampered')):
   with self.assertRaises(ValueError):self.up.download(plan,target)
  plan['dist']['tarball']='https://attacker.example/archive'
  with self.assertRaises(ValueError):self.up.download(plan,target)
 def test_managed_opencode_verifies_before_atomic_launcher_swap(self):
  prefix=self.root/'prefix';(prefix/'glibc/lib').mkdir(parents=True);(prefix/'glibc/lib/ld-linux-aarch64.so.1').write_bytes(b'LOADER')
  home=self.root/'fake-home';home.mkdir();wrapper=home/'opencode';original='#!/bin/sh\nexec proot old-loader old-binary "$@"\n';wrapper.write_text(original);wrapper.chmod(0o700)
  plan={'kind':'opencode-proot','latest':'1.2.3','executable':str(wrapper),'wrapper':original,'loader':'old-loader','binary':'old-binary','dist':{}}
  def archive(plan,target):
   with tarfile.open(target,'w:gz') as bundle:
    data=b'FAKE_OPENCODE';entry=tarfile.TarInfo('package/bin/opencode');entry.size=len(data);bundle.addfile(entry,io.BytesIO(data))
  with patch.object(Path,'home',return_value=home),patch.object(module.sys,'prefix',str(prefix)),patch.object(self.up,'download',side_effect=archive),patch.object(self.up,'probe',return_value='0.0.0'):
   with self.assertRaises(ValueError):self.up.native_install(plan)
   self.assertEqual(original,wrapper.read_text())
  with patch.object(Path,'home',return_value=home),patch.object(module.sys,'prefix',str(prefix)),patch.object(self.up,'download',side_effect=archive),patch.object(self.up,'probe',return_value='1.2.3'):
   self.up.native_install(plan)
  self.assertNotIn('old-loader',wrapper.read_text());self.assertNotIn('old-binary',wrapper.read_text())
  concat=next((home/'.local/share/bibimer/opencode-runtime').glob('*.ld'));self.assertEqual(b'LOADERFAKE_OPENCODE',concat.read_bytes())
