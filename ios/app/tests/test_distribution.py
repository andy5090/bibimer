"""Boundaries for packaging an independently compiled device app with Xcode."""
import importlib.util
from datetime import datetime, timedelta, timezone
import json
from pathlib import Path
import plistlib
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('distribution', Path(__file__).parents[1] / 'distribute.py')
distribution = importlib.util.module_from_spec(spec)
spec.loader.exec_module(distribution)


class DistributionTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)

    def test_explicit_values_reject_shell_and_project_injection(self):
        for values in [('BAD', 'app.bibimer.ios', '0.1.0', '1'),
                       (None, 'app.bibimer";x', '0.1.0', '1'),
                       (None, 'app.bibimer.ios', '1.0-beta', '1'),
                       (None, 'app.bibimer.ios', '0.1.0', '0')]:
            with self.subTest(values=values), self.assertRaises(distribution.DistributionError):
                distribution.validate_values(*values)
        distribution.validate_values('ABCDEFGHIJ', 'app.bibimer.ios', '0.1.0', '1')

    def test_simulator_rejected_before_invoking_xcode(self):
        app = self.root / 'Bibimer.app'
        app.mkdir()
        (app / 'Info.plist').write_bytes(plistlib.dumps({'CFBundleExecutable': 'Bibimer'}))
        (app / 'Bibimer').write_bytes(b'executable')
        (app / 'build-manifest.json').write_text(json.dumps({'sdk': 'iphonesimulator'}))
        with patch.object(distribution, 'checked') as checked:
            with self.assertRaisesRegex(distribution.DistributionError, 'Simulator'):
                distribution.validate_app(app)
        checked.assert_not_called()

    def test_changed_executable_rejected_before_invoking_xcode(self):
        app = self.root / 'Bibimer.app'
        app.mkdir()
        (app / 'Info.plist').write_bytes(plistlib.dumps({'CFBundleExecutable': 'Bibimer'}))
        (app / 'Bibimer').write_bytes(b'modified executable')
        (app / 'build-manifest.json').write_text(json.dumps({'sdk': 'iphoneos', 'preSigningBinarySHA256': 'old'}))
        with patch.object(distribution, 'checked') as checked:
            with self.assertRaisesRegex(distribution.DistributionError, 'differs'):
                distribution.validate_app(app)
        checked.assert_not_called()

    def test_export_is_local_preserves_build_and_contains_no_upload_credentials(self):
        options = distribution.export_options('ABCDEFGHIJ')
        self.assertEqual(options['destination'], 'export')
        self.assertEqual(options['method'], 'app-store-connect')
        self.assertFalse(options['manageAppVersionAndBuildNumber'])
        self.assertFalse(any('key' in key.lower() or 'password' in key.lower() for key in options))

    def archive(self):
        archive = self.root / 'Bibimer.xcarchive'
        app = archive / 'Products/Applications/Bibimer.app'
        app.mkdir(parents=True)
        (archive / 'Info.plist').write_bytes(plistlib.dumps({'ApplicationProperties': {'ApplicationPath': 'Applications/Bibimer.app'}}))
        (app / 'Info.plist').write_bytes(plistlib.dumps(dict(CFBundleIdentifier='app.bibimer.ios',
            CFBundleVersion='1', CFBundleShortVersionString='0.1.0', CFBundleSupportedPlatforms=['iPhoneOS'],
            DTSDKName='iphoneos27.1', CFBundleExecutable='Bibimer')))
        (app / 'Bibimer').write_bytes(b'binary')
        (archive / 'dSYMs/Bibimer.app.dSYM').mkdir(parents=True)
        return archive, app

    def verify(self, archive, signed=False):
        return distribution.verify_archive(archive, 'app.bibimer.ios', '0.1.0', '1', signed)

    def test_matching_symbols_verified_and_unsigned_does_not_claim_signature_check(self):
        archive, app = self.archive()
        with patch.object(distribution, 'checked', return_value='UUID: ABCD-1234 (arm64) anything') as checked:
            self.assertEqual(self.verify(archive), app)
        self.assertEqual(checked.call_count, 2)
        self.assertTrue(all(call.args[0] == 'xcrun' for call in checked.call_args_list))

    def test_wrong_dsym_rejected(self):
        archive, _ = self.archive()
        with patch.object(distribution, 'checked', side_effect=['UUID: ABCD-1234 (arm64) binary', 'UUID: DEFA-4567 (arm64) dsym']):
            with self.assertRaisesRegex(distribution.DistributionError, 'UUID'):
                self.verify(archive)

    def test_wrong_build_rejected_before_signature_check(self):
        archive, app = self.archive()
        info = plistlib.loads((app / 'Info.plist').read_bytes())
        info['CFBundleVersion'] = '2'
        (app / 'Info.plist').write_bytes(plistlib.dumps(info))
        with patch.object(distribution, 'checked') as checked:
            with self.assertRaisesRegex(distribution.DistributionError, 'CFBundleVersion'):
                self.verify(archive)
        checked.assert_not_called()

    def test_invalid_archive_application_path_rejected(self):
        archive, _ = self.archive()
        (archive / 'Info.plist').write_bytes(plistlib.dumps({'ApplicationProperties': {'ApplicationPath': '../../private.app'}}))
        with self.assertRaisesRegex(distribution.DistributionError, 'path'):
            self.verify(archive)

    def test_signed_archive_requires_embedded_profile(self):
        archive, _ = self.archive()
        with patch.object(distribution, 'checked', return_value='UUID: ABCD-1234 (arm64) anything') as checked:
            with self.assertRaisesRegex(distribution.DistributionError, 'profile'):
                self.verify(archive, signed=True)
        self.assertEqual(checked.call_args.args[:3], ('codesign', '--verify', '--strict'))

    def profile(self):
        return dict(TeamIdentifier=['ABCDEFGHIJ'], ApplicationIdentifierPrefix=['PREFIX1234'],
                    Entitlements={'application-identifier': 'PREFIX1234.app.bibimer.ios', 'get-task-allow': False},
                    ExpirationDate=datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(days=2))

    def verify_profile(self, profile):
        app = self.root / 'Signed.app'
        app.mkdir(exist_ok=True)
        (app / 'embedded.mobileprovision').write_bytes(b'signed profile')
        with patch.object(distribution, 'checked', side_effect=['', plistlib.dumps(profile).decode()]):
            distribution.verify_distribution_signature(app, 'ABCDEFGHIJ', 'app.bibimer.ios')

    def test_distribution_profile_accepts_distinct_application_prefix(self):
        self.verify_profile(self.profile())

    def test_development_wrong_team_and_expired_profiles_rejected(self):
        for change, message in [({'TeamIdentifier': ['OTHER12345']}, 'team'),
                                ({'ProvisionedDevices': ['fixture-device']}, 'App Store'),
                                ({'ExpirationDate': datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=1)}, 'expired'),
                                ({'Entitlements': {'application-identifier': 'PREFIX1234.other.app', 'get-task-allow': False}}, 'bundle')]:
            profile = self.profile()
            profile.update(change)
            with self.subTest(change=change), self.assertRaisesRegex(distribution.DistributionError, message):
                self.verify_profile(profile)

    def test_manual_distribution_export_uses_exact_profile_without_development_signing(self):
        profile = '12345678-1234-1234-1234-123456789012'
        options = distribution.export_options('ABCDEFGHIJ', 'app.bibimer.ios', profile)
        self.assertEqual(options['signingStyle'], 'manual')
        self.assertEqual(options['signingCertificate'], 'Apple Distribution')
        self.assertEqual(options['provisioningProfiles'], {'app.bibimer.ios': profile})

    def test_manual_archive_project_uses_distribution_identity_and_profile(self):
        output = self.root / 'output'
        output.mkdir()
        profile = '12345678-1234-1234-1234-123456789012'
        info = {'CFBundleExecutable': 'Bibimer', 'MinimumOSVersion': '16.0'}
        with patch.object(distribution, 'validate_app', return_value=(info, 'fixture-hash')):
            project, _ = distribution.prepare_project(self.root / 'Bibimer.app', output,
                'ABCDEFGHIJ', 'app.bibimer.ios', '0.1.0', '1', profile_uuid=profile)
        text = (project / 'project.pbxproj').read_text()
        self.assertIn('CODE_SIGN_STYLE = Manual;', text)
        self.assertIn('CODE_SIGN_IDENTITY = "Apple Distribution";', text)
        self.assertIn('PROVISIONING_PROFILE_SPECIFIER = "' + profile + '";', text)
        self.assertNotIn('CODE_SIGN_STYLE = Automatic;', text)

    def test_existing_unsigned_archive_exports_without_archive_or_development_profile_step(self):
        archive, app = self.archive()
        output = self.root / 'export-output'
        args = ['distribute.py', '--archive', str(archive), '--output', str(output),
                '--team', 'ABCDEFGHIJ', '--version', '0.1.0', '--build', '1', '--export']
        def export(*command, **kwargs):
            self.assertIn('-exportArchive', command)
            self.assertNotIn('archive', command)
            self.assertNotIn('-allowProvisioningUpdates', command)
            (output / 'export').mkdir()
            (output / 'export/Bibimer.ipa').write_bytes(b'ipa fixture')
        with patch('sys.argv', args), patch.object(distribution, 'prepare_project') as project, \
             patch.object(distribution, 'verify_archive', return_value=app) as verify, \
             patch.object(distribution, 'checked', side_effect=export) as checked, \
             patch.object(distribution, 'verify_ipa') as verify_ipa, patch('builtins.print'):
            distribution.main()
        project.assert_not_called()
        verify.assert_called_once_with(archive.resolve(), 'app.bibimer.ios', '0.1.0', '1', False)
        checked.assert_called_once()
        verify_ipa.assert_called_once()
        report = json.loads((output / 'distribution.json').read_text())
        self.assertFalse(report['signed'])
        self.assertTrue(report['exportedSignatureVerified'])
        self.assertFalse(report['uploaded'])


if __name__ == '__main__':
    unittest.main()
