"""Play SDK packaging contracts; all test inputs are local synthetic archives."""
import hashlib
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
import xml.etree.ElementTree as ET
import zipfile

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import build_apk
import play_sdk


class PlaySdkBuildTests(unittest.TestCase):
    def test_pins_official_artifacts_and_required_transitive_versions(self):
        lock = json.loads(play_sdk.LOCK.read_text())
        self.assertEqual(lock["repository"], "https://dl.google.com/dl/android/maven2/")
        versions = {(a["group"], a["artifact"]): a["version"] for a in lock["artifacts"]}
        self.assertEqual(len(versions), len(lock["artifacts"]))
        self.assertEqual(versions["com.google.android.play", "app-update"], "2.1.0")
        self.assertEqual(versions["com.google.android.gms", "play-services-basement"], "18.1.0")
        self.assertEqual(versions["com.google.android.gms", "play-services-tasks"], "18.0.2")
        self.assertEqual(versions["com.google.android.play", "core-common"], "2.0.3")
        self.assertEqual(versions["androidx.core", "core"], "1.2.0")
        self.assertEqual(versions["androidx.annotation", "annotation"], "1.1.0")
        for artifact in lock["artifacts"]:
            self.assertRegex(artifact["sha256"], r"^[a-f0-9]{64}$")
        # The implementation queries availability; no Activity Result/Kotlin addition.
        self.assertNotIn(("androidx.activity", "activity"), versions)

    def test_cached_dependency_corruption_is_rejected_without_network(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "artifact.aar").write_bytes(b"corrupted")
            with patch.object(build_apk, "TOOLS", root), patch.object(build_apk.urllib.request, "urlopen") as network:
                with self.assertRaises(RuntimeError):
                    build_apk.fetch("https://dl.google.com/artifact.aar", hashlib.sha256(b"original").hexdigest(), "sha256")
                network.assert_not_called()

    def test_required_library_manifest_entries_match_application(self):
        application = ET.parse(build_apk.SRC / "AndroidManifest.xml").getroot().find("application")
        library = ET.Element("manifest")
        app = ET.SubElement(library, "application", play_sdk.APPLICATION_ATTRIBUTES)
        for (tag, _), attrs in play_sdk.APPLICATION_ENTRIES.items():
            ET.SubElement(app, tag, attrs)
        play_sdk.verify_manifest(library, application)
        app.set(play_sdk.ANDROID + "unexpected", "true")
        with self.assertRaises(ValueError):
            play_sdk.verify_manifest(library, application)
        app.attrib.clear()
        ET.SubElement(library, "uses-permission", {play_sdk.ANDROID + "name": "unexpected"})
        with self.assertRaises(ValueError):
            play_sdk.verify_manifest(library, application)

    def test_extracts_jars_resources_and_notices_from_verified_inputs(self):
        data = io.BytesIO()
        with zipfile.ZipFile(data, "w") as archive:
            archive.writestr("AndroidManifest.xml", '<manifest package="sdk.test"><application /></manifest>')
            archive.writestr("classes.jar", b"library-classes")
            archive.writestr("res/values/styles.xml", b"library-resources")
            archive.writestr("LICENSE", b"library-license")
        payload = data.getvalue()
        lock = {"repository": "https://dl.google.com/dl/android/maven2/", "artifacts": [
            {"group": "sdk", "artifact": "test", "version": "1.0.0", "type": "aar",
             "package": "sdk.test", "sha256": hashlib.sha256(payload).hexdigest()}]}
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            lock_path = root / "lock.json"
            lock_path.write_text(json.dumps(lock))
            with patch.object(play_sdk, "LOCK", lock_path), patch.object(build_apk, "fetch", return_value=payload) as fetch:
                jars, resources, packages = play_sdk.prepare(fetch, root / "tools", root / "assets",
                                                           build_apk.SRC / "AndroidManifest.xml")
            fetch.assert_called_once_with("https://dl.google.com/dl/android/maven2/sdk/test/1.0.0/test-1.0.0.aar",
                                          lock["artifacts"][0]["sha256"], "sha256")
            self.assertEqual(jars[0].read_bytes(), b"library-classes")
            self.assertEqual((resources[0] / "values/styles.xml").read_bytes(), b"library-resources")
            self.assertEqual(packages, ["sdk.test"])
            self.assertEqual((root / "assets/vendor/play-sdk/sdk.test-1.0.0/LICENSE").read_bytes(), b"library-license")

    def test_compiler_links_resources_generates_library_r_and_dexes_library_classes(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(build_apk, "run") as run:
            root = Path(directory)
            jars, resources, packages = [root / "library.jar"], [root / "library-res"], ["sdk.test"]
            build_apk.compile_android(Path("android.jar"), root / "build", libraries=(jars, resources, packages), review_digest="")
            calls = [call.args for call in run.call_args_list]
            link = next(args for args in calls if args[:2] == ("aapt2", "link"))
            self.assertEqual(link[link.index("--extra-packages") + 1], "sdk.test")
            self.assertIn(root / "build/library-resources-0.zip", link)
            javac = next(args for args in calls if args[0] == "javac")
            self.assertIn(str(jars[0]), javac[javac.index("-classpath") + 1])
            self.assertIn(jars[0], next(args for args in calls if args[0] == "d8"))

    def test_bridge_version_is_generated_from_source_and_invalid_source_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            generated = build_apk.write_review_access_config(root / "build", "").read_text()
            self.assertIn('BRIDGE_VERSION = "' + build_apk.bundled_bridge_version() + '"', generated)
            (root / "bridge").mkdir()
            for content in ['VERSION = "bad"', 'VERSION = "1.2.3"\nVERSION = "2.0.0"']:
                (root / "bridge/bibimer_bridge.py").write_text(content)
                with patch.object(build_apk, "ROOT", root), self.assertRaises(ValueError):
                    build_apk.bundled_bridge_version()


if __name__ == "__main__":
    unittest.main()
