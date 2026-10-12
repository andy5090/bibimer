import pathlib
import re
import subprocess
import tempfile
import unittest


ROOT = pathlib.Path(__file__).resolve().parents[2]
JAVA = ROOT / "android/app/src/main/java/app/bibimer"


class ReviewAccessTests(unittest.TestCase):
    def test_digest_verifier_and_legacy_preferences(self):
        with tempfile.TemporaryDirectory(prefix="bibimer-review-test-") as directory:
            subprocess.run([
                "javac", "-d", directory, str(JAVA / "ReviewAccess.java"),
                str(pathlib.Path(__file__).with_name("ReviewAccessTest.java")),
            ], check=True, capture_output=True, text=True)
            result = subprocess.run([
                "java", "-cp", directory, "app.bibimer.ReviewAccessTest",
            ], check=True, capture_output=True, text=True)
            self.assertIn("assertions passed", result.stdout)
            print(result.stdout.strip())

    def test_direct_native_enable_cannot_bypass_code(self):
        source = (JAVA / "MainActivity.java").read_text()
        method = re.search(
            r"public void setDemoMode\(boolean enabled\) \{[\s\S]*?\n        \}", source,
        ).group(0)
        harness = """public final class NativeEntryBoundary {
            int entered, exited;
            void runOnUiThread(Runnable action) { action.run(); }
            void changeDemoMode(boolean enabled) { if (enabled) entered++; else exited++; }
            %s
            public static void main(String[] args) {
                NativeEntryBoundary api = new NativeEntryBoundary();
                api.setDemoMode(true);
                if (api.entered != 0 || api.exited != 0) throw new AssertionError("Direct enable bypass");
                api.setDemoMode(false);
                if (api.exited != 1) throw new AssertionError("Exit unavailable");
                System.out.println("Native entry: direct true denied, false exits");
            }
        }""" % method
        with tempfile.TemporaryDirectory(prefix="bibimer-native-review-test-") as directory:
            test_file = pathlib.Path(directory) / "NativeEntryBoundary.java"
            test_file.write_text(harness)
            subprocess.run(["javac", "-d", directory, str(test_file)], check=True, capture_output=True, text=True)
            result = subprocess.run(["java", "-cp", directory, "NativeEntryBoundary"], check=True, capture_output=True, text=True)
            self.assertIn("direct true denied", result.stdout)


if __name__ == "__main__":
    unittest.main()
