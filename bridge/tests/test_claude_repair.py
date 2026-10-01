import base64
import contextlib
import hashlib
import importlib.util
import io
from pathlib import Path
import tarfile
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("repair", Path(__file__).parents[1] / "repair_claude_termux.py")
repair = importlib.util.module_from_spec(spec)
spec.loader.exec_module(repair)


class RepairTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        loader = self.root / "prefix/glibc/lib/ld-linux-aarch64.so.1"
        loader.parent.mkdir(parents=True)
        loader.touch()
        self.target = self.root / "runtime"
        self.target.mkdir()
        (self.target / "claude").write_text("existing launcher")
        self.archive = self.root / "package.tgz"
        with tarfile.open(self.archive, "w:gz") as bundle:
            for name in ["package/claude", "../../unexpected"]:
                member = tarfile.TarInfo(name)
                payload = b"controlled executable"
                member.size = len(payload)
                bundle.addfile(member, io.BytesIO(payload))
        self.integrity = base64.b64encode(hashlib.sha512(self.archive.read_bytes()).digest()).decode()
        self.stack = contextlib.ExitStack()
        self.addCleanup(self.stack.close)
        for mocked in [patch.object(repair, "PREFIX", self.root / "prefix"),
                       patch.object(repair.platform, "machine", return_value="aarch64"),
                       patch.object(repair.shutil, "which", return_value="/fixture/rg"),
                       contextlib.redirect_stdout(io.StringIO())]:
            self.stack.enter_context(mocked)

    def test_integrity_failure_keeps_existing_runtime(self):
        with patch.object(repair, "INTEGRITY", "invalid"), patch.object(repair.subprocess, "run") as run:
            with self.assertRaises(RuntimeError):
                repair.install(self.target, self.archive)
            run.assert_not_called()
        self.assertEqual("existing launcher", (self.target / "claude").read_text())
        self.assertEqual(["claude"], [p.name for p in self.target.iterdir()])

    def test_failed_runtime_probe_keeps_existing_launcher(self):
        with patch.object(repair, "INTEGRITY", self.integrity), patch.object(repair.subprocess, "run", return_value=SimpleNamespace(returncode=1, stdout="")):
            with self.assertRaises(RuntimeError):
                repair.install(self.target, self.archive)
        self.assertEqual("existing launcher", (self.target / "claude").read_text())

    def test_verified_runtime_extracts_only_expected_binary(self):
        with patch.object(repair, "INTEGRITY", self.integrity), patch.object(repair.subprocess, "run", return_value=SimpleNamespace(returncode=0, stdout=repair.VERSION + " (Claude Code)\n")):
            repair.install(self.target, self.archive)
        binaries = list(self.target.glob("claude-*-*"))
        self.assertEqual(1, len(binaries))
        self.assertEqual(b"controlled executable", binaries[0].read_bytes())
        self.assertEqual(0o700, binaries[0].stat().st_mode & 0o777)
        self.assertEqual(0o700, (self.target / "claude").stat().st_mode & 0o777)
        self.assertIn(str(binaries[0]), (self.target / "claude").read_text())
        self.assertFalse((self.root / "unexpected").exists())
