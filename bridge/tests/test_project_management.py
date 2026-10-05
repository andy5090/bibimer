import json
import subprocess
import threading
import uuid
from unittest.mock import patch

from test_bridge import BridgeTestCase, module


class ProjectManagementTests(BridgeTestCase):
    def add(self, name):
        status, result = self.api("POST", "/v1/project", {"path": str(self.root / name), "create": True, "add": True})
        self.assertEqual(200, status)
        return result["project"]

    def launch(self, project, **extra):
        status, result = self.api("POST", "/v1/sessions", {"project_id": project["id"], "agent": "shell",
            "request_id": str(uuid.uuid4()), "new_session": True, **extra})
        self.assertEqual(200, status)
        return result["session"]

    def manage(self, project, action, **extra):
        return self.api("POST", "/v1/project/manage", {"project_id": project["id"], "action": action, **extra})

    def stop(self, snapshot):
        session = self.bridge.get_session(snapshot["id"])
        self.api("POST", "/v1/sessions/" + snapshot["id"] + "/stop", {})
        with session.condition:
            self.assertTrue(session.condition.wait_for(lambda: session.state == "exited", timeout=5))
        session.process.wait(timeout=5)

    def test_rename_keeps_process_folder_identity_and_other_project_selection(self):
        project = self.add("alpha")
        session = self.launch(project)
        other = self.add("beta")
        before = self.bridge.get_session(session["id"])
        status, result = self.manage(project, "rename", name="  <Mobile & 개발>  ")
        self.assertEqual(200, status)
        self.assertEqual(dict(project, name="<Mobile & 개발>"), result["project"])
        self.assertEqual(other["id"], self.bridge.active_project_id)
        self.assertIsNone(before.process.poll())
        self.assertEqual(session["project"]["path"], self.bridge.snapshot_by_id(session["id"])["project"]["path"])
        self.assertEqual("<Mobile & 개발>", self.bridge.snapshot_by_id(session["id"])["project"]["name"])
        self.send(session["id"], "printf 'STILL_''ALIVE\\n'\r")
        self.output_until(session["id"], b"STILL_ALIVE")
        self.assertEqual("<Mobile & 개발>", json.loads((self.state / "metadata.json").read_text())["projects"][0]["name"])
        self.assertEqual(1, self.bridge.active_count())

    def test_remove_blocks_archived_and_worktree_sessions_then_keeps_files_and_other_process(self):
        project = self.add("repo")
        path = self.root / "repo"
        subprocess.run(["git", "init", "-b", "main", str(path)], check=True, capture_output=True)
        subprocess.run(["git", "-C", str(path), "-c", "user.name=Test", "-c", "user.email=test@example.invalid",
                        "commit", "--allow-empty", "-m", "fixture"], check=True, capture_output=True)
        tree = self.root / "linked"
        subprocess.run(["git", "-C", str(path), "worktree", "add", "-b", "feature/test", str(tree)], check=True, capture_output=True)
        (path / "keep.txt").write_text("project files")
        (tree / "keep.txt").write_text("worktree files")
        native = self.root / "saved-agent-history.json"
        native.write_text("native history")
        first, second = self.launch(project), self.launch(project, worktree_path=str(tree))
        self.api("POST", "/v1/sessions/" + first["id"] + "/manage", {"action": "archive"})
        other = self.add("other")
        live = self.launch(other)
        status, error = self.manage(project, "delete")
        self.assertEqual((409, "error_project_delete_active"), (status, error["code"]))
        self.stop(first)
        self.assertEqual(409, self.manage(project, "delete")[0])
        self.stop(second)
        status, result = self.manage(project, "delete")
        self.assertEqual(200, status)
        self.assertEqual(project["id"], result["removed_project_id"])
        self.assertEqual(other["id"], result["active_project_id"])
        self.assertEqual(1, self.bridge.active_count())
        self.assertIsNone(self.bridge.get_session(live["id"]).process.poll())
        self.assertEqual("project files", (path / "keep.txt").read_text())
        self.assertEqual("worktree files", (tree / "keep.txt").read_text())
        self.assertEqual("native history", native.read_text())
        self.assertTrue((tree / ".git").is_file())
        metadata = json.loads((self.state / "metadata.json").read_text())
        self.assertNotIn(project["id"], metadata["selected_agents"])
        self.assertNotIn(project["id"], metadata["selected_sessions"])
        self.assertNotIn(first["id"], metadata["session_labels"])
        self.assertEqual([live["id"]], [row["id"] for row in metadata["sessions"]])
        reopened = self.add("repo")
        self.assertNotEqual(project["id"], reopened["id"])
        self.assertEqual(409, self.api("POST", "/v1/sessions", {"project_id": reopened["id"], "agent": "shell",
            "request_id": first["launch_id"]})[0])

    def test_last_project_removal_persists_empty_registry_and_keeps_authentication(self):
        first, last = self.add("first"), self.add("last")
        token = (self.state / "token.json").read_bytes()
        self.assertEqual(200, self.manage(last, "delete")[0])
        self.assertEqual(first["id"], self.bridge.active_project_id)
        self.assertEqual(200, self.manage(first, "delete")[0])
        restored = module.Bridge(self.state)
        self.assertEqual([], restored.health()["projects"])
        self.assertIsNone(restored.project)
        self.assertIsNone(restored.session)
        self.assertEqual(token, (self.state / "token.json").read_bytes())
        self.assertTrue((self.root / "first").is_dir())
        self.assertEqual(404, self.manage(first, "delete")[0])

    def test_invalid_or_unauthenticated_requests_leave_registry_unchanged(self):
        project = self.add("valid")
        before = (self.state / "metadata.json").read_bytes()
        for name in ("", "   ", "a" * 121, "bad\nname", None, [], 42):
            self.assertEqual(400, self.manage(project, "rename", name=name)[0])
        self.assertEqual(400, self.manage(project, "move")[0])
        for key in (None, [], "missing"):
            self.assertEqual(404, self.api("POST", "/v1/project/manage", {"project_id": key, "action": "delete"})[0])
        self.assertEqual(401, self.api("POST", "/v1/project/manage", {"project_id": project["id"], "action": "delete"}, auth=False)[0])
        self.assertEqual(before, (self.state / "metadata.json").read_bytes())

    def test_removal_while_launch_is_preparing_cannot_start_in_unregistered_folder(self):
        project = self.add("race")
        entered, release = threading.Event(), threading.Event()
        original = self.bridge.working_project
        result = []
        def paused(data):
            working = original(data)
            entered.set()
            self.assertTrue(release.wait(timeout=5))
            return working
        def launch():
            result.append(self.api("POST", "/v1/sessions", {"project_id": project["id"], "agent": "shell", "request_id": str(uuid.uuid4())}))
        with patch.object(self.bridge, "working_project", side_effect=paused):
            worker = threading.Thread(target=launch)
            worker.start()
            try:
                self.assertTrue(entered.wait(timeout=5))
                self.assertEqual(200, self.manage(project, "delete")[0])
            finally:
                release.set()
                worker.join(timeout=5)
        self.assertFalse(worker.is_alive())
        self.assertEqual(404, result[0][0])
        self.assertEqual(0, self.bridge.active_count())
