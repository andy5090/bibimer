import json
import time
import uuid

from test_bridge import BridgeTestCase, module


class ProjectTests(BridgeTestCase):
    def add(self, name):
        status, result = self.api("POST", "/v1/project", {
            "path": str(self.root / name), "create": True, "add": True})
        self.assertEqual(200, status)
        return result["project"]

    def start(self, project, request=None):
        data = {"agent": "shell", "project_id": project["id"], "request_id": request or str(uuid.uuid4())}
        status, result = self.api("POST", "/v1/sessions", data)
        self.assertEqual(200, status)
        return result["session"]

    def test_parallel_sessions_route_by_project_and_stop_independently(self):
        first = self.add("alpha")
        key = str(uuid.uuid4())
        a = self.start(first, key)
        second = self.add("beta")
        b = self.start(second)
        self.assertEqual(2, self.bridge.health()["active_sessions"])
        self.assertEqual(a["id"], self.start(first, key)["id"])
        self.assertEqual(409, self.api("POST", "/v1/sessions", {
            "agent": "shell", "project_id": second["id"], "request_id": key})[0])
        self.assertEqual(409, self.api("POST", "/v1/sessions", {
            "agent": "shell", "project_id": first["id"], "request_id": str(uuid.uuid4())})[0])
        self.send(a["id"], "printf alpha > owner.txt; printf 'ALPHA_''READY\\n'\r")
        self.send(b["id"], "printf beta > owner.txt; printf 'BETA_''READY\\n'\r")
        self.output_until(a["id"], b"ALPHA_READY")
        self.output_until(b["id"], b"BETA_READY")
        self.assertEqual("alpha", (self.root / "alpha/owner.txt").read_text())
        self.assertEqual("beta", (self.root / "beta/owner.txt").read_text())
        for project in (first, second, first):
            self.assertEqual(200, self.api("POST", "/v1/project", {"project_id": project["id"]})[0])
            self.assertEqual(2, self.bridge.health()["active_sessions"])
        target = self.bridge.get_session(a["id"])
        self.assertEqual(200, self.api("POST", f"/v1/sessions/{a['id']}/stop", {})[0])
        with target.condition:
            target.condition.wait_for(lambda: target.state == "exited", timeout=5)
        self.assertEqual("exited", target.state)
        self.assertIsNone(self.bridge.get_session(b["id"]).process.poll())
        self.send(b["id"], "printf 'BETA_''STILL_RUNNING\\n'\r")
        self.output_until(b["id"], b"BETA_STILL_RUNNING")

    def test_hidden_active_session_blocks_shutdown_and_restart(self):
        first = self.add("active")
        session = self.start(first)
        idle = self.add("idle")
        self.assertEqual(idle["id"], self.bridge.project["id"])
        self.assertIsNone(self.bridge.session)
        self.assertEqual(1, self.bridge.health()["active_sessions"])
        self.assertEqual(409, self.api("POST", "/v1/shutdown", {})[0])
        with self.assertRaises(RuntimeError):
            module.restart_bridge(self.state, self.server.server_port)
        self.assertIsNone(self.bridge.get_session(session["id"]).process.poll())

    def test_duplicate_paths_and_unknown_project_never_change_launch_target(self):
        first = self.add("alpha")
        status, result = self.api("POST", "/v1/project", {"path": str(self.root / "alpha") + "/.", "add": True})
        self.assertEqual(200, status)
        self.assertEqual(first["id"], result["project"]["id"])
        self.assertEqual(1, len(self.bridge.health()["projects"]))
        for value in ("unknown", [], None):
            self.assertEqual(404, self.api("POST", "/v1/project", {"project_id": value})[0])
        self.assertEqual(404, self.api("POST", "/v1/sessions", {
            "project_id": "unknown", "agent": "shell", "request_id": str(uuid.uuid4())})[0])
        self.assertEqual(first["id"], self.bridge.project["id"])
        self.assertEqual({}, self.bridge.sessions)
        self.assertEqual(401, self.api("POST", "/v1/project", {"project_id": first["id"]}, auth=False)[0])

    def test_all_project_metadata_restores_without_output_or_process_reattachment(self):
        first, second = self.add("alpha"), self.add("beta")
        a, b = self.start(first), self.start(second)
        self.send(a["id"], "printf 'PRIVATE_''ALPHA_MARKER\\n'\r")
        self.send(b["id"], "printf 'PRIVATE_''BETA_MARKER\\n'\r")
        self.output_until(a["id"], b"PRIVATE_ALPHA_MARKER")
        self.output_until(b["id"], b"PRIVATE_BETA_MARKER")
        self.bridge.persist()
        restored = module.Bridge(self.state)
        self.assertEqual(self.bridge.token, restored.token)
        self.assertEqual(second["id"], restored.project["id"])
        self.assertEqual(0, restored.active_count())
        for item in restored.health()["projects"]:
            self.assertEqual("lost", item["session"]["state"])
            self.assertEqual(0, item["session"]["output_end"])
            self.assertEqual(0, restored.session_events(item["session"]["id"], 0, 0)["cursor"])
        for path in self.state.iterdir():
            self.assertNotIn(b"PRIVATE_ALPHA_MARKER", path.read_bytes())
            self.assertNotIn(b"PRIVATE_BETA_MARKER", path.read_bytes())

    def test_legacy_single_project_is_migrated_with_stable_id(self):
        project = {"name": "legacy", "path": str(self.root / "legacy")}
        snapshot = {"id": str(uuid.uuid4()), "project": project, "state": "exited", "exit_code": 7,
                    "output_start": 100, "output_end": 200, "agent": "shell"}
        module.save_json(self.state / "metadata.json", {"project": project, "session": snapshot})
        restored = module.Bridge(self.state)
        key = restored.project["id"]
        self.assertEqual(project["path"], restored.project["path"])
        self.assertEqual(snapshot["id"], restored.previous["id"])
        self.assertEqual("exited", restored.previous["state"])
        self.assertEqual(7, restored.previous["exit_code"])
        self.assertEqual(key, module.Bridge(self.state).project["id"])
