"""Fictional Codex launcher only; no installed accounts, models or npm operations."""
import errno
import shutil
import subprocess
import time
import uuid
from unittest.mock import patch

from test_bridge import BridgeTestCase, module


class CodexLauncherTests(BridgeTestCase):
    def setUp(self):
        super().setUp()
        self.node = shutil.which("node")
        if not self.node:
            self.skipTest("Node is required for the isolated npm launcher fixture")
        self.package = self.root / "global packages" / "bin"
        self.package.mkdir(parents=True)
        self.entry = (self.package / "codex.js").resolve()
        self.entry.write_text('''#!/usr/bin/env node
const args=process.argv.slice(2);
if(args[0]==="--version"){console.log("codex-cli 0.163.0");}
else if(args[0]!=="app-server"){console.log("fixture-terminal:"+JSON.stringify(args));}
else require("node:readline").createInterface({input:process.stdin}).on("line",line=>{
 const q=JSON.parse(line);if(q.method==="initialized")return;
 if(!["initialize","account/read"].includes(q.method))throw Error("No model or login calls allowed");
 console.log(JSON.stringify({id:q.id,result:q.method==="account/read"?{account:null}:{}}));
});
''')
        self.entry.chmod(0o700)
        self.launcher = self.root / "codex"
        self.launcher.symlink_to(self.entry)
        lookup = patch.object(self.bridge, "agent_executable", return_value=str(self.launcher))
        lookup.start()
        self.addCleanup(lookup.stop)

    def call(self, action):
        return self.api("POST", "/v1/agent-connections", {
            "agent":"codex", "action":action,
            **({"request_id":str(uuid.uuid4())} if action == "terminal" else {})})

    def test_npm_launcher_uses_installed_node_for_chat_and_terminal_arguments(self):
        command = module.provider_command(str(self.launcher), "codex")
        self.assertEqual([self.node, str(self.entry), "app-server", "--listen", "stdio://"], command)
        options = module.agent_options("codex", {"permission":"inherit", "model":"model with spaces"})
        self.assertEqual([self.node, str(self.entry), "--model", "model with spaces"],
                         module.terminal_command([str(self.launcher)], "codex", options))

    def test_account_version_and_update_probe_work_without_shebang_execution(self):
        original = subprocess.Popen

        def missing_interpreter(argv, *args, **kwargs):
            if argv[0] == str(self.launcher):
                raise FileNotFoundError(errno.ENOENT, "Missing shebang interpreter", str(self.launcher))
            return original(argv, *args, **kwargs)

        with patch.object(module.subprocess, "Popen", side_effect=missing_interpreter):
            status, account = self.call("status")
            self.assertEqual(200, status, account)
            self.assertTrue(account["installed"])
            self.assertEqual("signed_out", account["state"])
            status, version = self.call("version")
            self.assertEqual(200, status, version)
            self.assertEqual("0.163.0", version["version"])
            self.assertEqual("0.163.0", self.bridge.agent_updates.probe(str(self.launcher), "codex"))
        self.assertFalse(self.bridge.sessions)

    def output(self, session):
        end = time.monotonic() + 5
        while session.process.poll() is None and time.monotonic() < end:
            time.sleep(.01)
        session.process.wait(timeout=1)
        session.reader.join(timeout=2)
        return bytes(session.buffer).decode()

    def test_normal_terminal_and_separate_login_pty_keep_native_arguments(self):
        self.register()
        status, data = self.api("POST", "/v1/sessions", {
            "agent":"codex", "mode":"terminal", "new_session":True,
            "request_id":str(uuid.uuid4()), "options":{"permission":"inherit"}})
        self.assertEqual(200, status, data)
        session = self.bridge.get_session(data["session"]["id"])
        self.assertEqual([self.node, str(self.entry)], session.process.args[3:])
        self.assertIn('fixture-terminal:[]', self.output(session))
        status, data = self.call("terminal")
        self.assertEqual(200, status, data)
        session = self.bridge.get_session(data["session"]["id"])
        self.assertEqual([self.node, str(self.entry), "login"], session.process.args[3:])
        self.assertIn('fixture-terminal:["login"]', self.output(session))

    def test_missing_node_keeps_original_failure_instead_of_running_other_tools(self):
        with patch.object(module.shutil, "which", return_value=None):
            self.assertEqual([str(self.launcher), "app-server", "--listen", "stdio://"],
                             module.provider_command(str(self.launcher), "codex"))

    def test_non_node_launcher_and_native_binary_keep_direct_execution(self):
        for header in [b"#!/bin/sh\n", b"#!/usr/bin/env python3\n", b"\x7fELF\x00"]:
            self.entry.write_bytes(header)
            self.assertEqual([str(self.launcher), "app-server", "--listen", "stdio://"],
                             module.provider_command(str(self.launcher), "codex"))
        self.entry.unlink()
        self.assertEqual([str(self.launcher), "app-server", "--listen", "stdio://"],
                         module.provider_command(str(self.launcher), "codex"))
