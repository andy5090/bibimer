import os
import subprocess
from unittest.mock import patch

from test_bridge import BridgeTestCase, module


class InspectorTests(BridgeTestCase):
    def setUp(self):
        super().setUp()
        self.path = self.register()
        self.project = self.bridge.project["id"]

    def inspect(self, action, **values):
        return self.api("POST", "/v1/inspect", {"project_id": self.project, "action": action, **values})

    def git(self, *args):
        return subprocess.check_output(["git", "-C", str(self.path), *args], stderr=subprocess.DEVNULL)

    def repo(self):
        self.git("init", "-b", "main")
        self.git("config", "user.name", "Fixture")
        self.git("config", "user.email", "fixture@example.invalid")
        (self.path / "file.txt").write_text("original\n")
        self.git("add", ".")
        self.git("commit", "-m", "Initial <commit>")

    def test_auth_validation_scoping_and_non_repository(self):
        self.assertEqual(401, self.api("POST", "/v1/inspect", {}, auth=False)[0])
        for values in [{}, {"project_id": self.project, "action": "delete"},
                       {"project_id": self.project, "action": "files", "worktree_path": str(self.root)}]:
            self.assertEqual(400, self.api("POST", "/v1/inspect", values)[0])
        self.assertFalse(self.inspect("status")[1]["is_repo"])
        self.assertIn("workspace_inspector", self.bridge.health()["features"])

    def test_files_pagination_hidden_binary_limits_and_no_symlink_follow(self):
        (self.path / "folder").mkdir()
        (self.path / ".env").write_text("controlled secret")
        for n in range(205):
            (self.path / f"item-{n:03}.txt").write_text("hello 한글\n")
        (self.path / "binary").write_bytes(b"\0\xff")
        (self.path / "large").write_text("a" * (module.WorkspaceInspector.TEXT_LIMIT + 20))
        (self.path / "link").symlink_to(self.root)
        os.mkfifo(self.path / "pipe")
        first = self.inspect("files")[1]
        self.assertEqual("folder", first["entries"][0]["kind"])
        self.assertEqual(200, len(first["entries"]))
        self.assertEqual(200, first["next_offset"])
        self.assertNotIn(".env", [row["name"] for row in first["entries"]])
        self.assertIsNone(self.inspect("files", offset=200)[1]["next_offset"])
        self.assertIn(".env", [row["name"] for row in self.inspect("files", hidden=True)[1]["entries"]])
        self.assertEqual("hello 한글\n", self.inspect("file", path="item-000.txt")[1]["text"])
        self.assertTrue(self.inspect("file", path="binary")[1]["binary"])
        self.assertTrue(self.inspect("file", path="large")[1]["truncated"])
        for path in ["../state/token.json", "/etc/passwd", ".git/config", "folder/../.env", "a\0b"]:
            self.assertEqual(400, self.inspect("file", path=path)[0])
        for action, path in [("files", "link"), ("file", "link/state/token.json"), ("file", "pipe"), ("file", "folder")]:
            self.assertEqual(403, self.inspect(action, path=path)[0])

    def test_status_diff_history_and_commit_are_read_only(self):
        self.repo()
        (self.path / "file.txt").write_text("staged\n")
        self.git("add", ".")
        (self.path / "file.txt").write_text("working\n")
        unusual = "한글\n<new>.txt"
        (self.path / unusual).write_text("untracked")
        before = (self.path / ".git/index").read_bytes()
        status, result = self.inspect("status")
        self.assertEqual(200, status)
        self.assertEqual("main", result["branch"]["head"])
        rows = {row["path"]: row["xy"] for row in result["entries"]}
        self.assertEqual("MM", rows["file.txt"])
        self.assertEqual("??", rows[unusual])
        staged = self.inspect("diff", path="file.txt", area="staged")[1]["text"]
        working = self.inspect("diff", path="file.txt", area="worktree")[1]["text"]
        self.assertIn("+staged", staged)
        self.assertNotIn("+working", staged)
        self.assertIn("+working", working)
        history = self.inspect("history")[1]
        self.assertEqual(1, len(history["entries"]))
        self.assertEqual("Initial <commit>", history["entries"][0]["subject"])
        commit = self.inspect("commit", revision=history["entries"][0]["id"])[1]
        self.assertIn("+original", commit["text"])
        self.assertEqual(before, (self.path / ".git/index").read_bytes())
        self.assertEqual(400, self.inspect("commit", revision="HEAD; touch unwanted")[0])
        self.assertEqual(400, self.inspect("diff", path="../other", area="staged")[0])
        self.assertEqual(400, self.inspect("diff", path="file.txt", area="reset")[0])

    def test_rename_empty_detached_and_history_pages(self):
        self.git("init", "-b", "main")
        self.assertEqual([], self.inspect("history")[1]["entries"])
        self.repo()
        self.git("mv", "file.txt", "renamed.txt")
        row = self.inspect("status")[1]["entries"][0]
        self.assertEqual("file.txt", row["original"])
        self.assertEqual("renamed.txt", row["path"])
        self.git("commit", "-m", "Rename")
        for n in range(50):
            self.git("commit", "--allow-empty", "-m", f"Commit {n}")
        first = self.inspect("history")[1]
        self.assertEqual(50, len(first["entries"]))
        self.assertEqual(50, first["next_offset"])
        self.git("checkout", "--detach")
        self.assertEqual("(detached)", self.inspect("status")[1]["branch"]["head"])
        second = self.inspect("history", revision=first["revision"], offset=50)[1]
        self.assertEqual(2, len(second["entries"]))
        self.assertIsNone(second["next_offset"])
        self.assertFalse(set(row["id"] for row in first["entries"]) & set(row["id"] for row in second["entries"]))

    def test_conflict_is_reported_without_changing_index_or_metadata(self):
        self.repo()
        self.git("checkout", "-b", "other")
        (self.path / "file.txt").write_text("other branch\n")
        self.git("commit", "-am", "Other")
        self.git("checkout", "main")
        (self.path / "file.txt").write_text("main branch\n")
        self.git("commit", "-am", "Main")
        with self.assertRaises(subprocess.CalledProcessError):
            self.git("merge", "other")
        index = (self.path / ".git/index").read_bytes()
        metadata = (self.bridge.state / "metadata.json").read_bytes()
        row = self.inspect("status")[1]["entries"][0]
        self.assertTrue(row["conflict"])
        self.assertEqual("UU", row["xy"])
        self.assertEqual(200, self.inspect("diff", path="file.txt", area="worktree")[0])
        self.inspect("file", path="file.txt")
        self.assertEqual(index, (self.path / ".git/index").read_bytes())
        self.assertEqual(metadata, (self.bridge.state / "metadata.json").read_bytes())

    def test_git_timeout_terminates_its_read_process(self):
        inspector = module.WorkspaceInspector(self.bridge.project)
        inspector.filter_overrides = []
        processes = []
        popen = subprocess.Popen
        def record(*args, **kwargs):
            process = popen(*args, **kwargs)
            processes.append(process)
            return process
        with patch.object(module.subprocess, "Popen", side_effect=record), patch.object(module.select, "select", return_value=([], [], [])):
            with self.assertRaises(module.Problem) as error:
                inspector.git(["status"])
        self.assertEqual(408, error.exception.status)
        self.assertIsNotNone(processes[0].poll())
        self.assertTrue(processes[0].stdout.closed)

    def test_worktree_and_subfolder_scopes(self):
        self.repo()
        tree = self.root / "linked tree"
        self.git("worktree", "add", "-b", "feature", str(tree))
        (tree / "file.txt").write_text("linked change\n")
        self.assertEqual(0, self.inspect("status")[1]["total"])
        result = self.inspect("status", worktree_path=str(tree))[1]
        self.assertEqual("feature", result["branch"]["head"])
        self.assertEqual(1, result["total"])
        folder = self.path / "inside"
        folder.mkdir()
        (folder / "only.txt").write_text("inside")
        self.git("add", ".")
        self.git("commit", "-m", "Subfolder")
        self.project = self.api("POST", "/v1/project", {"path": str(folder), "add": True})[1]["project"]["id"]
        (self.path / "file.txt").write_text("outside selected folder")
        (folder / "only.txt").write_text("inside change")
        self.assertEqual(["only.txt"], [row["path"] for row in self.inspect("status")[1]["entries"]])
        commit = self.inspect("history")[1]["entries"][0]["id"]
        self.assertNotIn("file.txt", self.inspect("commit", revision=commit)[1]["text"])

    def test_git_output_limit_and_external_programs_disabled(self):
        self.repo()
        marker = self.root / "must-not-run"
        command = "touch " + str(marker)
        for key in ["core.fsmonitor", "diff.external", "diff.demo.textconv", "filter.demo.clean", "filter.demo.process"]:
            self.git("config", key, command)
        self.git("config", "filter.demo.required", "true")
        (self.path / ".gitattributes").write_text("*.txt diff=demo filter=demo\n")
        (self.path / "file.txt").write_text("different\n")
        self.assertEqual(200, self.inspect("status")[0])
        self.assertEqual(200, self.inspect("diff", path="file.txt", area="worktree")[0])
        self.assertFalse(marker.exists())
        with patch.object(module.WorkspaceInspector, "GIT_LIMIT", 64):
            self.assertEqual(413, self.inspect("status")[0])
        with patch.object(module.WorkspaceInspector, "GIT_LIMIT", 256):
            (self.path / "file.txt").write_text("large content\n" * 500)
            result = self.inspect("diff", path="file.txt", area="worktree")[1]
            self.assertTrue(result["truncated"])
