import base64
import json
from pathlib import Path
import socket
import subprocess
import sys
import tempfile
import time
import unittest
import urllib.error
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

    def request(self, method, path, data=None):
        token = json.loads((self.state / "token.json").read_text())
        request = urllib.request.Request(f"http://127.0.0.1:{self.port}" + path, method=method,
            data=None if data is None else json.dumps(data).encode(),
            headers={"Authorization": "Bearer " + token, "Content-Type": "application/json"})
        try:
            response = urllib.request.build_opener(urllib.request.ProxyHandler({})).open(request, timeout=3)
        except urllib.error.HTTPError as error:
            response = error
        with response:
            return response.status, json.load(response)

    def post(self, path, data):
        status, result = self.request("POST", path, data)
        self.assertEqual(200, status)
        return result

    def test_exited_session_after_restart_allows_reconnect_and_new_launch(self):
        process = self.server()
        self.post("/v1/project", {"path": str(self.root / "project"), "create": True})
        session = self.post("/v1/sessions", {"agent": "shell", "request_id": str(uuid.uuid4())})["session"]
        endpoint = f"/v1/sessions/{session['id']}"
        self.post(endpoint + "/input", {"data": base64.b64encode(b"printf 'BEFORE_''RESTART\\n'; exit 7\r").decode(),
            "request_id": str(uuid.uuid4())})
        deadline = time.monotonic() + 5
        while time.monotonic() < deadline:
            session = module.bridge_health(self.state, self.port)["session"]
            if session["state"] == "exited":
                break
            time.sleep(0.03)
        self.assertEqual("exited", session["state"])
        self.assertGreater(session["output_end"], 0)
        token = (self.state / "token.json").read_bytes()
        module.restart_bridge(self.state, self.port)
        process.wait(timeout=4)
        self.server()
        self.assertEqual(token, (self.state / "token.json").read_bytes())
        for cursor in (0, session["output_end"]):
            status, event = self.request("GET", endpoint + f"/events?cursor={cursor}&wait=20")
            self.assertEqual(200, status)
            self.assertEqual("exited", event["session"]["state"])
            self.assertEqual(7, event["session"]["exit_code"])
            self.assertEqual(0, event["cursor"])
            self.assertEqual("", event["data"])
            self.assertEqual(cursor > 0, event["gap"])
        self.assertEqual(404, self.request("POST", endpoint + "/stop", {})[0])
        next_session = self.post("/v1/sessions", {"agent": "shell", "request_id": str(uuid.uuid4())})["session"]
        self.assertNotEqual(session["id"], next_session["id"])
        self.assertEqual("running", next_session["state"])
        # Starting another session retains the earlier session in the library.
        self.assertEqual(200, self.request("GET", endpoint + "/events?cursor=0&wait=0")[0])

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
