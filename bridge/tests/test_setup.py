import fcntl
import importlib.util
import json
import os
from pathlib import Path
import shlex
import shutil
import socket
import subprocess
import sys
import time
import urllib.request
from unittest.mock import patch

from test_chat import ChatFixture

ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location('setup_connect', ROOT/'bridge/setup_connect.py')
setup = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(setup)


class SetupTests(ChatFixture):
    def test_existing_bridge_pairs_once_without_replacing_files_token_or_session(self):
        session = self.chat()
        self.message('approval')
        before = self.until(lambda event: bool(event['requests']))
        token = self.bridge.token
        path = ROOT/'bridge/bibimer_bridge.py'
        original = path.read_bytes()
        forbidden = self.root/'installer.sh'
        forbidden.write_text('exit 91\n')
        result = setup.connect(path,self.state,self.server.server_port,forbidden)
        self.assertEqual(1,result['protocol'])
        self.assertRegex(result['code'],r'^\d{8}$')
        self.assertNotIn(result['code'],(self.state/'pairing.json').read_text())
        status, paired = self.api('POST','/v1/pair',{'code':result['code']},auth=False)
        self.assertEqual(200,status)
        self.assertTrue(paired['token'] == token)
        self.assertEqual(403,self.api('POST','/v1/pair',{'code':result['code']},auth=False)[0])
        self.assertEqual(session.id,self.bridge.session.id)
        self.assertIsNone(session.process.poll())
        after = session.events(0,0)
        self.assertEqual(before['requests'],after['requests'])
        self.assertEqual(before['items'],after['items'])
        self.assertEqual(original,path.read_bytes())
        self.assertFalse((self.state/'pairing.json').exists())

    def test_missing_bridge_installs_once_and_busy_or_failed_setup_cannot_pair(self):
        path = self.root/'installed bridge.py'
        installer = self.root/'install.sh'
        marker = self.root/'installed-once'
        installer.write_text('set -eu\n[ "$BIBIMER_SKIP_START" = 1 ]\n[ "$BIBIMER_CLAUDE" = 0 ]\n' +
            'cp '+shlex.quote(str(ROOT/'bridge/bibimer_bridge.py'))+' '+shlex.quote(str(path))+'\n' +
            'printf x >> '+shlex.quote(str(marker))+'\n')
        for _ in range(2):
            result=setup.connect(path,self.state,self.server.server_port,installer)
            self.assertRegex(result['code'],r'^\d{8}$')
        self.assertEqual('x',marker.read_text())
        pairing=(self.state/'pairing.json').read_bytes()
        with (self.state/'setup.lock').open('a') as lock:
            fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
            with self.assertRaisesRegex(RuntimeError,'quick_busy'):
                setup.connect(path,self.state,self.server.server_port,installer)
        self.assertEqual(pairing,(self.state/'pairing.json').read_bytes())
        installer.write_text('exit 9\n')
        with self.assertRaisesRegex(RuntimeError,'quick_install_failed'):
            setup.connect(self.root/'missing.py',self.state,self.server.server_port,installer)
        self.assertEqual(pairing,(self.state/'pairing.json').read_bytes())

    def test_stopped_bridge_starts_and_can_pair_without_shell_code_scraping(self):
        state=self.root/'fresh-state'
        with socket.socket() as sock:
            sock.bind(('127.0.0.1',0)); port=sock.getsockname()[1]
        children=[]
        spawn=subprocess.Popen
        def track(*args,**kwargs):
            child=spawn(*args,**kwargs); children.append(child); return child
        with patch.object(setup.subprocess,'Popen',track):
            result=setup.connect(ROOT/'bridge/bibimer_bridge.py',state,port)
        token=json.loads((state/'token.json').read_text())
        opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
        try:
            request=urllib.request.Request(f'http://127.0.0.1:{port}/v1/pair',
                data=json.dumps({'code':result['code']}).encode(),headers={'Content-Type':'application/json'})
            with opener.open(request,timeout=5) as response:
                self.assertTrue(json.load(response)['token'] == token)
        finally:
            request=urllib.request.Request(f'http://127.0.0.1:{port}/v1/shutdown',data=b'{}',
                headers={'Authorization':'Bearer '+token,'Content-Type':'application/json'})
            with opener.open(request,timeout=5) as response: self.assertEqual(200,response.status)
            deadline=time.monotonic()+5
            while time.monotonic()<deadline:
                try:
                    with socket.create_connection(('127.0.0.1',port),timeout=.1): pass
                except OSError: break
                time.sleep(.05)
            else: self.fail('Owned test bridge did not stop')
            for child in children: child.wait(timeout=5)

    def test_bootstrap_handles_missing_python_and_bounds_intent_payload(self):
        template=(ROOT/'android/app/src/main/assets/quick-setup.sh').read_text()
        binaries=self.root/'bin'; binaries.mkdir()
        for name in ['mktemp','rm','cat']:
            (binaries/name).symlink_to(shutil.which(name))
        pkg=binaries/'pkg'
        pkg.write_text('#!'+sys.executable+'\nimport pathlib,sys\nassert sys.argv[1:]==["install","-y","python"]\n'+
            'pathlib.Path(__file__).with_name("python").symlink_to(sys.executable)\n')
        pkg.chmod(0o700)
        script=template.replace('__BIBIMER_INSTALLER__','exit 99').replace('__BIBIMER_CONNECT_HELPER__',
            'import pathlib,sys\np=pathlib.Path(sys.argv[2]); assert p.read_text().strip()=="exit 99"\nprint("controlled setup callback")')
        env={**os.environ,'PATH':str(binaries),'TMPDIR':str(self.root)}
        process=subprocess.run([shutil.which('bash'),'--noprofile','--norc','-s'],input=script,text=True,
            capture_output=True,env=env,timeout=5)
        self.assertEqual((0,'controlled setup callback\n',''),(process.returncode,process.stdout,process.stderr))
        (binaries/'python').unlink()
        pkg.write_text('#!'+shutil.which('sh')+'\nexit 1\n')
        process=subprocess.run([shutil.which('bash'),'-s'],input=script,text=True,capture_output=True,env=env,timeout=5)
        self.assertEqual(1,process.returncode)
        self.assertEqual({'error':'quick_python_failed'},json.loads(process.stdout))
        self.assertEqual('',process.stderr)
        spec=importlib.util.spec_from_file_location('build_setup',ROOT/'scripts/build_apk.py')
        build=importlib.util.module_from_spec(spec); spec.loader.exec_module(build)
        build.SRC=self.root/'generated-assets'
        (build.SRC/'assets').mkdir(parents=True)
        installer=build.installer()
        full=template.replace('__BIBIMER_INSTALLER__',installer).replace('__BIBIMER_CONNECT_HELPER__',(ROOT/'bridge/setup_connect.py').read_text())
        self.assertLess(len(full.encode('utf-16-le')),440000)
        subprocess.run([shutil.which('bash'),'-n'],input=full,text=True,check=True,capture_output=True)

        # Exercise the generated installer payload without touching the real HOME,
        # installing packages, or starting/restarting a bridge.
        payload = installer.split("<<'BIBIMER_PYTHON'\n", 1)[1].split("\nBIBIMER_PYTHON", 1)[0]
        isolated = self.root/'install-target'; isolated.mkdir()
        with patch.object(Path, 'home', return_value=isolated):
            exec(compile(payload, '<isolated-installer>', 'exec'), {})
        destination = isolated/'.local/share/bibimer'
        for name in ['bibimer_bridge.py', 'provider_opencode.py', 'provider_claude.mjs', 'repair_claude_termux.py']:
            self.assertEqual((ROOT/'bridge'/name).read_bytes(), (destination/name).read_bytes())
            self.assertEqual(0o700, (destination/name).stat().st_mode & 0o777)
        import hashlib
        digest = hashlib.sha256((ROOT/'bridge/bibimer_bridge.py').read_bytes()).hexdigest()
        damaged = payload.replace(digest, '0' * 64)
        with patch.object(Path, 'home', return_value=isolated), self.assertRaises(SystemExit):
            exec(compile(damaged, '<damaged-installer>', 'exec'), {})
        self.assertEqual((ROOT/'bridge/bibimer_bridge.py').read_bytes(), (destination/'bibimer_bridge.py').read_bytes())
