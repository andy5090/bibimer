"""Fixed-build compatibility patch guards; no CLI or model is executed."""
import contextlib
import hashlib
import importlib.util
import os
from pathlib import Path
import stat
import subprocess
import sys
import json
import tempfile
import unittest
from unittest.mock import patch

IOS = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("ios_opencode_compat", IOS / "opencode_compat.py")
compat = importlib.util.module_from_spec(spec)
spec.loader.exec_module(compat)


def sha(path):
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


class FixedPatchTests(unittest.TestCase):
    @contextlib.contextmanager
    def fixture(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary).resolve()
            original = b"prefix_" * 6 + compat.ORIGINAL_REGION + b"_suffix" * 23
            replacement = compat._patched_region()
            expected = original[:42] + replacement + original[42 + compat.LENGTH:]
            source, destination = root / "source", root / "destination"
            source.write_bytes(original)
            source.chmod(0o751)
            destination.write_bytes(b"keep existing destination")
            with patch.multiple(compat, SOURCE_SIZE=len(original), OFFSET=42, CHUNK_SIZE=97,
                                SOURCE_SHA256=hashlib.sha256(original).hexdigest(),
                                PATCHED_SHA256=hashlib.sha256(expected).hexdigest()):
                yield root, source, destination, original, expected

    def assert_no_temporary(self, root):
        self.assertEqual(list(root.glob(".bibimer-opencode-compat-*")), [])

    def test_copy_exactly_changes_fixed_region_and_preserves_mode_then_is_idempotent(self):
        with self.fixture() as (root, source, destination, original, expected):
            info = compat.patch_executable(source, destination)
            self.assertFalse(info["alreadyPatched"])
            self.assertEqual(source.read_bytes(), original)
            self.assertEqual(destination.read_bytes(), expected)
            self.assertEqual(destination.stat().st_size, source.stat().st_size)
            self.assertEqual(stat.S_IMODE(destination.stat().st_mode), 0o751)
            inode = destination.stat().st_ino
            info = compat.patch_executable(destination)
            self.assertTrue(info["alreadyPatched"])
            self.assertEqual(destination.stat().st_ino, inode)
            second = root / "second"
            self.assertTrue(compat.patch_executable(destination, second)["alreadyPatched"])
            self.assertEqual(second.read_bytes(), expected)
            self.assert_no_temporary(root)

    def test_in_place_publication_is_atomic_and_retains_permissions(self):
        with self.fixture() as (root, source, destination, original, expected):
            previous_inode = source.stat().st_ino
            compat.patch_executable(source)
            self.assertEqual(source.read_bytes(), expected)
            self.assertNotEqual(source.stat().st_ino, previous_inode)
            self.assertEqual(stat.S_IMODE(source.stat().st_mode), 0o751)
            self.assert_no_temporary(root)

    def test_unknown_same_size_and_wrong_size_are_rejected_without_target_change(self):
        with self.fixture() as (root, source, destination, original, expected):
            for invalid in (b"X" + original[1:], original + b"X"):
                source.write_bytes(invalid)
                with self.assertRaises(compat.PatchError):
                    compat.patch_executable(source, destination)
                self.assertEqual(destination.read_bytes(), b"keep existing destination")
                self.assertEqual(source.read_bytes(), invalid)
                self.assert_no_temporary(root)

    def test_region_unique_and_fixed_offset_guards_remain_independent(self):
        with self.fixture() as (root, source, destination, original, expected):
            for invalid in (original + compat.ORIGINAL_REGION, b"X" + original):
                source.write_bytes(invalid)
                with patch.multiple(compat, SOURCE_SIZE=len(invalid), SOURCE_SHA256=hashlib.sha256(invalid).hexdigest()):
                    with self.assertRaisesRegex(compat.PatchError, "unique at the fixed offset"):
                        compat.patch_executable(source, destination)
                self.assertEqual(destination.read_bytes(), b"keep existing destination")
                self.assert_no_temporary(root)

    def test_symlink_and_nonregular_inputs_and_destinations_are_rejected(self):
        with self.fixture() as (root, source, destination, original, expected):
            link = root / "link"
            link.symlink_to(source)
            for input_path in (link, root):
                with self.assertRaises((OSError, compat.PatchError)):
                    compat.patch_executable(input_path, destination)
            destination.unlink()
            destination.symlink_to(source)
            with self.assertRaises(compat.PatchError):
                compat.patch_executable(source, destination)
            self.assertTrue(destination.is_symlink())
            self.assertEqual(source.read_bytes(), original)
            self.assert_no_temporary(root)

    def test_write_and_publication_failures_preserve_existing_destination(self):
        with self.fixture() as (root, source, destination, original, expected):
            for target in ("_write_all", "os.replace"):
                owner, attribute = (compat, target) if target == "_write_all" else (compat.os, "replace")
                with patch.object(owner, attribute, side_effect=OSError("synthetic write failure")):
                    with self.assertRaises(OSError):
                        compat.patch_executable(source, destination)
                self.assertEqual(source.read_bytes(), original)
                self.assertEqual(destination.read_bytes(), b"keep existing destination")
                self.assert_no_temporary(root)

    def test_source_path_swap_and_already_copied_byte_mutation_are_rejected(self):
        for action in ("swap", "modify"):
            with self.fixture() as (root, source, destination, original, expected):
                write = compat._write_all
                changed = False
                def mutate(descriptor, block):
                    nonlocal changed
                    write(descriptor, block)
                    if changed:
                        return
                    changed = True
                    if action == "swap":
                        replacement = root / "replacement"
                        replacement.write_bytes(original)
                        os.replace(replacement, source)
                    else:
                        with source.open("r+b") as stream:
                            stream.write(b"X")
                with patch.object(compat, "_write_all", side_effect=mutate):
                    with self.assertRaisesRegex(compat.PatchError, "Source"):
                        compat.patch_executable(source, destination)
                self.assertEqual(destination.read_bytes(), b"keep existing destination")
                self.assert_no_temporary(root)

    def test_disk_readback_rejects_corruption_before_publication(self):
        with self.fixture() as (root, source, destination, original, expected):
            write = compat._write_all
            def corrupt(descriptor, block):
                write(descriptor, b"X" + block[1:])
            with patch.object(compat, "_write_all", side_effect=corrupt):
                with self.assertRaisesRegex(compat.PatchError, "SHA256"):
                    compat.patch_executable(source, destination)
            self.assertEqual(source.read_bytes(), original)
            self.assertEqual(destination.read_bytes(), b"keep existing destination")
            self.assert_no_temporary(root)

    def test_destination_race_is_rejected_without_overwriting_concurrent_change(self):
        with self.fixture() as (root, source, destination, original, expected):
            write = compat._write_all
            def change_destination(descriptor, block):
                write(descriptor, block)
                destination.write_bytes(b"concurrent destination")
            with patch.object(compat, "_write_all", side_effect=change_destination):
                with self.assertRaisesRegex(compat.PatchError, "Destination changed"):
                    compat.patch_executable(source, destination)
            self.assertEqual(destination.read_bytes(), b"concurrent destination")
            self.assert_no_temporary(root)

    def test_actual_fixed_elf_copy_has_expected_hash_and_no_other_changed_bytes(self):
        source = IOS.parents[1] / ".tools/ios-runtime/opencode-original-1.19.3.elf"
        if not source.exists():
            self.skipTest("Pinned official ELF is not staged for host validation")
        self.assertEqual(sha(source), compat.SOURCE_SHA256)
        with tempfile.TemporaryDirectory() as temporary:
            destination = Path(temporary) / "patched-opencode"
            process = subprocess.run([sys.executable, str(IOS / "opencode_compat.py"), str(source), "--output", str(destination)],
                                     capture_output=True, text=True, timeout=30)
            self.assertEqual(process.returncode, 0, process.stdout + process.stderr)
            self.assertEqual(process.stderr, "")
            metadata = json.loads(process.stdout)
            self.assertEqual(metadata["patchedSha256"], compat.PATCHED_SHA256)
            self.assertNotIn(str(source), process.stdout)
            self.assertEqual(sha(destination), compat.PATCHED_SHA256)
            self.assertEqual(destination.stat().st_size, compat.SOURCE_SIZE)
            self.assertEqual(stat.S_IMODE(destination.stat().st_mode), stat.S_IMODE(source.stat().st_mode))
            with source.open("rb") as before, destination.open("rb") as after:
                position = 0
                while chunk := before.read(1024 * 1024):
                    actual = after.read(len(chunk))
                    left = min(max(compat.OFFSET - position, 0), len(chunk))
                    right = min(max(compat.OFFSET + compat.LENGTH - position, 0), len(chunk))
                    self.assertEqual(actual[:left], chunk[:left])
                    self.assertEqual(actual[right:], chunk[right:])
                    position += len(chunk)
            self.assertEqual(sha(source), compat.SOURCE_SHA256)
            inode = destination.stat().st_ino
            self.assertTrue(compat.patch_executable(destination)["alreadyPatched"])
            self.assertEqual(destination.stat().st_ino, inode)


if __name__ == "__main__":
    unittest.main()
