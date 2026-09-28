import json
from pathlib import Path
import sys
import time
import uuid
from unittest.mock import patch

from test_bridge import BridgeTestCase, module


class ChatTests(BridgeTestCase):
    def setUp(self):
        super().setUp()
        fixture = self.root / "codex"
        fixture.write_text("#!" + sys.executable + "\n" + Path(__file__).with_name("fake_codex.py").read_text())
        fixture.chmod(0o700)
        original = module.shutil.which
        self.lookup = patch.object(module.shutil, "which", side_effect=lambda name: str(fixture) if name == "codex" else original(name))
        self.lookup.start()
        self.addCleanup(self.lookup.stop)

    def chat(self):
        self.register()
        status, result = self.api("POST", "/v1/sessions", {"agent": "codex", "mode": "chat", "request_id": str(uuid.uuid4())})
        self.assertEqual(200, status)
        self.session_id = result["session"]["id"]
        self.until(lambda event: event["session"]["turn_state"] == "ready")
        return self.bridge.session

    def until(self, predicate):
        deadline = time.monotonic() + 5
        while time.monotonic() < deadline:
            status, result = self.api("GET", f"/v1/sessions/{self.session_id}/events?cursor=0&wait=0")
            self.assertEqual(200, status)
            if predicate(result):
                return result
            time.sleep(0.02)
        self.fail("Expected controlled chat event did not arrive")

    def message(self, text, key=None):
        return self.api("POST", f"/v1/sessions/{self.session_id}/message", {"text": text, "request_id": key or str(uuid.uuid4())})

    def test_two_project_chats_keep_messages_and_approvals_isolated(self):
        first = self.chat()
        project_a = first.project
        self.message("approval")
        request = self.until(lambda event: bool(event["requests"]))["requests"][0]
        status, result = self.api("POST", "/v1/project", {
            "path": str(self.root / "second"), "create": True, "add": True})
        self.assertEqual(200, status)
        status, result = self.api("POST", "/v1/sessions", {"project_id": result["project"]["id"],
            "agent": "codex", "mode": "chat", "request_id": str(uuid.uuid4())})
        self.assertEqual(200, status)
        second = result["session"]["id"]
        self.session_id = second
        self.until(lambda event: event["session"]["turn_state"] == "ready")
        self.message("only in project B")
        event = self.until(lambda event: any(item["kind"] == "turn" for item in event["items"]))
        self.assertFalse(event["requests"])
        self.assertEqual(409, self.api("POST", f"/v1/sessions/{second}/respond", {
            "prompt_id": request["id"], "decision": "accept", "request_id": str(uuid.uuid4())})[0])
        self.assertEqual(200, self.api("POST", "/v1/project", {"project_id": project_a["id"]})[0])
        self.session_id = first.id
        event = self.until(lambda event: bool(event["requests"]))
        self.assertEqual(request["id"], event["requests"][0]["id"])
        self.assertFalse(any(item.get("text") == "only in project B" for item in event["items"]))
        self.assertEqual(200, self.api("POST", f"/v1/sessions/{first.id}/respond", {
            "prompt_id": request["id"], "decision": "decline", "request_id": str(uuid.uuid4())})[0])
        self.assertFalse((self.root / "project/approved").exists())
        self.assertEqual(2, self.bridge.active_count())

    def test_messages_replay_idempotency_and_follow_up(self):
        session = self.chat()
        key = str(uuid.uuid4())
        self.assertEqual(200, self.message("hello · 비비머", key)[0])
        event = self.until(lambda event: any(item["kind"] == "turn" for item in event["items"]))
        self.assertEqual(200, self.message("hello · 비비머", key)[0])
        self.assertEqual("1", (self.root / "project/turn-count").read_text())
        self.assertEqual(409, self.message("different", key)[0])
        self.assertTrue(any(item["kind"] == "assistant" and "# Result" in item["text"] for item in event["items"]))
        self.assertTrue(any(item["kind"] == "diff" for item in event["items"]))
        self.message("follow-up")
        self.until(lambda event: sum(item["kind"] == "turn" for item in event["items"]) == 2)
        self.assertIsNone(session.process.poll())
        self.bridge.persist()
        for path in self.state.iterdir():
            self.assertNotIn("비비머", path.read_text())
            self.assertNotIn("Formatted", path.read_text())

    def test_structured_plan_and_file_changes_replay_without_persisting_content(self):
        session = self.chat()
        with session.condition:
            session._handle({"method": "turn/plan/updated", "params": {"turnId": "render-test",
                "explanation": "Controlled plan", "plan": [
                    {"step": "Inspect files", "status": "completed"},
                    {"step": "Verify changes", "status": "in_progress"}]}})
            session._item({"id": "files", "type": "fileChange", "status": "completed", "changes": [
                {"path": "first.py", "diff": "@@ -1 +1 @@\n-old\n+new"},
                {"path": "두 번째.py", "diff": "+added"}]}, "render-test", True)
        event = self.until(lambda event: len(event["items"]) >= 2)
        plan = next(item for item in event["items"] if item["kind"] == "plan")
        change = next(item for item in event["items"] if item["kind"] == "diff")
        self.assertEqual("in_progress", plan["steps"][1]["status"])
        self.assertEqual("Controlled plan", plan["explanation"])
        self.assertEqual(["first.py", "두 번째.py"], [file["path"] for file in change["changes"]])
        self.assertFalse(change["truncated"])
        self.assertIn("+added", change["text"])  # Older UI fallback remains usable.
        with session.condition:
            session._item({"id": "large-diff", "type": "fileChange", "changes": [
                {"path": "large.py", "diff": "+line\n" * 10000}]}, "render-test", True)
        event = self.until(lambda event: any(item.get("truncated") for item in event["items"]))
        large = next(item for item in event["items"] if item.get("truncated"))
        self.assertLessEqual(sum(len(file["path"])+len(file["diff"]) for file in large["changes"]), 32768)
        self.bridge.persist()
        self.assertNotIn("Controlled plan", (self.state / "metadata.json").read_text())

    def test_approval_requires_explicit_response_and_survives_reconnect(self):
        self.chat()
        self.message("approval")
        event = self.until(lambda event: bool(event["requests"]))
        self.assertFalse((self.root / "project/approved").exists())
        prompt = event["requests"][0]
        self.assertNotIn("rpc_id", prompt)
        replay = self.until(lambda event: bool(event["requests"]))
        self.assertEqual(prompt["id"], replay["requests"][0]["id"])
        data = {"prompt_id": prompt["id"], "decision": "acceptForSession", "request_id": str(uuid.uuid4())}
        endpoint = f"/v1/sessions/{self.session_id}/respond"
        self.assertEqual(400, self.api("POST", endpoint, data)[0])
        data["decision"] = "accept"
        self.assertEqual(200, self.api("POST", endpoint, data)[0])
        self.until(lambda event: not event["requests"] and event["session"]["turn_state"] == "ready")
        self.assertEqual("once", (self.root / "project/approved").read_text())
        self.assertEqual(200, self.api("POST", endpoint, data)[0])
        data["request_id"] = str(uuid.uuid4())
        self.assertEqual(409, self.api("POST", endpoint, data)[0])

    def test_decline_questions_interrupt_and_unsupported_request(self):
        session = self.chat()
        for text in ("approval", "question"):
            self.message(text)
            event = self.until(lambda event: bool(event["requests"]))
            data = {"prompt_id": event["requests"][0]["id"], "request_id": str(uuid.uuid4())}
            data.update({"decision": "decline"} if text == "approval" else {"answers": {"choice": "한국어"}})
            self.assertEqual(200, self.api("POST", f"/v1/sessions/{self.session_id}/respond", data)[0])
            self.until(lambda event: not event["requests"] and event["session"]["turn_state"] == "ready")
        self.assertFalse((self.root / "project/approved").exists())
        self.message("wait")
        self.until(lambda event: event["session"]["turn_state"] == "running")
        self.assertEqual(409, self.message("too early")[0])
        self.assertEqual(200, self.api("POST", f"/v1/sessions/{self.session_id}/interrupt", {})[0])
        self.until(lambda event: event["session"]["turn_state"] == "ready")
        self.assertIsNone(session.process.poll())
        self.message("unsupported")
        self.until(lambda event: any(item.get("code") == "chat_unsupported_request" for item in event["items"]))

    def test_bounded_history_and_mode_guards(self):
        self.register()
        self.assertEqual(400, self.api("POST", "/v1/sessions", {"agent": "shell", "mode": "chat", "request_id": str(uuid.uuid4())})[0])
        session = self.chat()
        self.assertEqual(400, self.send(self.session_id, "ignored")[0])
        self.message("large")
        event = self.until(lambda event: event["gap"] and event["session"]["turn_state"] == "ready")
        self.assertLessEqual(session.total, module.BUFFER_LIMIT)
        self.assertEqual(set(event["retained"]), {item["id"] for item in event["items"]})
        restored = module.Bridge(self.state)
        self.assertEqual("lost", restored.health()["session"]["state"])
        self.assertEqual("chat", restored.health()["session"]["mode"])

    def test_failed_interrupt_does_not_allow_another_turn(self):
        self.chat()
        self.message("interrupt-error")
        self.until(lambda event: event["session"]["turn_state"] == "running")
        self.api("POST", f"/v1/sessions/{self.session_id}/interrupt", {})
        event = self.until(lambda event: any(item.get("text") == "Controlled interrupt failure" for item in event["items"]))
        self.assertEqual("running", event["session"]["turn_state"])
        self.assertEqual(409, self.message("must not send")[0])
