import base64
import contextlib
import http.client
import importlib.util
import io
import json
import os
from pathlib import Path
import signal
import stat
import subprocess
import sys
import tempfile
import threading
import time
import unittest
import uuid

SPEC = importlib.util.spec_from_file_location("bibimer_bridge", Path(__file__).parents[1] / "bibimer_bridge.py")
module = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(module)


class BridgeTestCase(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.root = Path(self.directory.name)
        self.state = self.root / "state"
        self.bridge = module.Bridge(self.state)
        self.server = module.Server(("127.0.0.1", 0), self.bridge)
        self.thread = threading.Thread(target=self.server.serve_forever, kwargs={"poll_interval":0.05}, daemon=True)
        self.thread.start()

    def tearDown(self):
        if self.bridge.session:
            self.bridge.session.stop()
            self.bridge.session.process.wait(timeout=5)
            self.bridge.session.reader.join(timeout=2)
            deadline = time.monotonic() + 2
            while self.bridge.session.state != "exited" and time.monotonic() < deadline:
                time.sleep(0.01)
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=2)
        self.directory.cleanup()

    def api(self, method, path, data=None, auth=True, headers=None):
        connection = http.client.HTTPConnection("127.0.0.1", self.server.server_port, timeout=4)
        request_headers = {"Content-Type":"application/json"}
        if auth:
            request_headers["Authorization"] = "Bearer " + self.bridge.token
        request_headers.update(headers or {})
        connection.request(method, path, None if data is None else json.dumps(data), request_headers)
        response = connection.getresponse()
        status = response.status
        payload = json.loads(response.read())
        connection.close()
        return status, payload

    def register(self):
        path = self.root / "project"
        status, data = self.api("POST", "/v1/project", {"path":str(path), "create":True})
        self.assertEqual(200, status)
        return path

    def launch(self):
        self.register()
        status, data = self.api("POST", "/v1/sessions", {"agent":"shell", "request_id":str(uuid.uuid4())})
        self.assertEqual(200, status)
        return data["session"]["id"]

    def send(self, session_id, text, key=None):
        return self.api("POST", f"/v1/sessions/{session_id}/input", {
            "data":base64.b64encode(text.encode()).decode(), "request_id":key or str(uuid.uuid4())})

    def output_until(self, session_id, expected, cursor=0):
        output = b""
        deadline = time.monotonic() + 5
        while time.monotonic() < deadline:
            status, event = self.api("GET", f"/v1/sessions/{session_id}/events?cursor={cursor}&wait=0")
            self.assertEqual(200, status)
            output += base64.b64decode(event["data"])
            cursor = event["cursor"]
            if expected in output:
                return output, cursor
            time.sleep(0.03)
        self.fail("Controlled terminal output did not arrive")

