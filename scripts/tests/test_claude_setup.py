"""Exercise the real native clipboard command without Downloads or an installed bridge."""
import base64
import hashlib
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch
import zlib
import json

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import build_apk

ROOT = Path(__file__).resolve().parents[2]
JAVA = ROOT / "android/app/src/main/java/app/bibimer"


class ClaudeSetupTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.compiled = tempfile.TemporaryDirectory(prefix="bibimer-claude-java-")
        subprocess.run(["javac", "--release", "8", "-d", cls.compiled.name,
                        str(JAVA / "ClaudeSetup.java"),
                        str(Path(__file__).with_name("ClaudeSetupTest.java"))],
                       check=True, capture_output=True, text=True)

    @classmethod
    def tearDownClass(cls):
        cls.compiled.cleanup()

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="bibimer-claude-setup-")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.home = self.root / "home with spaces"
        self.home.mkdir()
        self.bin = self.root / "bin"
        self.bin.mkdir()
        self.env = {**os.environ, "HOME": str(self.home), "PATH": str(self.bin),
                    "BIBIMER_TEST_NPM": str(self.root / "npm.json"),
                    "BIBIMER_TEST_PKG": str(self.root / "pkg.json")}
        self.env.pop("BASH_ENV", None)
        self.env.pop("ENV", None)
        for name in ["bash", "node", "python"]:
            (self.bin / name).symlink_to(shutil.which(name))
        npm = self.bin / "npm"
        npm.write_text("#!" + sys.executable + "\nimport json,os,pathlib,sys\n" +
                       "pathlib.Path(os.environ['BIBIMER_TEST_NPM']).write_text(json.dumps(sys.argv[1:]))\n" +
                       "raise SystemExit(int(os.environ.get('BIBIMER_TEST_NPM_EXIT','0')))\n")
        npm.chmod(0o700)

    def command(self, script, language="ko"):
        asset = self.root / "bundled.sh"
        asset.write_text(script)
        result = subprocess.run(["java", "-cp", self.compiled.name, "app.bibimer.ClaudeSetupTest",
                                 str(asset), language], check=True, capture_output=True, text=True)
        # Simulate the fixed Termux root when running these tests on a desktop host.
        return result.stdout.replace("/data/data/com.termux/files/usr", str(self.bin))

    def run_command(self, command):
        subprocess.run([shutil.which("bash"), "-n"], input=command, text=True,
                       check=True, capture_output=True)
        return subprocess.run([shutil.which("bash"), "--noprofile", "--norc", "-s"],
                              input=command, text=True, env=self.env, cwd=self.home,
                              capture_output=True, timeout=10)

    def assert_sdk_arguments(self):
        self.assertEqual(["install", "--prefix", str(self.home / ".local/share/bibimer/claude"),
                          "--ignore-scripts", "--omit=optional", "--no-audit", "--no-fund",
                          "@anthropic-ai/claude-agent-sdk@0.3.283"],
                         json.loads((self.root / "npm.json").read_text()))

    def test_native_adapter_command_works_without_downloads_or_bridge(self):
        marker = self.home / "existing-session"
        marker.write_bytes(b"must remain intact")
        for language in ["en", "ko"]:
            with self.subTest(language=language):
                command = self.command(build_apk.claude_setup(), language)
                self.assertNotIn("downloads", command)
                self.assertNotIn("bibimer-setup.sh", command)
                result = self.run_command(command)
                self.assertEqual(0, result.returncode, result.stderr)
                self.assertIn("공식 Claude" if language == "ko" else "official Claude", result.stdout)
                self.assert_sdk_arguments()
                self.assertEqual(b"must remain intact", marker.read_bytes())
                self.assertFalse((self.home / "storage").exists())
                self.assertFalse((self.home / ".local/state/bibimer").exists())
                self.assertFalse((self.home / ".local/share/bibimer/bibimer_bridge.py").exists())

    def fake_repair(self):
        source_root = self.root / "sources"
        bridge = source_root / "bridge"
        bridge.mkdir(parents=True)
        shutil.copyfile(ROOT / "bridge/claude_setup.sh", bridge / "claude_setup.sh")
        (bridge / "repair_claude_termux.py").write_text(
            "from pathlib import Path\ndef main():\n" +
            "    target=Path.home()/'.local/share/bibimer/claude-runtime'\n" +
            "    target.mkdir(parents=True, exist_ok=True)\n" +
            "    (target / 'controlled-runtime').write_text('verified repair invoked')\n")
        with patch.object(build_apk, "ROOT", source_root):
            return build_apk.claude_setup(repair=True)

    def test_repair_embeds_its_helper_instead_of_requiring_an_installed_file(self):
        result = self.run_command(self.command(self.fake_repair()))
        self.assertEqual(0, result.returncode, result.stderr)
        self.assert_sdk_arguments()
        self.assertEqual("verified repair invoked", (self.home / ".local/share/bibimer/claude-runtime/controlled-runtime").read_text())
        self.assertFalse((self.home / ".local/share/bibimer/repair_claude_termux.py").exists())
        self.assertFalse((self.home / "storage").exists())

    def test_missing_dependencies_are_prepared_without_shared_storage(self):
        (self.bin / "node").unlink()
        (self.bin / "python").unlink()
        pkg = self.bin / "pkg"
        pkg.write_text("#!" + sys.executable + "\nimport json,os,pathlib,sys\n" +
                       "p=pathlib.Path(__file__).parent\n" +
                       "with open(os.environ['BIBIMER_TEST_PKG'],'a') as f: f.write(json.dumps(sys.argv[1:])+'\\n')\n" +
                       "if 'nodejs-lts' in sys.argv: (p/'node').symlink_to(" + repr(shutil.which("node")) + ")\n" +
                       "if 'python' in sys.argv: (p/'python').symlink_to(sys.executable)\n")
        pkg.chmod(0o700)
        result = self.run_command(self.command(self.fake_repair()))
        self.assertEqual(0, result.returncode, result.stderr)
        self.assertEqual([["install", "-y", "nodejs-lts", "npm"], ["install", "-y", "python"]],
                         [json.loads(line) for line in (self.root / "pkg.json").read_text().splitlines()])
        self.assert_sdk_arguments()
        self.assertTrue((self.home / ".local/share/bibimer/claude-runtime/controlled-runtime").exists())

    def test_failed_sdk_or_corrupted_payload_never_runs_repair(self):
        script = self.fake_repair()
        self.env["BIBIMER_TEST_NPM_EXIT"] = "7"
        result = self.run_command(self.command(script))
        self.assertEqual(7, result.returncode)
        self.assertFalse((self.home / ".local/share/bibimer/claude-runtime").exists())
        self.env.pop("BIBIMER_TEST_NPM_EXIT")
        digest = re.search(r'hexdigest\(\) != "([a-f0-9]{64})"', script).group(1)
        result = self.run_command(self.command(script.replace(digest, "0" * 64)))
        self.assertNotEqual(0, result.returncode)
        self.assertFalse((self.home / ".local/share/bibimer/claude-runtime").exists())

    def test_real_repair_payload_matches_source_and_command_is_bounded(self):
        script = build_apk.claude_setup(repair=True)
        payload = re.search(r'base64.b64decode\("([A-Za-z0-9+/=]+)"\)', script).group(1)
        source = zlib.decompress(base64.b64decode(payload))
        self.assertEqual((ROOT / "bridge/repair_claude_termux.py").read_bytes(), source)
        self.assertIn(hashlib.sha256(source).hexdigest(), script)
        command = self.command(script)
        self.assertLess(len(command.encode("utf-8")), 32000)
        self.assertNotIn("downloads", command)
        subprocess.run([shutil.which("bash"), "-n"], input=command, text=True, check=True, capture_output=True)
        check = subprocess.run(["java", "-cp", self.compiled.name, "app.bibimer.ClaudeSetupTest"],
                               check=True, capture_output=True, text=True)
        self.assertIn("language constrained", check.stdout)


if __name__ == "__main__":
    unittest.main()
