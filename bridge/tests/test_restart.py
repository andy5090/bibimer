import json
from pathlib import Path
import socket
import subprocess
import sys
import tempfile
import time
import unittest
import urllib.request
import uuid

from test_bridge import module


class RestartTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        self.state = self.root / "state"
        self.processes = []

    def tearDown(self):
        for process in self.processes:
            if process.poll() is None:
                process.terminate()
                process.wait(timeout=6)

    def server(self, legacy=False):
        with socket.socket() as probe:
            probe.bind(("127.0.0.1", 0))
            self.port = probe.getsockname()[1]
        script = Path(module.__file__)
        if legacy:
            # Simulate the 0.1.x server's missing shutdown endpoint while keeping
            # its real authenticated API, process lifetime and state-file lock.
            shim = self.root / "bibimer_bridge.py"
            shim.write_text("import importlib.util\n"
                f"spec=importlib.util.spec_from_file_location('live_bridge',{str(script)!r})\n"
                "m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)\n"
                "original=m.Handler._route\n"
                "def route(self,method):\n"
                "    if self.path=='/v1/shutdown': raise m.Problem(404,'error_route')\n"
                "    return original(self,method)\n"
                "m.Handler._route=route\n"
                "m.main()\n")
            script = shim
        process = subprocess.Popen([sys.executable, str(script), "serve", "--state-dir", str(self.state), "--port", str(self.port)],
            stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        self.processes.append(process)
        deadline = time.monotonic() + 5
        while time.monotonic() < deadline:
            if module.bridge_health(self.state, self.port):
                return process
            time.sleep(0.03)
        self.fail("Temporary bridge did not start")

    def post(self, path, data):
        token = json.loads((self.state / "token.json").read_text())
        request = urllib.request.Request(f"http://127.0.0.1:{self.port}" + path, data=json.dumps(data).encode(),
            headers={"Authorization": "Bearer " + token, "Content-Type": "application/json"})
        with urllib.request.build_opener(urllib.request.ProxyHandler({})).open(request, timeout=3) as response:
            return json.load(response)

    def test_idle_shutdown_and_legacy_pidfd_keep_unrelated_process(self):
        for legacy in [False, True]:
            with self.subTest(legacy=legacy):
                process = self.server(legacy)
                unrelated = subprocess.Popen([sys.executable, "-c", "import time; time.sleep(30)"])
                self.processes.append(unrelated)
                self.assertFalse(module.owns_bridge_lock(unrelated.pid, self.state))
                self.assertTrue(module.owns_bridge_lock(process.pid, self.state))
                module.restart_bridge(self.state, self.port)
                process.wait(timeout=4)
                self.assertIsNone(unrelated.poll())
                unrelated.terminate(); unrelated.wait(timeout=3)

    def test_restart_refuses_active_session_without_signalling(self):
        process = self.server()
        self.post("/v1/project", {"path": str(self.root / "project"), "create": True})
        self.post("/v1/sessions", {"agent": "shell", "request_id": str(uuid.uuid4())})
        with self.assertRaises(RuntimeError):
            module.restart_bridge(self.state, self.port)
        self.assertIsNone(process.poll())
        self.assertEqual("running", module.bridge_health(self.state, self.port)["session"]["state"])
