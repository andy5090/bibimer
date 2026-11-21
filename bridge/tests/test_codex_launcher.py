"""Exercise npm launchers without relying on Android shebang rewriting."""
import shutil
import uuid
from unittest.mock import patch

from test_bridge import BridgeTestCase, module


class CodexLauncherTests(BridgeTestCase):
    def setUp(self):
        super().setUp()
        if not shutil.which("node"):
            self.skipTest("Node.js is required for the npm launcher fixture")
        self.entry = self.root / "codex.js"
        self.entry.write_text('''#!/missing-android-env node
const args = process.argv.slice(2);
if (args[0] === '--version') {
  console.log('codex-cli 0.163.0');
} else if (args[0] === 'app-server') {
  require('node:readline').createInterface({input:process.stdin}).on('line', line => {
    const request = JSON.parse(line);
    if (request.method === 'initialized') return;
    if (!['initialize', 'account/read'].includes(request.method)) process.exit(2);
    const result = request.method === 'account/read' ? {account:null} : {};
    console.log(JSON.stringify({id:request.id, result}));
  });
} else {
  console.log(args[0] === 'login' ? 'FIXTURE_LOGIN' : 'FIXTURE_TERMINAL');
}
''')
        self.entry.chmod(0o700)
        self.link = self.root / "codex"
        self.link.symlink_to(self.entry)
        self.lookup = patch.object(self.bridge, "agent_executable", return_value=str(self.link))
        self.lookup.start()
        self.addCleanup(self.lookup.stop)

    def test_version_account_and_update_probe_use_node_for_npm_symlink(self):
        for action in ["version", "status"]:
            status, result = self.api("POST", "/v1/agent-connections", {"agent":"codex", "action":action})
            self.assertEqual(200, status, result)
            self.assertTrue(result["installed"])
            self.assertEqual("0.163.0" if action == "version" else "signed_out",
                             result["version" if action == "version" else "state"])
        self.assertEqual("0.163.0", self.bridge.agent_updates.probe(str(self.link), "codex"))
        self.assertFalse(self.bridge.sessions)

    def test_terminal_and_login_terminal_use_node(self):
        self.register()
        status, result = self.api("POST", "/v1/sessions", {
            "agent":"codex", "mode":"terminal", "request_id":str(uuid.uuid4())})
        self.assertEqual(200, status, result)
        self.output_until(result["session"]["id"], b"FIXTURE_TERMINAL")
        status, result = self.api("POST", "/v1/agent-connections", {
            "agent":"codex", "action":"terminal", "request_id":str(uuid.uuid4())})
        self.assertEqual(200, status, result)
        self.output_until(result["session"]["id"], b"FIXTURE_LOGIN")

    def test_native_or_custom_wrapper_is_preserved_and_missing_node_is_reported(self):
        wrapper = self.root / "native-codex"
        wrapper.write_text("fictional native wrapper")
        self.assertEqual([str(wrapper)], module.agent_command(str(wrapper), "codex"))
        self.assertEqual([str(self.link)], module.agent_command(str(self.link), "claude"))
        with patch.object(module.shutil, "which", return_value=None):
            with self.assertRaises(module.Problem) as error:
                module.agent_command(str(self.link), "codex")
        self.assertEqual("error_program_missing", error.exception.code)