class BridgeTests(BridgeTestCase):
    def test_no_unauthenticated_execution_or_output(self):
        for method, path, data in [("GET","/v1/health",None), ("POST","/v1/sessions",{}),
                                    ("POST","/v1/shutdown",{}),
                                    ("POST","/v1/project",{"path":str(self.root / 'forbidden'),"create":True})]:
            status, result = self.api(method, path, data, auth=False)
            self.assertEqual(401, status)
            self.assertEqual("error_pairing_required", result["code"])
            self.assertEqual("Connect the app to Termux first.", result["error"])
        self.assertIsNone(self.bridge.session)
        self.assertFalse((self.root / "forbidden").exists())

    def test_rejects_browser_origin_and_foreign_host(self):
        for header in [{"Origin":"https://example.com"}, {"Origin":"null"}, {"Host":"evil.invalid"}]:
            self.assertEqual(403, self.api("GET", "/v1/health", headers=header)[0])

    def test_pairing_once_private_storage_and_expiry(self):
        code = module.issue_pairing(self.state)
        status, result = self.api("POST", "/v1/pair", {"code":code}, auth=False)
        self.assertEqual(200, status)
        self.assertEqual(self.bridge.token, result["token"])
        self.assertEqual(403, self.api("POST", "/v1/pair", {"code":code}, auth=False)[0])
        module.issue_pairing(self.state)
        pending = module.read_json(self.state / "pairing.json")
        pending["expires"] = 0
        module.save_json(self.state / "pairing.json", pending)
        self.assertEqual(403, self.api("POST", "/v1/pair", {"code":code}, auth=False)[0])
        self.assertEqual(0o700, stat.S_IMODE(self.state.stat().st_mode))
        self.assertEqual(0o600, stat.S_IMODE((self.state / "token.json").stat().st_mode))

    def test_pairing_limits_attempts(self):
        code = module.issue_pairing(self.state)
        for _ in range(5):
            self.assertEqual(403, self.api("POST", "/v1/pair", {"code":"not-a-code"}, auth=False)[0])
        self.assertEqual(403, self.api("POST", "/v1/pair", {"code":code}, auth=False)[0])

    def test_project_validation(self):
        for path in ["relative/path", str(self.root / "missing"), "", "/bad\0path"]:
            self.assertEqual(400, self.api("POST", "/v1/project", {"path":path})[0])
        target = self.root / "file"
        target.write_text("not a directory")
        self.assertEqual(400, self.api("POST", "/v1/project", {"path":str(target)})[0])

    def test_cli_language_selection_and_english_default(self):
        command = [sys.executable, str(Path(module.__file__)), "status", "--state-dir", str(self.state),
                   "--port", str(self.server.server_port)]
        environment = {key:value for key, value in os.environ.items() if key != "BIBIMER_LANGUAGE"}
        environment["LANG"] = "ko_KR.UTF-8"
        result = subprocess.check_output(command, env=environment, text=True)
        self.assertEqual("Bridge is available\n", result)
        environment["BIBIMER_LANGUAGE"] = "ko"
        result = subprocess.check_output(command, env=environment, text=True)
        self.assertEqual("브리지 연결 가능\n", result)
        result = subprocess.check_output(command + ["--language", "en"], env=environment, text=True)
        self.assertEqual("Bridge is available\n", result)

    def test_terminal_workdir_unicode_replay_and_reconnect(self):
        session_id = self.launch()
        pid = self.bridge.session.process.pid
        self.send(session_id, "printf '비비''머\\n'; pwd\r")
        first, cursor = self.output_until(session_id, "비비머".encode())
        status, replay = self.api("GET", f"/v1/sessions/{session_id}/events?cursor=0&wait=0")
        self.assertEqual(200, status)
        self.assertIn("비비머".encode(), base64.b64decode(replay["data"]))
        self.assertIn(str(self.root / "project").encode(), first)
        # No client connection is kept open between requests.
        time.sleep(0.1)
        self.send(session_id, "printf 'AFTER_''RECONNECT\\n'\r")
        self.output_until(session_id, b"AFTER_RECONNECT", cursor)
        self.assertEqual(pid, self.bridge.session.process.pid)
        self.assertEqual("running", self.bridge.session.state)

    def test_launch_idempotency_and_single_active_session(self):
        self.register()
        payload = {"agent":"shell", "request_id":str(uuid.uuid4())}
        first = self.api("POST", "/v1/sessions", payload)
        second = self.api("POST", "/v1/sessions", payload)
        self.assertEqual(first[1]["session"]["id"], second[1]["session"]["id"])
        payload["request_id"] = str(uuid.uuid4())
        self.assertEqual(409, self.api("POST", "/v1/sessions", payload)[0])
        self.assertEqual(409, self.api("POST", "/v1/project", {"path":str(self.root)})[0])

    def test_input_idempotency_and_invalid_input(self):
        session_id = self.launch()
        key = str(uuid.uuid4())
        text = "printf 'once\\n' >> result.txt\r"
        self.assertEqual(200, self.send(session_id, text, key)[0])
        self.assertEqual(200, self.send(session_id, text, key)[0])
        self.assertEqual(409, self.send(session_id, "echo other\r", key)[0])
        self.send(session_id, "printf 'INPUT_''DONE\\n'\r")
        self.output_until(session_id, b"INPUT_DONE")
        self.assertEqual("once\n", (self.root / "project" / "result.txt").read_text())
        self.assertEqual(400, self.api("POST", f"/v1/sessions/{session_id}/input",
            {"data":"!not base64!", "request_id":str(uuid.uuid4())})[0])

    def test_resize_reaches_controlling_terminal(self):
        session_id = self.launch()
        self.assertEqual(200, self.api("POST", f"/v1/sessions/{session_id}/resize", {"cols":93,"rows":31})[0])
        self.send(session_id, "stty size\r")
        self.output_until(session_id, b"31 93")
        self.assertEqual(400, self.api("POST", f"/v1/sessions/{session_id}/resize", {"cols":0,"rows":31})[0])

    def test_interrupt_targets_foreground_command_and_keeps_shell(self):
        session_id = self.launch()
        self.send(session_id, "sleep 30\r")
        time.sleep(0.15)
        self.send(session_id, "\x03")
        self.send(session_id, "printf 'INTERRUPT_''OK\\n'\r")
        self.output_until(session_id, b"INTERRUPT_OK")
        self.assertEqual("running", self.bridge.session.state)

    def test_exit_code_and_reject_input_after_exit(self):
        session_id = self.launch()
        self.send(session_id, "exit 7\r")
        deadline = time.monotonic() + 3
        while self.bridge.session.state != "exited" and time.monotonic() < deadline:
            time.sleep(0.02)
        self.assertEqual(7, self.bridge.session.exit_code)
        self.assertEqual(409, self.send(session_id, "echo hello\r")[0])

    def test_stop_leaves_unrelated_process_alive(self):
        unrelated = subprocess.Popen([sys.executable, "-c", "import time; time.sleep(30)"], start_new_session=True)
        try:
            session_id = self.launch()
            status, _ = self.api("POST", f"/v1/sessions/{session_id}/stop", {})
            self.assertEqual(200, status)
            self.bridge.session.process.wait(timeout=5)
            self.assertIsNone(unrelated.poll())
        finally:
            unrelated.terminate()
            unrelated.wait(timeout=3)

    def test_stop_cleans_up_foreground_and_background_job_groups(self):
        session_id = self.launch()
        self.send(session_id, "sleep 30 & echo $! > background.pid; sleep 30 & echo $! > foreground.pid; fg\r")
        deadline = time.monotonic() + 3
        foreground = self.root / "project" / "foreground.pid"
        while not foreground.exists() and time.monotonic() < deadline:
            time.sleep(0.02)
        self.assertTrue(foreground.exists())
        pids = [int((self.root / "project" / name).read_text()) for name in ("foreground.pid", "background.pid")]
        self.assertEqual(200, self.api("POST", f"/v1/sessions/{session_id}/stop", {})[0])
        self.bridge.session.process.wait(timeout=5)
        def alive(pid):
            try:
                text = Path(f"/proc/{pid}/stat").read_text()
                return text.split(")", 1)[1].strip().split()[0] != "Z"
            except FileNotFoundError:
                return False
        deadline = time.monotonic() + 3
        while any(alive(pid) for pid in pids) and time.monotonic() < deadline:
            time.sleep(0.02)
        self.assertFalse(any(alive(pid) for pid in pids))

    def test_restart_reports_lost_and_never_persists_output(self):
        session_id = self.launch()
        self.send(session_id, "printf 'PRIVATE_''OUTPUT_MARKER\\n'\r")
        self.output_until(session_id, b"PRIVATE_OUTPUT_MARKER")
        self.bridge.persist()
        restored = module.Bridge(self.state)
        self.assertEqual("lost", restored.health()["session"]["state"])
        self.assertEqual(session_id, restored.health()["session"]["id"])
        for path in self.state.iterdir():
            self.assertNotIn(b"PRIVATE_OUTPUT_MARKER", path.read_bytes())

    def test_bounded_replay_marks_output_gap(self):
        session_id = self.launch()
        with self.bridge.session.condition:
            self.bridge.session.buffer = bytearray(b"tail")
            self.bridge.session.offset = 1000
        status, data = self.api("GET", f"/v1/sessions/{session_id}/events?cursor=0&wait=0")
        self.assertEqual(200, status)
        self.assertTrue(data["gap"])
        self.assertGreaterEqual(data["cursor"], 1004)
        self.assertEqual(409, self.api("GET", f"/v1/sessions/{session_id}/events?cursor=999999&wait=0")[0])

    def test_request_logging_is_silent(self):
        capture = io.StringIO()
        with contextlib.redirect_stderr(capture):
            self.api("GET", "/v1/health")
            self.api("GET", "/bad-path", auth=False)
        self.assertEqual("", capture.getvalue())

    def test_shutdown_is_atomic_with_launch_and_rejects_active_session(self):
        self.launch()
        self.assertEqual(409, self.api("POST", "/v1/shutdown", {})[0])
        self.assertFalse(self.bridge.closing)
        self.bridge.session.stop()
        self.bridge.session.process.wait(timeout=5)
        with self.bridge.session.condition:
            self.bridge.session.condition.wait_for(lambda: self.bridge.session.state == "exited", timeout=3)
        self.bridge.begin_shutdown()
        with self.assertRaises(module.Problem) as caught:
            self.bridge.launch({"agent": "shell", "request_id": str(uuid.uuid4())})
        self.assertEqual("error_bridge_stopping", caught.exception.code)


if __name__ == "__main__":
    unittest.main()
