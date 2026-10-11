import pathlib
import subprocess
import tempfile
import unittest


ROOT = pathlib.Path(__file__).resolve().parents[2]
JAVA = ROOT / "android/app/src/main/java/app/bibimer"


class DemoWorkspaceTests(unittest.TestCase):
    def test_account_free_protocol_and_isolation(self):
        with tempfile.TemporaryDirectory(prefix="bibimer-demo-test-") as directory:
            subprocess.run([
                "javac", "-d", directory, str(JAVA / "DemoWorkspace.java"),
                str(JAVA / "NormalDraftStore.java"),
                str(pathlib.Path(__file__).with_name("DemoWorkspaceTest.java")),
            ], check=True, capture_output=True, text=True)
            result = subprocess.run([
                "java", "-cp", directory, "app.bibimer.DemoWorkspaceTest",
            ], check=True, capture_output=True, text=True)
            self.assertIn("behavioral assertions passed", result.stdout)
            print(result.stdout.strip())

    def test_demo_core_has_no_device_or_provider_access(self):
        source = (JAVA / "DemoWorkspace.java").read_text()
        for forbidden in ("java.io.", "java.net.", "ProcessBuilder", "Runtime.getRuntime", "TokenStore", "System.getenv", "android."):
            self.assertNotIn(forbidden, source)


if __name__ == "__main__":
    unittest.main()
