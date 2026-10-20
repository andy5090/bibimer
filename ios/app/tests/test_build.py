"""Guest packaging must preserve the fixed license and reject missing resources."""
import importlib.util
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('ios_app_build', Path(__file__).parents[1] / 'build.py')
build = importlib.util.module_from_spec(spec)
spec.loader.exec_module(build)


class GuestPackagingTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        for relative in ['bridge/bibimer_bridge.py', 'ios/bridge/bootstrap.sh', 'ios/bridge/run.py',
                         'ios/bridge/opencode_compat.py',
                         'ios/bridge/LICENSE.OPENCODE',
                         'engine/ios-linuxkit/app/RootfsPatch.bundle/files/lib/wasm-polyfill.js']:
            source = self.root / relative
            source.parent.mkdir(parents=True, exist_ok=True)
            source.write_bytes(b'packaged resource\n')

    def package(self):
        with patch.object(build, 'REPO', self.root), patch.object(build, 'ENGINE_WORK', self.root / 'engine'):
            build.package_guest(self.root / 'Guest')

    def test_missing_opencode_compatibility_patcher_rejects_packaging(self):
        (self.root / 'ios/bridge/opencode_compat.py').unlink()
        with self.assertRaisesRegex(RuntimeError, 'Missing guest resource: ios/opencode_compat.py'):
            self.package()

    def test_fixed_opencode_notice_is_copied_and_unrelated_text_is_excluded(self):
        notice = self.root / 'ios/bridge/LICENSE.OPENCODE'
        notice.write_bytes(b'MIT notice fixture\n')
        (notice.parent / 'unrelated.txt').write_bytes(b'not a packaged resource')
        self.package()
        self.assertEqual((self.root / 'Guest/ios/LICENSE.OPENCODE').read_bytes(), notice.read_bytes())
        self.assertFalse((self.root / 'Guest/ios/unrelated.txt').exists())

    def test_missing_opencode_notice_rejects_packaging(self):
        (self.root / 'ios/bridge/LICENSE.OPENCODE').unlink()
        with self.assertRaisesRegex(RuntimeError, 'Missing guest resource: ios/LICENSE.OPENCODE'):
            self.package()


if __name__ == '__main__':
    unittest.main()
