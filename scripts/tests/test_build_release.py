"""Release packaging checks without downloading tools or building/installing an APK."""
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch
import zipfile

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import build_aab
import build_apk


class ReleaseBuildTests(unittest.TestCase):
    def test_module_preserves_resources_assets_and_dex(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            resources, output = root / "resources.zip", root / "base.zip"
            entries = {"AndroidManifest.xml": b"manifest-protobuf", "resources.pb": b"table-protobuf",
                       "res/xml/network_security_config.xml": b"network-protobuf",
                       "assets/fonts/SpaceGrotesk-Bold.woff2": b"font",
                       "assets/bibimer-setup.sh": b"bundled-installer"}
            with zipfile.ZipFile(resources, "w") as archive:
                for name, data in entries.items():
                    archive.writestr(name, data)
            dex = root / "dex"
            dex.mkdir()
            (dex / "classes.dex").write_bytes(b"first-dex")
            (dex / "classes2.dex").write_bytes(b"second-dex")
            build_aab.pack_module(resources, dex, output)
            with zipfile.ZipFile(output) as archive:
                expected = {("manifest/" + name if name == "AndroidManifest.xml" else name): data
                            for name, data in entries.items()}
                expected.update({"dex/classes.dex": b"first-dex", "dex/classes2.dex": b"second-dex"})
                self.assertEqual({name: archive.read(name) for name in archive.namelist()}, expected)

    def test_rejects_binary_resources_or_missing_dex(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            resources = root / "resources.zip"
            for table in ("resources.arsc", "resources.pb"):
                with self.subTest(table=table):
                    with zipfile.ZipFile(resources, "w") as archive:
                        archive.writestr("AndroidManifest.xml", b"manifest")
                        archive.writestr(table, b"table")
                    with self.assertRaises(ValueError):
                        build_aab.pack_module(resources, root, root / "base.zip")

    def test_compiler_uses_separate_output_and_proto_only_for_bundle(self):
        with tempfile.TemporaryDirectory() as folder:
            for proto in (False, True):
                with self.subTest(proto=proto), patch.object(build_apk, "run") as run:
                    output = Path(folder) / str(proto)
                    build_apk.compile_android(Path("android.jar"), output, proto=proto)
                    link = next(call.args for call in run.call_args_list if call.args[:2] == ("aapt2", "link"))
                    self.assertEqual("--proto-format" in link, proto)
                    self.assertIn(output / "unsigned.apk", link)
                    self.assertFalse(any(call.args[0] in ("keytool", "apksigner") for call in run.call_args_list))

    def test_both_app_languages_are_kept(self):
        dimensions = build_aab.BUNDLE_CONFIG["optimizations"]["splitsConfig"]["splitDimension"]
        self.assertIn({"value": "LANGUAGE", "negate": True}, dimensions)
        self.assertEqual(build_aab.manifest_info()["targetSdk"], 36)

    def test_missing_signing_configuration_fails_before_tool_execution(self):
        with patch.dict(os.environ, {}, clear=True), patch.object(subprocess, "run") as run:
            with self.assertRaises(ValueError):
                build_aab.signing_config()
            run.assert_not_called()

    def test_development_certificate_is_rejected_and_password_not_in_arguments(self):
        with tempfile.TemporaryDirectory() as folder:
            key = Path(folder) / "upload.jks"
            key.touch(mode=0o600)
            environment = {"BIBIMER_UPLOAD_KEYSTORE": str(key), "BIBIMER_UPLOAD_ALIAS": "upload",
                           "BIBIMER_STORE_PASSWORD": "test-password-not-for-a-real-key"}
            result = subprocess.CompletedProcess([], 0, "PrivateKeyEntry\nCN=Bibimer Local Development", "")
            with patch.dict(os.environ, environment, clear=True), patch.object(subprocess, "run", return_value=result) as run:
                with self.assertRaisesRegex(ValueError, "개발 인증서"):
                    build_aab.signing_config()
                self.assertNotIn(environment["BIBIMER_STORE_PASSWORD"], run.call_args.args[0])
                self.assertIn("-storepass:env", run.call_args.args[0])

    def test_check_mode_does_not_download_build_or_generate_keys(self):
        with patch.object(sys, "argv", ["build_aab.py", "--unsigned", "--check"]), \
                patch.object(build_aab.shutil, "which", return_value="present"), \
                patch.object(build_apk, "prepare_inputs") as prepare, \
                patch.object(build_apk, "compile_android") as compile_code, \
                patch.object(build_apk, "fetch") as fetch, patch("builtins.print"):
            build_aab.main()
            prepare.assert_not_called()
            compile_code.assert_not_called()
            fetch.assert_not_called()


if __name__ == "__main__":
    unittest.main()
