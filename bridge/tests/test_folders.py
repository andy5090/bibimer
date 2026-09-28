from unittest import mock

from test_bridge import BridgeTestCase, module


class FolderTests(BridgeTestCase):
    def browse(self, **data):
        return self.api("POST", "/v1/folders", {"path": str(self.root), **data})

    def test_browse_requires_auth_and_valid_parameters(self):
        self.assertEqual(401, self.api("POST", "/v1/folders", {}, auth=False)[0])
        for data in ({"path": None}, {"path": []}, {"path": ""}, {"path": "a\0b"},
                     {"path": "relative"}, {"hidden": "true"}, {"after": []}, {"after": "../"}):
            self.assertEqual(400, self.browse(**data)[0])
        self.assertEqual(403, self.api("POST", "/v1/folders", {}, headers={"Origin": "https://example.com"})[0])
        self.assertIn("browse_folders", self.bridge.health()["features"])

    def test_folder_only_pagination_hidden_unicode_and_symlinks(self):
        folder = self.root / "browse"
        folder.mkdir()
        names = [f"project-{i:03}" for i in range(105)] + ["한글 프로젝트", "space & <tag>"]
        for name in names:
            (folder / name).mkdir()
        (folder / ".hidden").mkdir()
        (folder / "secret.txt").write_text("DO_NOT_RETURN_FILE_CONTENTS")
        (folder / "alias").symlink_to(folder / "한글 프로젝트", target_is_directory=True)
        (folder / "broken").symlink_to(folder / "missing")
        (folder / "loop").symlink_to(folder / "loop")
        status, first = self.browse(path=str(folder))
        self.assertEqual(200, status)
        self.assertEqual(100, len(first["entries"]))
        status, second = self.browse(path=str(folder), after=first["next"])
        self.assertEqual(200, status)
        self.assertIsNone(second["next"])
        self.assertEqual(sorted(names + ["alias"]), [x["name"] for x in first["entries"] + second["entries"]])
        _, hidden = self.browse(path=str(folder), hidden=True)
        self.assertEqual(".hidden", hidden["entries"][0]["name"])
        _, linked = self.browse(path=str(folder / "alias"))
        self.assertEqual(str(folder / "한글 프로젝트"), linked["path"])
        self.assertEqual(str(folder), linked["parent"])
        self.assertEqual([], linked["entries"])
        self.assertTrue(linked["writable"])
        # Android may deny listing /. Verify the root boundary independently.
        with mock.patch.object(module.os, "access", return_value=True), mock.patch.object(module.os, "scandir") as scan:
            scan.return_value.__enter__.return_value = iter(())
            _, root = self.browse(path="/")
            self.assertIsNone(root["parent"])

    def test_missing_file_permissions_and_home(self):
        for path in (self.root / "missing", self.state / "token.json"):
            status, result = self.browse(path=str(path))
            self.assertEqual(400, status)
            self.assertEqual("error_folder_access", result["code"])
            self.assertNotIn("path", result)
        with mock.patch.object(module.os, "scandir", side_effect=PermissionError):
            self.assertEqual("error_folder_access", self.browse()[1]["code"])
        access = module.os.access
        with mock.patch.object(module.os, "access", side_effect=lambda path, mode: False if mode & module.os.W_OK else access(path, mode)):
            status, result = self.browse()
            self.assertEqual(200, status)
            self.assertFalse(result["writable"])
        with mock.patch.object(module.Path, "expanduser", return_value=self.root):
            status, result = self.api("POST", "/v1/folders", {})
            self.assertEqual(200, status)
            self.assertEqual(str(self.root), result["path"])

    def test_browsing_does_not_change_projects_or_live_sessions(self):
        session = self.launch()
        before = (self.state / "metadata.json").read_bytes()
        token = (self.state / "token.json").read_bytes()
        self.assertEqual(200, self.browse()[0])
        self.assertEqual(before, (self.state / "metadata.json").read_bytes())
        self.assertEqual(token, (self.state / "token.json").read_bytes())
        self.assertEqual(session, self.bridge.health()["session"]["id"])
        self.assertEqual("running", self.bridge.health()["session"]["state"])
