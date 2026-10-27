import uuid

from test_chat import ChatFixture
from test_bridge import module
from test_providers import ProviderFixture


class InitialMessageTests(ChatFixture):
    def payload(self, text="PRIVATE_FIRST_MESSAGE 한글 🙂", **extra):
        if not self.bridge.project:
            self.register()
        return {"project_id": self.bridge.project["id"], "agent": "codex", "mode": "chat",
                "new_session": True, "initial_message": {"text": text}, "request_id": str(uuid.uuid4()), **extra}

    def launch(self, payload):
        status, result = self.api("POST", "/v1/sessions", payload)
        self.assertEqual(200, status, result)
        self.session_id = result["session"]["id"]
        return result["session"]

    def test_initial_message_waits_for_native_readiness_and_retries_once(self):
        payload = self.payload()
        row = self.launch(payload)
        event = self.until(lambda event: event["session"]["turn_state"] == "ready" and
                           any(item["kind"] == "turn" for item in event["items"]))
        self.assertTrue(any(item.get("text") == payload["initial_message"]["text"] for item in event["items"]))
        self.assertEqual(row["id"], self.launch(payload)["id"])
        self.assertEqual("1", (self.root / "project/turn-count").read_text())
        self.assertEqual(1, self.bridge.active_count())
        self.bridge.persist()
        metadata = (self.state / "metadata.json").read_text()
        self.assertNotIn("PRIVATE_FIRST_MESSAGE", metadata)
        self.assertNotIn("initial_message", metadata)
        changed = dict(payload, initial_message={"text": "changed"})
        self.assertEqual(409, self.api("POST", "/v1/sessions", changed)[0])
        removed = {key: value for key, value in payload.items() if key != "initial_message"}
        self.assertEqual(409, self.api("POST", "/v1/sessions", removed)[0])

    def test_invalid_initial_message_never_starts_a_process(self):
        base = self.payload()
        cases = [dict(base, initial_message=value) for value in [None, "text", {}, {"text": " "}, {"text": "x" * 16385},
                                                                  {"text": "ok", "command_id": 4}, {"text": "ok", "extra": True}]]
        cases += [dict(base, mode="terminal"), dict(base, new_session=False), dict(base, agent="shell"),
                  dict(base, source_thread_id="saved-one", import_mode="resume")]
        for payload in cases:
            self.assertEqual(400, self.api("POST", "/v1/sessions", payload)[0], payload.keys())
            self.assertEqual(0, self.bridge.active_count())

    def test_first_message_keeps_another_session_and_its_approval(self):
        existing = self.chat()
        self.message("approval")
        request = self.until(lambda event: bool(event["requests"]))["requests"][0]
        payload = self.payload("new conversation")
        created = self.launch(payload)
        self.until(lambda event: any(item["kind"] == "turn" for item in event["items"]))
        self.assertNotEqual(existing.id, created["id"])
        self.session_id = existing.id
        event = self.until(lambda event: bool(event["requests"]))
        self.assertEqual(request["id"], event["requests"][0]["id"])
        self.assertFalse((self.root / "project/approved").exists())
        self.assertEqual(2, self.bridge.active_count())

    def test_receipt_after_restart_does_not_replay_initial_message(self):
        payload = self.payload("once only")
        self.launch(payload)
        self.until(lambda event: any(item["kind"] == "turn" for item in event["items"]))
        current = self.bridge.get_session(self.session_id)
        current.stop()
        current.process.wait(timeout=5)
        self.bridge.persist()
        restored = module.Bridge(self.state)
        with self.assertRaises(module.Problem) as failure:
            restored.launch(payload)
        self.assertEqual("error_launch_conflict", failure.exception.code)
        self.assertEqual(0, restored.active_count())
        self.assertEqual("1", (self.root / "project/turn-count").read_text())

    def test_native_command_is_validated_before_start_and_preserves_invocation(self):
        payload = self.payload("/fixture hello")
        catalog = self.bridge.commands({"project_id": payload["project_id"], "agent": "codex"})["commands"]
        command = next(row for row in catalog if row["name"] == "review")
        payload["initial_message"] = {"text": "/review hello", "command_id": command["id"]}
        self.launch(payload)
        event = self.until(lambda event: any(item["kind"] == "turn" for item in event["items"]))
        self.assertTrue(any("$review hello" in item.get("text", "") for item in event["items"]))


class ProviderInitialMessageTests(ProviderFixture):
    def test_claude_and_opencode_first_message_uses_native_queue(self):
        for agent in ["claude", "opencode"]:
            with self.subTest(agent=agent):
                payload = {"project_id": self.bridge.project["id"], "agent": agent, "mode": "chat", "new_session": True,
                           "request_id": str(uuid.uuid4()), "initial_message": {"text": "first " + agent}}
                status, result = self.api("POST", "/v1/sessions", payload)
                self.assertEqual(200, status, result)
                self.session_id = result["session"]["id"]
                event = self.until(lambda event: any(item["kind"] == "turn" for item in event["items"]) and
                                   event["session"]["turn_state"] == "ready")
                self.assertEqual(1, sum(item.get("text") == "first " + agent for item in event["items"]))
                self.assertEqual(self.session_id, self.api("POST", "/v1/sessions", payload)[1]["session"]["id"])
        self.assertEqual(2, self.bridge.active_count())
