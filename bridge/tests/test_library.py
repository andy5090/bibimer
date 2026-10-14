import json
from pathlib import Path
import subprocess
import time
import uuid
from unittest.mock import patch

from test_chat import ChatFixture
from test_bridge import module


class LibraryTests(ChatFixture):
    def test_worktree_location_metadata_tracks_git_without_changing_folders(self):
        self.register()
        project = self.bridge.project.copy()
        root = Path(project["path"])
        def git(*args):
            return subprocess.run(["git", "-C", str(root), *args], check=True,
                                  stdout=subprocess.PIPE, stderr=subprocess.PIPE).stdout.decode().strip()
        def trees():
            return self.bridge.worktrees({"project_id": project["id"]})["worktrees"]
        self.assertNotIn("branch", trees()[0])
        git("init", "-b", "main")
        self.assertEqual("main", trees()[0]["branch"], "unborn branch is still named")
        git("-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid", "commit", "--allow-empty", "-m", "fixture")
        head = git("rev-parse", "HEAD")
        self.assertEqual(head, trees()[0]["head"])
        self.assertFalse(trees()[0]["detached"])
        linked = self.root / "linked 한글"
        git("worktree", "add", "-b", "feature/login", str(linked))
        self.assertEqual("feature/login", trees()[1]["branch"])
        git("checkout", "-b", "changed-externally")
        self.assertEqual("changed-externally", trees()[0]["branch"])
        git("checkout", "--detach", "HEAD")
        detached = trees()[0]
        self.assertTrue(detached["detached"])
        self.assertEqual("", detached["branch"])
        self.assertEqual(head, detached["head"])
        nested = root / "nested"
        nested.mkdir()
        self.bridge.projects[project["id"]]["path"] = str(nested)
        self.assertEqual(str(nested), trees()[0]["path"])
        self.assertTrue(trees()[0]["detached"])
        self.assertEqual(head, trees()[0]["head"])
        self.assertEqual("", git("status", "--porcelain"), "metadata reads do not mutate Git")

    def test_automatic_title_uses_first_user_message_and_never_persists_text(self):
        first = self.chat()
        self.message("PRIVATE_FIRST_TITLE 한글 🙂")
        self.until(lambda event: event["session"]["turn_state"] == "ready")
        self.assertEqual("PRIVATE_FIRST_TITLE 한글 🙂", self.bridge.snapshot_by_id(first.id)["display_title"])
        self.message("Different follow up")
        self.until(lambda event: event["session"]["turn_state"] == "ready")
        self.assertEqual("PRIVATE_FIRST_TITLE 한글 🙂", self.bridge.snapshot_by_id(first.id)["display_title"])
        self.bridge.persist()
        self.assertNotIn("PRIVATE_FIRST_TITLE", (self.state / "metadata.json").read_text())
        self.assertNotIn("display_title", (self.state / "metadata.json").read_text())

    def test_native_title_read_restores_old_sessions_without_starting_them(self):
        first = self.chat()
        restored = module.Bridge(self.state)
        native = {"thread": {"id": first.thread_id, "cwd": first.project["path"],
                             "name": "Native saved title", "preview": "PRIVATE_PREVIEW"}}
        with patch.object(restored, "history_call", return_value=native) as lookup:
            row = restored.read_session_title(first.id)["session"]
            self.assertEqual("lost", row["state"])
            self.assertEqual("Native saved title", row["display_title"])
            self.assertEqual(0, restored.active_count())
            restored.read_session_title(first.id)
            self.assertEqual(1, lookup.call_count)
            self.assertEqual({"threadId": first.thread_id, "includeTurns": False}, lookup.call_args.args[2])
        restored.manage_session(first.id, {"action": "rename", "title": "My title"})
        with patch.object(restored, "history_call", side_effect=AssertionError("must not read renamed session")):
            self.assertEqual("My title", restored.read_session_title(first.id)["session"]["title"])
        metadata = (self.state / "metadata.json").read_text()
        self.assertNotIn("Native saved title", metadata)
        self.assertNotIn("PRIVATE_PREVIEW", metadata)

    def test_native_title_endpoint_scope_auth_and_import_titles(self):
        self.register()
        first, _ = self.start_another(source_thread_id="saved-one", import_mode="resume")
        self.assertEqual("Saved workspace", self.bridge.snapshot_by_id(first.id)["display_title"])
        endpoint = f"/v1/sessions/{first.id}/title"
        self.assertEqual(401, self.api("GET", endpoint, auth=False)[0])
        self.assertEqual(404, self.api("GET", "/v1/sessions/missing/title")[0])
        for agent in ["codex", "claude", "opencode"]:
            first.agent = agent
            with patch.object(self.bridge, "history_call", return_value={"thread": {
                    "id": first.thread_id, "cwd": first.project["path"], "preview": "Native preview"}}) as lookup:
                self.assertEqual("Native preview", self.api("GET", endpoint)[1]["session"]["display_title"])
                self.assertEqual(agent, lookup.call_args.args[3])
            self.bridge.session_title_cache.clear()
        for source in [{"id": "other", "cwd": first.project["path"]},
                       {"id": first.thread_id, "cwd": str(self.root)},
                       {"id": first.thread_id, "cwd": first.project["path"], "ephemeral": True}]:
            with patch.object(self.bridge, "history_call", return_value={"thread": source}):
                self.assertEqual(400, self.api("GET", endpoint)[0])
        self.assertEqual("a b c", module.session_title(" a\n b\x00 c "))
        self.assertEqual("🙂" * 119 + "…", module.session_title("🙂" * 150))
        self.assertEqual("", module.session_title({}))

    def start_another(self, **extra):
        data = {"agent": "codex", "mode": "chat", "project_id": self.bridge.project["id"],
                "new_session": True, "request_id": str(uuid.uuid4()), **extra}
        status, result = self.api("POST", "/v1/sessions", data)
        self.assertEqual(200, status, result)
        self.session_id = result["session"]["id"]
        self.until(lambda event: event["session"]["ready"])
        return self.bridge.get_session(self.session_id), data

    def manage(self, session, action, **extra):
        return self.api("POST", f"/v1/sessions/{session.id}/manage", {"action": action, **extra})

    def test_same_agent_sessions_keep_scoped_approval_queue_and_launch_retry(self):
        first = self.chat()
        self.message("approval")
        request = self.until(lambda event: event["requests"])["requests"][0]["id"]
        self.api("POST", f"/v1/sessions/{first.id}/queue", {"action": "add", "text": "PRIVATE_QUEUE", "request_id": str(uuid.uuid4())})
        second, data = self.start_another()
        self.assertNotEqual(first.id, second.id)
        self.assertEqual(2, self.bridge.active_count())
        self.assertEqual(second.id, self.api("POST", "/v1/sessions", data)[1]["session"]["id"])
        self.assertEqual(2, self.bridge.active_count())
        project = self.bridge.project["id"]
        result = self.api("POST", "/v1/project-session", {"project_id": project, "session_id": first.id})[1]
        self.assertEqual(first.id, result["session"]["id"])
        self.assertEqual(first.id, self.bridge.session.id)
        self.assertEqual(request, first.events(0, 0)["requests"][0]["id"])
        self.assertEqual(1, first.snapshot()["queued_count"])
        self.assertEqual(0, second.snapshot()["queued_count"])
        self.assertEqual(409, self.api("POST", "/v1/sessions", {**data, "request_id": str(uuid.uuid4()), "new_session": False})[0])
        self.assertEqual(200, self.api("POST", "/v1/project-session", {"project_id": project, "session_id": None, "agent": "codex"})[0])
        self.assertIsNone(self.bridge.session)
        self.assertEqual(2, self.bridge.active_count())
        self.assertNotIn("PRIVATE_QUEUE", (self.state / "metadata.json").read_text())

    def test_archive_restore_rename_delete_and_restart_preserve_native_history(self):
        first = self.chat()
        self.message("SESSION_OUTPUT_MUST_NOT_BE_METADATA")
        self.until(lambda event: event["session"]["turn_state"] == "ready")
        second, _ = self.start_another()
        self.assertEqual(200, self.manage(first, "archive")[0])
        self.assertEqual("running", first.state)
        self.assertTrue(self.bridge.snapshot_by_id(first.id)["archived"])
        self.assertEqual(200, self.manage(first, "rename", title="<Review & tests>")[0])
        self.assertEqual(409, self.manage(first, "delete")[0])
        for title in ["", "x" * 121, "a\nb", {}]:
            self.assertEqual(400, self.manage(first, "rename", title=title)[0])
        self.assertEqual(200, self.manage(first, "restore")[0])
        self.assertFalse(self.bridge.snapshot_by_id(first.id)["archived"])
        self.manage(first, "archive")
        restored = module.Bridge(self.state)
        self.assertEqual(2, len(restored.snapshots()))
        prior = restored.snapshot_by_id(first.id)
        self.assertEqual("lost", prior["state"])
        self.assertEqual("<Review & tests>", prior["title"])
        self.assertTrue(restored.session_events(first.id, 0, 0)["session"]["archived"])
        self.assertEqual(first.thread_id, prior["external_thread_id"])
        self.assertEqual(second.id, restored.snapshot_for(self.bridge.project["id"])["id"])
        self.assertNotIn("SESSION_OUTPUT_MUST_NOT_BE_METADATA", (self.state / "metadata.json").read_text())
        first.stop(); first.process.wait(timeout=5)
        deadline = time.monotonic() + 5
        while first.state != "exited" and time.monotonic() < deadline:
            time.sleep(.01)
        self.assertEqual(200, self.manage(first, "delete")[0])
        self.assertIsNone(self.bridge.snapshot_by_id(first.id))
        self.assertEqual("running", second.state)
        self.assertTrue((self.root / "project").is_dir())
        self.assertEqual(409, self.api("POST", "/v1/sessions", {"agent": "codex", "mode": "chat", "new_session": True, "request_id": first.launch_id})[0])

    def test_scoped_selection_authentication_and_old_metadata_migration(self):
        first = self.chat()
        first_project = self.bridge.project["id"]
        second_project = self.api("POST", "/v1/project", {"path": str(self.root / "second"), "create": True, "add": True})[1]["project"]["id"]
        self.assertEqual(404, self.api("POST", "/v1/project-session", {"project_id": second_project, "session_id": first.id})[0])
        for endpoint, data in [("/v1/worktrees", {"project_id": first_project}),
                               ("/v1/project-session", {"project_id": first_project, "session_id": first.id}),
                               (f"/v1/sessions/{first.id}/manage", {"action": "archive"})]:
            self.assertEqual(401, self.api("POST", endpoint, data, auth=False)[0])
        migration = self.root / "migration"
        module.private_dir(migration)
        module.save_json(migration / "metadata.json", {"format": 3, "projects": list(self.bridge.projects.values()),
            "active_project_id": first_project, "selected_agents": {first_project: "codex"}, "sessions": [first.snapshot()]})
        restored = module.Bridge(migration)
        self.assertEqual(first.id, restored.snapshot_for(first_project)["id"])
        self.assertEqual(1, len(restored.snapshots()))

    def test_resume_keeps_native_id_and_rejects_simultaneous_original(self):
        self.register()
        first, data = self.start_another(source_thread_id="saved-one", import_mode="resume")
        self.assertEqual(409, self.api("POST", "/v1/sessions", {**data, "request_id": str(uuid.uuid4())})[0])
        first.stop(); first.process.wait(timeout=5)
        self.until(lambda event: event["session"]["state"] == "exited")
        resumed, _ = self.start_another(source_thread_id=first.thread_id, import_mode="resume")
        self.assertNotEqual(first.id, resumed.id)
        self.assertEqual(first.thread_id, resumed.thread_id)
        self.assertFalse((self.root / "project" / "turn-count").exists())
        self.assertEqual(2, len(self.bridge.snapshots()))

    def test_real_worktrees_unsafe_paths_and_cwd_survive_restart(self):
        self.register()
        project = self.bridge.project.copy()
        def git(*args):
            return subprocess.run(["git", "-C", project["path"], *args], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        git("init", "-b", "main")
        git("-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid", "commit", "--allow-empty", "-m", "fixture")
        linked = (self.root / "feature 한글 space").resolve()
        git("worktree", "add", "-b", "feature", str(linked))
        result = self.api("POST", "/v1/worktrees", {"project_id": project["id"]})[1]["worktrees"]
        self.assertEqual([project["path"], str(linked)], [row["path"] for row in result])
        self.assertEqual("feature", result[1]["branch"])
        session, data = self.start_another(worktree_path=str(linked))
        self.assertEqual(str(linked), session.project["path"])
        self.assertEqual(project["id"], session.project["id"])
        self.assertEqual(str(linked), module.Bridge(self.state).snapshot_by_id(session.id)["project"]["path"])
        for path in [str(self.root), "/bad\0path", {}, str(self.root / "missing")]:
            self.assertEqual(400, self.api("POST", "/v1/sessions", {**data, "request_id": str(uuid.uuid4()), "worktree_path": path})[0])
        self.assertEqual(409, self.api("POST", "/v1/sessions", {**data, "worktree_path": project["path"]})[0])
        self.assertEqual(400, self.api("POST", "/v1/session-history", {"project_id": project["id"], "worktree_path": str(self.root)})[0])
