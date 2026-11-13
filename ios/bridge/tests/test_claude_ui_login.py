"""Review the pinned CLI adaptation without executing Node or accessing accounts."""
import json
import os
import select
import shutil
import subprocess
import termios
import time
from pathlib import Path
import stat
import unittest
from unittest.mock import Mock, patch

import test_ios_bridge as fixtures

LOGIN = '''#!/usr/bin/env node
const require = createRequire(import.meta.url);
async function Jaz(){let $=K?"sso":void 0,j=new Et;try{let H=await j.startOAuthFlow(async(X)=>{process.stdout.write(`Opening browser to sign in…
`),process.stdout.write(`If the browser didn't open, visit: ${X}
`)},{loginWithClaudeAi:A,loginHint:q,loginMethod:$,orgUUID:O});await fX6(H)}finally{j.cleanup()}}
async function Xaz(){}
'''


class ClaudeUILoginTests(unittest.TestCase):
    def setUp(self):
        fixtures.ClaudeReceiptTests.setUp(self)
        self.addCleanup(self.temp.cleanup)
        self.cli.write_text(LOGIN)

    def test_prepare_preserves_original_cli_and_caches_private_adaptation(self):
        wrapper = self.wrapper.read_text()
        target = fixtures.entry.prepare_claude_ui_login(self.state, str(self.wrapper), self.folder)
        prepared = target.read_text()
        self.assertEqual(LOGIN, self.cli.read_text())
        self.assertEqual(wrapper, self.wrapper.read_text())
        self.assertEqual(0o700, stat.S_IMODE(target.stat().st_mode))
        self.assertIn('j.handleManualAuthCodeInput', prepared)
        self.assertIn('skipBrowserOpen:true', prepared)
        self.assertIn('finally{bibimerInput?.close();j.cleanup()}', prepared)
        self.assertIn(json.dumps(self.cli.as_uri()), prepared)
        self.assertIn('bibimerParts[1]!==bibimerState', prepared)
        self.assertIn('await fX6(H)', prepared, 'The original CLI still persists native credentials')
        before = target.stat().st_mtime_ns
        self.assertEqual(target, fixtures.entry.prepare_claude_ui_login(self.state, str(self.wrapper), self.folder))
        self.assertEqual(before, target.stat().st_mtime_ns)

    def test_unknown_cli_or_login_contract_is_rejected(self):
        for text in (LOGIN.replace('orgUUID:O','orgUUID:CHANGED'), LOGIN.replace('async function Jaz(', 'async function renamed(')):
            self.cli.write_text(text)
            with self.assertRaises(RuntimeError):
                fixtures.entry.prepare_claude_ui_login(self.state, str(self.wrapper), self.folder)
        self.cli.write_text(LOGIN)
        self.cli.with_name('package.json').write_text(json.dumps({'version':'9.9.9'}))
        with self.assertRaises(RuntimeError):
            fixtures.entry.prepare_claude_ui_login(self.state, str(self.wrapper), self.folder)
        self.assertFalse(list(self.state.glob('claude-login-*.mjs')))

    def test_cached_symlink_cannot_redirect_the_generated_adapter_write(self):
        target = fixtures.entry.prepare_claude_ui_login(self.state, str(self.wrapper), self.folder)
        innocent = self.folder / 'preserve.txt'; innocent.write_text('preserve')
        target.unlink(); target.symlink_to(innocent)
        fixtures.entry.prepare_claude_ui_login(self.state, str(self.wrapper), self.folder)
        self.assertFalse(target.is_symlink()); self.assertEqual('preserve', innocent.read_text())

    def test_native_login_uses_private_adapter_and_selected_console_method(self):
        factory = Mock(return_value=self.state / 'private-login.mjs')
        base = fixtures.entry.adapt(self.base, claude_login=factory)
        with patch.object(base.subprocess, 'Popen') as spawn, patch.object(base.threading, 'Thread'):
            base.NativeLoginClient(str(self.wrapper), str(self.folder), 'claude', 'console')
        factory.assert_called_once_with(str(self.wrapper))
        self.assertEqual([str(self.state / 'private-login.mjs'), 'auth', 'login', '--console'], spawn.call_args.args[0])
        self.assertFalse(list(self.folder.glob('*.json')), 'No credentials or login reports are written by the adapter')

    @unittest.skipUnless(shutil.which('node'), 'Node is required for the real readline/PTY boundary')
    def test_reviewed_handler_in_owned_pty_has_no_code_echo_and_exits(self):
        # Exercise the actual transformed callback/readline code with a local
        # synthetic native OAuth object. No browser/network/credentials exist.
        before = r'''import {createRequire} from 'node:module';
const K=false,A=true,q=undefined,O=undefined;
class Et {
 async startOAuthFlow(callback,options) {
  if(options.skipBrowserOpen!==true)throw Error('browser must stay closed');
  await callback('https://claude.ai/oauth/authorize?state=fixture-state');
  return await new Promise(resolve=>{this.complete=resolve;});
 }
 handleManualAuthCodeInput(value) {
  if(this.called)throw Error('duplicate code');this.called=true;
  if(value.authorizationCode!=='fictional-private-code'||value.state!=='fixture-state')throw Error('bad native input');
  this.complete({});
 }
 cleanup() {}
}
async function fX6() { process.stdout.write('AUTH_SAVED\n'); }
'''
        target=self.folder/'synthetic-login.mjs'
        target.write_text(fixtures.entry.claude_ui_login_source(before+LOGIN.removeprefix('#!/usr/bin/env node\n')+'\nawait Jaz();\n',self.cli.as_uri()))
        target.chmod(0o700)
        base=fixtures.entry.adapt(self.base,claude_login=lambda executable:target)
        for state,expected in [('fixture-state',0),('wrong-state',1)]:
            master,slave=os.openpty()
            argv=base._ios_authentication_command('/fictional/claude','claude')
            # Run Node explicitly so this test does not rely on a shell's PATH.
            argv[argv.index(str(target)):]=[shutil.which('node'),str(target),'auth','login']
            process=subprocess.Popen(argv,stdin=slave,stdout=slave,stderr=slave,start_new_session=True)
            os.close(slave);raw=b''
            try:
                until=time.monotonic()+10
                while b'Paste code here' not in raw and time.monotonic()<until:
                    if select.select([master],[],[],.1)[0]:raw+=os.read(master,65536)
                self.assertIn(b'Paste code here',raw)
                code=('fictional-private-code#'+state+'\r').encode()
                if expected==0:code+=code  # A second line must never submit twice.
                os.write(master,code)
                while time.monotonic()<until:
                    if select.select([master],[],[],.1)[0]:
                        try:chunk=os.read(master,65536)
                        except OSError:break
                        if not chunk:break
                        raw+=chunk
                    if process.poll() is not None:break
                self.assertEqual(expected,process.wait(timeout=2),raw)
                self.assertNotIn(b'fictional-private-code',raw)
                self.assertEqual(1 if expected==0 else 0,raw.count(b'AUTH_SAVED'))
            finally:
                if process.poll() is None:process.kill();process.wait()
                os.close(master)
        other_master,other_slave=os.openpty()
        try:self.assertTrue(termios.tcgetattr(other_slave)[3]&termios.ECHO)
        finally:os.close(other_master);os.close(other_slave)


if __name__ == '__main__':
    unittest.main()
