import json
import os
from pathlib import Path
import subprocess
import sys
import time
import uuid
from unittest import mock

from test_bridge import BridgeTestCase, module


class GitHubTests(BridgeTestCase):
    def setUp(self):
        super().setUp()
        self.bin = self.root / "bin"
        self.bin.mkdir()
        self.gh = self.bin / "gh"
        self.gh.write_text('#!' + sys.executable + '\n' + '''
import json, os, sys, time
from pathlib import Path
args = sys.argv[1:]
if args[:2] == ['auth', 'status']:
    if os.environ.get('FIXTURE_LEGACY_GH') == '1':
        if '--json' in args:
            print('unknown flag: --json', file=sys.stderr)
            sys.exit(1)
        print('PRIVATE_TOKEN_MUST_NEVER_ESCAPE', file=sys.stderr)
        sys.exit(1 if os.environ.get('FIXTURE_AUTH_FAILED') == '1' else 0)
    print(json.dumps([{'login':'fixture', 'state':'success'}]))
elif args[:2] == ['auth', 'login']:
    print('! First copy your one-time code: ABCD-1234', file=sys.stderr, flush=True)
    print('PRIVATE_TOKEN_MUST_NEVER_ESCAPE', file=sys.stderr, flush=True)
    time.sleep(30)
elif args[0] == 'api':
    if 'user' in args:
        print(json.dumps({'login':'fixture', 'token':'PRIVATE_TOKEN_MUST_NEVER_ESCAPE'}))
        sys.exit(0)
    page = 2 if 'page=2&' in ' '.join(args) else 1
    count = 50 if page == 1 else 1
    print(json.dumps([{'full_name':f'fixture/repo-{page}-{i}', 'private':True,
                      'description':'<b>literal</b>', 'archived':False,
                      'temp_clone_token':'PRIVATE_TOKEN_MUST_NEVER_ESCAPE'} for i in range(count)]))
else:
    sys.exit(1)
''')
        self.gh.chmod(0o700)
        self.env = mock.patch.dict(os.environ, {"PATH":str(self.bin) + os.pathsep + os.environ["PATH"]})
        self.env.start()
        self.repo = self.root / "source"
        subprocess.run(["git", "init", "-b", "main", str(self.repo)], check=True, capture_output=True)
        (self.repo / "hello.txt").write_text("repository data")
        subprocess.run(["git", "-C", str(self.repo), "add", "."], check=True, capture_output=True)
        subprocess.run(["git", "-C", str(self.repo), "-c", "user.name=Test", "-c", "user.email=test@example.invalid",
                        "commit", "-m", "fixture"], check=True, capture_output=True)

    def tearDown(self):
        self.bridge.github.close()
        self.env.stop()
        super().tearDown()

    def github(self, action, **data):
        return self.api("POST", "/v1/github", {"action":action, **data})

    def clone(self, **extra):
        return self.github("clone", **dict({"request_id":str(uuid.uuid4()), "repository":"fixture/repo",
            "parent":str(self.root), "name":"한글 clone", **extra}))

    def wait_job(self, key):
        deadline = time.monotonic() + 5
        while time.monotonic() < deadline:
            job = next(job for job in self.github("poll")[1]["jobs"] if job["id"] == key)
            if job["state"] not in module.GitHubImport.RUNNING:
                return job
            time.sleep(.02)
        self.fail("Import did not finish")

    def local_clone(self, job):
        return ["git", "clone", "--", str(self.repo), job["path"]]

    def test_auth_required_request_validation_and_allowlisted_repository_pagination(self):
        self.assertEqual(401, self.api("POST", "/v1/github", {"action":"login"}, auth=False)[0])
        self.assertEqual(403, self.api("POST", "/v1/github", {"action":"status"}, headers={"Origin":"https://github.com"})[0])
        self.assertEqual(400, self.github("invalid")[0])
        self.assertIn("github_import", self.bridge.health()["features"])
        status, data = self.github("status")
        self.assertEqual((200, "fixture"), (status, data["account"]))
        for page in (True, [], 0, 10001):
            self.assertEqual(400, self.github("repositories", page=page)[0])
        status, first = self.github("repositories")
        self.assertEqual((200, 50, 2), (status, len(first["entries"]), first["next"]))
        self.assertNotIn("PRIVATE_TOKEN", json.dumps(first))
        self.assertEqual({"name", "private", "description", "archived"}, set(first["entries"][0]))
        self.assertIsNone(self.github("repositories", page=2)[1]["next"])

    def test_device_login_has_only_code_and_cancel_kills_only_owned_process(self):
        self.assertEqual(200, self.github("login")[0])
        deadline = time.monotonic() + 3
        while time.monotonic() < deadline:
            data = self.github("poll")[1]
            if data["login"]["state"] == "waiting": break
            time.sleep(.02)
        self.assertEqual({"state":"waiting", "code":"ABCD-1234", "url":"https://github.com/login/device"}, data["login"])
        process = self.bridge.github.login_process
        self.assertEqual("waiting", self.github("login")[1]["login"]["state"])
        self.assertIs(process, self.bridge.github.login_process)
        self.assertNotIn("PRIVATE_TOKEN", json.dumps(data))
        self.assertEqual("idle", self.github("cancel_login")[1]["login"]["state"])
        self.assertIsNotNone(process.poll())
        for path in self.state.glob("*.json"):
            self.assertNotIn("ABCD-1234", path.read_text())
            self.assertNotIn("PRIVATE_TOKEN", path.read_text())

    def test_real_clone_registers_once_without_switching_or_stopping_session(self):
        live = self.launch()
        project = self.bridge.active_project_id
        key = str(uuid.uuid4())
        with mock.patch.object(self.bridge.github, "clone_command", side_effect=self.local_clone):
            status, started = self.clone(request_id=key)
            self.assertEqual(200, status)
            result = self.wait_job(key)
            self.assertEqual("complete", result["state"])
            self.assertEqual(result, self.clone(request_id=key)[1]["job"])
        self.assertEqual(2, len(self.bridge.projects))
        self.assertEqual(project, self.bridge.active_project_id)
        self.assertEqual("running", self.bridge.get_session(live).state)
        self.assertEqual("repository data", (Path(result["path"]) / "hello.txt").read_text())
        self.assertEqual(409, self.clone(request_id=key, name="another")[0])
        restored = module.Bridge(self.state)
        try:
            self.assertEqual(result, restored.github.snapshot()["jobs"][0])
            self.assertIn(result["project_id"], restored.projects)
            self.assertEqual(0o600, (self.state / "github-imports.json").stat().st_mode & 0o777)
        finally: restored.github.close()

    def test_live_git_progress_is_bounded_private_and_not_completion(self):
        key = str(uuid.uuid4())
        hundred, finish = self.root / "hundred", self.root / "finish"
        script = """
import os, sys, time
from pathlib import Path
os.write(2, b'PRIVATE_PROGRESS_OUTPUT' * 2000 + b'\\r')
os.write(2, b'Receiving ob')
os.write(2, b'jects: 42% (42/100), PRIVATE_PROGRESS_OUTPUT\\r')
os.write(2, b'Receiving objects: 999% (999/100), invalid\\r')
while not Path(sys.argv[1]).exists(): time.sleep(.01)
os.write(2, b'Receiving objects: 100% (100/100), done.\\r')
while not Path(sys.argv[2]).exists(): time.sleep(.01)
os.execvp('git', ['git', 'clone', '--', sys.argv[3], sys.argv[4]])
"""
        def command(job):
            return [sys.executable, "-c", script, str(hundred), str(finish), str(self.repo), job["path"]]
        def until_progress(percent):
            deadline = time.monotonic() + 4
            while time.monotonic() < deadline:
                data = self.github("poll")[1]
                job = next(row for row in data["jobs"] if row["id"] == key)
                self.assertNotIn("PRIVATE_PROGRESS_OUTPUT", json.dumps(data))
                if job.get("progress", {}).get("percent") == percent:
                    return job
                time.sleep(.02)
            self.fail("Native Git progress was not reported")
        with mock.patch.object(self.bridge.github, "clone_command", side_effect=command):
            try:
                self.assertEqual(200, self.clone(request_id=key)[0])
                job = until_progress(42)
                self.assertEqual({"phase": "receiving", "percent": 42}, job["progress"])
                self.assertEqual(job, self.clone(request_id=key)[1]["job"])
                self.assertNotIn("progress", (self.state / "github-imports.json").read_text())
                hundred.touch()
                self.assertEqual("cloning", until_progress(100)["state"])
                self.assertFalse(self.bridge.projects, "a Git stage at 100% does not register the project")
                finish.touch()
                completed = self.wait_job(key)
                self.assertEqual("complete", completed["state"])
                self.assertNotIn("progress", completed)
                self.assertIn(completed["project_id"], self.bridge.projects)
                self.assertNotIn("PRIVATE_PROGRESS_OUTPUT", (self.state / "github-imports.json").read_text())
            finally:
                hundred.touch(); finish.touch()

    def test_invalid_paths_and_existing_directories_files_links_never_overwritten(self):
        for key, values in {"repository":[None, "-x/a", "a/..", "https://github.com/a/b", "a/b;touch X"],
                            "parent":[None, "relative", "bad\0", str(self.root / "missing")],
                            "name":[None, "", "..", ".git", "a/b", "a\\b", "bad\n", " x", "한"*100]}.items():
            for value in values:
                self.assertEqual(400, self.clone(**{key:value})[0], (key, value))
        existing = self.root / "existing"; existing.mkdir(); (existing / "keep").write_text("keep")
        (self.root / "file").write_text("file")
        (self.root / "link").symlink_to(self.root / "missing")
        for name in ("existing", "file", "link"):
            self.assertEqual((409, "error_github_exists"), (lambda r:(r[0],r[1]["code"]))(self.clone(name=name)))
        self.assertEqual("keep", (existing / "keep").read_text())
        self.assertEqual([], self.github("poll")[1]["jobs"])

    def test_failed_clone_keeps_partial_files_and_never_registers(self):
        def fail(job):
            return [sys.executable, "-c", "from pathlib import Path; import sys; Path(sys.argv[1], 'partial').write_text('keep'); sys.exit(1)", job["path"]]
        with mock.patch.object(self.bridge.github, "clone_command", side_effect=fail):
            _, data = self.clone()
            job = self.wait_job(data["job"]["id"])
        self.assertEqual("failed", job["state"])
        self.assertEqual({}, self.bridge.projects)
        self.assertEqual("keep", (Path(job["path"]) / "partial").read_text())
        self.assertEqual(409, self.clone()[0])

    def test_cancel_concurrency_and_restart_do_not_claim_a_completed_clone(self):
        with mock.patch.object(self.bridge.github, "clone_command", return_value=[sys.executable,"-c","import time; time.sleep(30)"]):
            _, data = self.clone()
            key = data["job"]["id"]
            self.assertEqual(409, self.clone(name="second")[0])
            self.assertEqual("cancelled", self.github("cancel_clone", id=key)[1]["job"]["state"])
            self.assertEqual("cancelled", self.wait_job(key)["state"])
        self.assertEqual({}, self.bridge.projects)
        self.assertTrue(Path(data["job"]["path"]).is_dir())
        metadata = json.loads((self.state / "github-imports.json").read_text())
        metadata[0]["state"] = "cloning"
        module.save_json(self.state / "github-imports.json", metadata)
        restored = module.Bridge(self.state)
        try: self.assertEqual("interrupted", restored.github.snapshot()["jobs"][0]["state"])
        finally: restored.github.close()

    def test_command_pins_https_uses_native_credentials_without_global_git_changes(self):
        command = self.bridge.github.clone_command({"repository":"fixture/repo", "path":str(self.root / "quote's 한글")})
        self.assertEqual(["--", "https://github.com/fixture/repo.git", str(self.root / "quote's 한글")], command[-3:])
        self.assertIn("credential.helper=", command)
        self.assertIn("--template=", command)
        self.assertIn("--progress", command)
        self.assertIn("http.followRedirects=false", command)
        with mock.patch.dict(os.environ, {"GIT_TRACE":"1","GIT_ASKPASS":"evil", "GIT_CONFIG_COUNT":"4", "GH_DEBUG":"api"}):
            env = self.bridge.github.environment()
        for key in ("GIT_TRACE","GIT_ASKPASS","GIT_CONFIG_COUNT","GH_DEBUG"):
            self.assertNotIn(key, env)
        self.assertEqual(os.devnull, env["GIT_CONFIG_GLOBAL"])

    def test_missing_tools_and_cli_errors_are_sanitized(self):
        with mock.patch.object(module.shutil, "which", return_value=None):
            self.assertFalse(self.github("status")[1]["installed"])
            self.assertEqual("error_github_tools", self.github("login")[1]["code"])
        with mock.patch.object(module.subprocess, "run", return_value=subprocess.CompletedProcess([], 1, b"PRIVATE_TOKEN", b"PRIVATE_TOKEN")):
            status, data = self.github("repositories")
            self.assertEqual((400, "error_github_api"), (status, data["code"]))
            self.assertNotIn("PRIVATE_TOKEN", json.dumps(data))

    def test_legacy_cli_login_is_confirmed_without_auth_status_json(self):
        with mock.patch.dict(os.environ, {"FIXTURE_LEGACY_GH": "1"}):
            status, data = self.github("status")
            self.assertEqual((200, "fixture", False), (status, data["account"], data["auth_issue"]))
            self.assertNotIn("PRIVATE_TOKEN", json.dumps(data))
            self.assertNotIn("PRIVATE_TOKEN", "".join(path.read_text() for path in self.state.glob("*.json")))
            self.assertEqual(200, self.github("repositories")[0])

    def test_legacy_cli_without_valid_login_keeps_login_and_poll_available(self):
        with mock.patch.dict(os.environ, {"FIXTURE_LEGACY_GH": "1", "FIXTURE_AUTH_FAILED": "1"}):
            status, data = self.github("status")
            self.assertEqual((200, None, True), (status, data["account"], data["auth_issue"]))
            self.assertNotIn("PRIVATE_TOKEN", json.dumps(data))
            self.assertEqual(200, self.github("login")[0])
            self.assertEqual(200, self.github("poll")[0])
            self.assertEqual(200, self.github("cancel_login")[0])

    def test_auth_status_does_not_fallback_for_other_errors_or_report_false_login(self):
        unsupported = subprocess.CompletedProcess([], 1, b"", b"unknown flag: --json")
        success = subprocess.CompletedProcess([], 0, b"", b"")
        failed = subprocess.CompletedProcess([], 1, b"PRIVATE_TOKEN", b"PRIVATE_TOKEN")
        cases = ([failed], [unsupported, success, failed],
                 [unsupported, success, subprocess.CompletedProcess([], 0, b"[]", b"")],
                 [subprocess.CompletedProcess([], 0, b"[null]", b"")],
                 [subprocess.TimeoutExpired("gh", 18)])
        for responses in cases:
            with self.subTest(responses=len(responses)), mock.patch.object(module.subprocess, "run", side_effect=responses) as run:
                status, data = self.github("status")
                self.assertEqual((400, "error_github_api"), (status, data["code"]))
                self.assertEqual(len(responses), run.call_count)
                self.assertNotIn("PRIVATE_TOKEN", json.dumps(data))

    def test_storage_failure_does_not_leave_an_unstarted_clone_running(self):
        with mock.patch.object(module, "save_json", side_effect=OSError("fixture full disk")):
            status, error = self.clone()
        self.assertEqual((400, "error_github_clone"), (status, error["code"]))
        self.assertEqual("failed", self.github("poll")[1]["jobs"][0]["state"])
        self.assertFalse(self.bridge.github.processes)
        self.assertEqual({}, self.bridge.projects)
        with mock.patch.object(self.bridge.github, "clone_command", side_effect=self.local_clone):
            status, data = self.clone(name="after-failure")
            self.assertEqual(200, status)
            self.assertEqual("complete", self.wait_job(data["job"]["id"])["state"])
