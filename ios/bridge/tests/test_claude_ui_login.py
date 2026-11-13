"""Review the pinned CLI adaptation without executing Node or accessing accounts."""
import json
import os
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


if __name__ == '__main__':
    unittest.main()
