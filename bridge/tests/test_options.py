import json
import os
from pathlib import Path
import sys
import time
import uuid
from unittest.mock import patch

from test_chat import ChatFixture
from test_bridge import module


class OptionsTests(ChatFixture):
    def begin(self, options, imported=None):
        request = dict(agent="codex", mode="chat", request_id=str(uuid.uuid4()), options=options)
        if imported:
            request.update(source_thread_id="saved-one", import_mode=imported)
        status, data = self.api("POST", "/v1/sessions", request)
        self.assertEqual(200, status, data)
        self.session_id = data["session"]["id"]
        self.until(lambda event: event["session"]["ready"])
        return request

    def end(self):
        session = self.bridge.session
        session.stop()
        session.process.wait(timeout=5)
        self.until(lambda event: event["session"]["state"] == "exited")

    def captures(self):
        return [json.loads(line) for line in (self.root / "project" / "codex-options.jsonl").read_text().splitlines()]

    def test_codex_launch_resume_fork_permission_and_fast_mapping(self):
        self.register()
        for imported in [None, "resume", "fork"]:
            for mode in ["inherit", "read-only", "workspace-write", "yolo"]:
                with self.subTest(imported=imported, mode=mode):
                    self.begin({"permission": mode, "fast": True}, imported)
                    captured = self.captures()[-1]
                    self.assertEqual("thread/" + (imported or "start"), captured.pop("method"))
                    expected = {"serviceTier": "fast", "config": {"features.fast_mode": True}}
                    if mode != "inherit":
                        expected.update(sandbox="danger-full-access" if mode == "yolo" else mode,
                                        approvalPolicy="never" if mode == "yolo" else "on-request", approvalsReviewer="user")
                    self.assertEqual(expected, captured)
                    self.end()

    def test_fast_next_turn_idempotency_and_session_isolation(self):
        self.register()
        request = self.begin({"permission": "workspace-write", "fast": True})
        first = self.bridge.session
        first_id = first.id
        second_path = self.root / "another"
        status, data = self.api("POST", "/v1/project", {"path": str(second_path), "create": True, "add": True})
        self.assertEqual(200, status, data)
        self.begin({"permission": "inherit", "fast": True})
        second = self.bridge.session
        body = {"text": "test speed", "fast": False, "request_id": str(uuid.uuid4())}
        self.assertEqual(200, self.api("POST", f"/v1/sessions/{first_id}/message", body)[0])
        self.session_id = first_id
        self.until(lambda event: event["session"]["turn_state"] == "ready")
        self.assertEqual(False, first.options["fast"])
        self.assertEqual(True, second.options["fast"])
        self.assertEqual("default", self.captures()[-1]["serviceTier"])
        self.assertEqual(200, self.api("POST", f"/v1/sessions/{first_id}/message", body)[0])
        self.assertEqual(409, self.api("POST", f"/v1/sessions/{first_id}/message", dict(body, fast=True))[0])
        body.update(fast=True, request_id=str(uuid.uuid4()))
        self.assertEqual(200, self.api("POST", f"/v1/sessions/{first_id}/message", body)[0])
        self.until(lambda event: event["session"]["turn_state"] == "ready")
        self.assertEqual("fast", self.captures()[-1]["serviceTier"])
        request["project_id"] = first.project["id"]
        self.assertEqual(200, self.api("POST", "/v1/sessions", request)[0])
        self.assertEqual(409, self.api("POST", "/v1/sessions", dict(request, options={"permission":"yolo"}))[0])

    def test_invalid_options_fail_before_process_start(self):
        self.register()
        for agent, options in [("codex", {"permission":"bypassPermissions"}), ("claude", {"permission":"yolo"}),
                ("shell", {"permission":"yolo"}), ("opencode", {"fast":True}), ("codex", {"fast":"false"}),
                ("codex", {"fast":1}), ("codex", []), ("codex", {"permission":[]}), ("codex", {"config":{}})]:
            status, data = self.api("POST", "/v1/sessions", dict(agent=agent, mode="terminal", options=options, request_id=str(uuid.uuid4())))
            self.assertEqual(400, status, data)
            self.assertEqual("error_agent_options", data["code"])
            self.assertFalse(self.bridge.sessions)

    def test_pty_receives_native_flags_and_scoped_environment(self):
        project = self.register()
        executable = self.root / "capture-cli"
        executable.write_text("#!" + sys.executable + "\nimport sys,os,json\nfrom pathlib import Path\n"
            "if '--version' not in sys.argv: Path('pty-options.json').write_text(json.dumps({'args':sys.argv[1:],'permission':os.environ.get('OPENCODE_PERMISSION')}))\n")
        executable.chmod(0o700)
        for agent, options, expected in [
            ("codex", {"permission":"yolo", "fast":True}, ["--dangerously-bypass-approvals-and-sandbox", "-c", 'approvals_reviewer="user"', "-c", 'service_tier="fast"', "-c", "features.fast_mode=true"]),
            ("codex", {"permission":"read-only", "fast":False}, ["--sandbox", "read-only", "--ask-for-approval", "on-request", "-c", 'approvals_reviewer="user"', "-c", 'service_tier="default"', "-c", "features.fast_mode=true"]),
            ("claude", {"permission":"bypassPermissions"}, ["--permission-mode", "bypassPermissions", "--dangerously-skip-permissions"]),
            ("opencode", {"permission":"allow"}, []), ("opencode", {"permission":"ask"}, [])]:
            with self.subTest(agent=agent, options=options), patch.object(self.bridge, "agent_executable", return_value=str(executable)):
                status, data = self.api("POST", "/v1/sessions", dict(agent=agent, options=options, request_id=str(uuid.uuid4())))
                self.assertEqual(200, status, data)
                self.session_id = data["session"]["id"]
                self.until(lambda event: event["session"]["state"] == "exited")
                captured = json.loads((project / "pty-options.json").read_text())
                self.assertEqual(expected, captured["args"])
                if agent == "opencode":
                    self.assertEqual({"*":options["permission"]}, json.loads(captured["permission"]))
                self.assertEqual(options, self.bridge.session.snapshot()["options"])
