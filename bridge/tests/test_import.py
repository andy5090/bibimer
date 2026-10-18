import json
import threading
import uuid
from unittest.mock import patch
from test_chat import ChatFixture
from test_bridge import module


class ImportTests(ChatFixture):
    def concurrent_title_lookup(self, path, data):
        first = self.chat()
        reading, release, finished = threading.Event(), threading.Event(), threading.Event()
        results = {}
        original = module.HistoryClient.call

        def delayed(client, method, params):
            if method == "thread/read" and params["threadId"] == first.thread_id:
                reading.set()
                if not release.wait(4):
                    raise RuntimeError("Title lookup was not released")
            return original(client, method, params)

        def title():
            results["title"] = self.api("GET", f"/v1/sessions/{first.id}/title")

        def foreground():
            results["foreground"] = self.api("POST", path, data)
            finished.set()

        with patch.object(module.HistoryClient, "call", delayed):
            background = threading.Thread(target=title)
            request = threading.Thread(target=foreground)
            background.start()
            try:
                self.assertTrue(reading.wait(2))
                request.start()
                self.assertFalse(finished.wait(0.15), "Import must wait for the title lookup instead of returning an error")
                self.assertEqual(200, self.api("GET", "/v1/health")[0])
                self.assertIsNone(first.process.poll())
                self.assertEqual(200, self.message("approval")[0])
                self.until(lambda event: bool(event["requests"]))
            finally:
                release.set()
                background.join(timeout=5)
                if request.ident is not None:
                    request.join(timeout=5)
        self.assertEqual(200, results["title"][0])
        self.assertEqual(200, results["foreground"][0], results["foreground"])
        self.assertTrue(self.bridge.session_events(first.id, 0, 0)["requests"])
        self.assertFalse((self.root / "project/approved").exists())
        return results["foreground"][1]

    def test_catalog_waits_for_background_title_without_blocking_session_input(self):
        self.register()
        result = self.concurrent_title_lookup("/v1/session-history", {"project_id": self.bridge.project["id"]})
        self.assertEqual(["saved-one"], [entry["id"] for entry in result["sessions"]])
        self.assertEqual(1, self.bridge.active_count())

    def test_import_validation_waits_for_background_title(self):
        self.register()
        result = self.concurrent_title_lookup("/v1/sessions", {"project_id": self.bridge.project["id"],
            "agent": "codex", "mode": "chat", "source_thread_id": "saved-one", "import_mode": "resume",
            "new_session": True, "request_id": str(uuid.uuid4())})
        self.session_id = result["session"]["id"]
        event = self.until(lambda event: event["session"]["ready"])
        self.assertEqual("saved-one", event["session"]["external_thread_id"])
        self.assertEqual("1", (self.root / "project/turn-count").read_text())
        self.assertEqual(2, self.bridge.active_count())

    def launch_import(self, source="saved-one", mode="fork", key=None):
        return self.api("POST", "/v1/sessions", {"project_id": self.bridge.project["id"],
            "agent": "codex", "mode": "chat", "source_thread_id": source,
            "import_mode": mode, "request_id": key or str(uuid.uuid4())})

    def imported(self, source="saved-one", mode="fork"):
        self.register()
        status, result = self.launch_import(source, mode)
        self.assertEqual(200, status)
        self.session_id = result["session"]["id"]
        return self.until(lambda event: event["session"]["ready"])

    def test_catalog_auth_search_paging_and_no_side_effects(self):
        self.register()
        data = {"project_id": self.bridge.project["id"]}
        self.assertEqual(401, self.api("POST", "/v1/session-history", data, auth=False)[0])
        self.assertEqual(404, self.api("POST", "/v1/session-history", {"project_id": "missing"})[0])
        status, result = self.api("POST", "/v1/session-history", data)
        self.assertEqual(200, status)
        self.assertEqual(["saved-one"], [entry["id"] for entry in result["sessions"]])
        self.assertNotIn("preview", result["sessions"][0])
        data["cursor"] = result["next_cursor"]
        result = self.api("POST", "/v1/session-history", data)[1]
        self.assertEqual("saved-two", result["sessions"][0]["id"])
        self.assertIsNone(result["next_cursor"])
        result = self.api("POST", "/v1/session-history", {**data, "search": "no match"})[1]
        self.assertFalse(result["sessions"])
        self.assertEqual(0, self.bridge.active_count())
        self.assertIsNone(self.bridge.session)
        self.assertFalse((self.root / "project/turn-count").exists())
        self.assertNotIn("Saved workspace", (self.state / "metadata.json").read_text())
        self.assertEqual("error_history_unsupported", self.api("POST", "/v1/session-history", {**data, "search": "unsupported"})[1]["code"])

    def test_fork_restores_history_without_starting_turn_or_replaying_approval(self):
        event = self.imported()
        self.assertEqual("saved-one-copy", event["session"]["external_thread_id"])
        self.assertEqual("saved-one", event["session"]["source_thread_id"])
        self.assertFalse(event["requests"])
        self.assertEqual(["user", "assistant", "command", "tool", "notice"], [item["kind"] for item in event["items"]])
        self.assertEqual("interrupted", event["items"][2]["status"])
        self.assertFalse((self.root / "project/turn-count").exists())
        self.assertEqual(200, self.message("Continue restored work")[0])
        event = self.until(lambda event: event["session"]["turn_state"] == "ready" and any(item["kind"] == "turn" for item in event["items"]))
        self.assertEqual("1", (self.root / "project/turn-count").read_text())
        metadata = (self.state / "metadata.json").read_text()
        self.assertNotIn("Saved private prompt", metadata)
        self.assertNotIn("Restored context", metadata)
        self.assertIn("saved-one-copy", metadata)
        self.assertEqual("lost", module.Bridge(self.state).session_events(self.session_id, 1, 0)["session"]["state"])

    def test_resume_idempotency_busy_and_request_conflicts(self):
        self.register()
        key = str(uuid.uuid4())
        first = self.launch_import(mode="resume", key=key)
        self.assertEqual(200, first[0])
        self.session_id = first[1]["session"]["id"]
        event = self.until(lambda event: event["session"]["ready"])
        self.assertEqual("saved-one", event["session"]["external_thread_id"])
        self.assertEqual(self.session_id, self.launch_import(mode="resume", key=key)[1]["session"]["id"])
        self.assertEqual(409, self.launch_import(mode="fork", key=key)[0])
        self.assertEqual(409, self.launch_import(source="saved-two", mode="resume", key=key)[0])
        self.assertEqual(409, self.launch_import()[0])
        self.assertEqual(409, self.api("POST", "/v1/sessions", {"agent":"codex", "mode":"chat", "request_id":key})[0])
        self.assertEqual(1, self.bridge.active_count())

    def test_reject_invalid_foreign_temporary_and_active_original(self):
        self.register()
        for source, mode, code in [("../escape", "fork", "error_import_invalid"),
                ("saved-one", "unknown", "error_import_invalid"), ("foreign", "fork", "error_import_project"),
                ("temporary", "fork", "error_import_invalid"), ("active", "resume", "error_import_active")]:
            with self.subTest(source=source):
                self.assertEqual(code, self.launch_import(source, mode)[1]["code"])
        self.assertEqual(0, self.bridge.active_count())
        self.assertEqual(200, self.launch_import("active", "fork")[0])

    def test_preview_failure_keeps_restored_context_usable(self):
        event = self.imported("no-preview")
        self.assertEqual("history_preview_unavailable", event["items"][0]["code"])
        self.assertEqual(200, self.message("continue")[0])

    def test_import_keeps_other_project_session_and_approval_alive(self):
        self.register()
        first = self.chat()
        self.message("approval")
        pending = self.until(lambda event: bool(event["requests"]))["requests"][0]["id"]
        self.api("POST", "/v1/project", {"path": str(self.root / "second"), "create": True, "add": True})
        status, result = self.launch_import()
        self.assertEqual(200, status)
        self.session_id = result["session"]["id"]
        self.until(lambda event: event["session"]["ready"])
        self.assertEqual(2, self.bridge.active_count())
        self.assertIsNone(first.process.poll())
        self.assertEqual(pending, self.bridge.session_events(first.id, 0, 0)["requests"][0]["id"])
        self.assertFalse((self.root / "project/approved").exists())

    def test_import_failure_is_localized_and_stops_owned_process(self):
        self.register()
        status, result = self.launch_import("import-failure")
        self.assertEqual(200, status)
        self.session_id = result["session"]["id"]
        event = self.until(lambda event: event["session"]["state"] == "exited")
        self.assertEqual("error_import_failed", event["items"][0]["code"])
        self.assertNotIn("private failure", json.dumps(event))
        self.assertFalse((self.root / "project/turn-count").exists())
