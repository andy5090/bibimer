"""Review access uses the existing private-code loader and native verifier."""
import ctypes
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

HERE=Path(__file__).parents[1]
ROOT=HERE.parents[1]
spec=importlib.util.spec_from_file_location('review_build',HERE/'build.py')
build=importlib.util.module_from_spec(spec);spec.loader.exec_module(build)

class ReviewAccessTests(unittest.TestCase):
    def test_default_configuration_denies_access(self):
        with patch.dict(os.environ,{},clear=True):self.assertEqual(build.review_access_digest(),'')

    def test_only_hash_of_private_external_code_is_used(self):
        code=b'0123456789abcdef0123456789abcdef'
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory)/'synthetic-code';path.write_bytes(code+b'\n');path.chmod(0o600)
            with patch.dict(os.environ,{'BIBIMER_REVIEW_CODE_FILE':str(path)}):
                self.assertEqual(build.review_access_digest(),hashlib.sha256(code).hexdigest())
                path.chmod(0o644)
                with self.assertRaises(ValueError):build.review_access_digest()
                path.chmod(0o600);path.write_bytes(b'invalid')
                with self.assertRaises(ValueError):build.review_access_digest()

    @unittest.skipUnless(sys.platform=='darwin' and shutil.which('clang'),'native CommonCrypto verifier needs macOS')
    def test_native_digest_verifier(self):
        with tempfile.TemporaryDirectory() as directory:
            library=Path(directory)/'review.dylib'
            subprocess.run(['clang','-dynamiclib','-Wall','-Wextra','-Werror',str(HERE/'Sources/ReviewAccess.c'),'-o',str(library)],check=True,capture_output=True)
            native=ctypes.CDLL(str(library));native.bibimer_review_verify.argtypes=[ctypes.c_char_p,ctypes.c_char_p,ctypes.c_size_t]
            verify=lambda digest,code:native.bibimer_review_verify(digest,code,len(code) if code else 0)
            code=b'synthetic-unit-code';digest=hashlib.sha256(code).hexdigest().encode()
            self.assertEqual(verify(digest,code),1);self.assertEqual(verify(digest.upper(),code),1)
            for bad in [b'',b'wrong',b' ',b'\x00',b'a\nb',b'x'*129,None]:self.assertEqual(verify(digest,bad),0)
            for invalid in [None,b'',b'invalid',b'x'*64,digest[:-1]]:self.assertEqual(verify(invalid,code),0)
            for denied in [b'   ',b'a\nb',b'\x00test',b'x'*129]:self.assertEqual(verify(hashlib.sha256(denied).hexdigest().encode(),denied),0)

    def test_packaged_review_is_isolated_and_localized(self):
        with tempfile.TemporaryDirectory() as directory:
            dest=Path(directory)/'Web';build.package_web(dest)
            index=(dest/'review.html').read_text();app=(dest/'app.js').read_text()
            for directive in ["default-src 'none'","connect-src 'none'","form-action 'none'","frame-src 'none'","img-src 'self' data:"]:
                self.assertIn(directive,index)
            self.assertIn('review-workspace.js',index);self.assertIn('review-samples.js',index)
            self.assertNotIn('"#review-access-open"',(dest/'platform.js').read_text())
            self.assertIn('entryEpoch===iosReviewEntryEpoch',app)
            self.assertIn('finally { $("review-access-submit").disabled=false; }',app)
            self.assertIn('if (!demo) {\n  // Explicit consent',app)
            labels=json.loads((dest/'review-labels.json').read_text())
            self.assertEqual(len(labels),10)
            for locale in labels.values():self.assertTrue(all(locale.values()));self.assertEqual(set(locale),set(labels['en']))
            self.assertNotEqual(labels['ja']['review_access'],labels['en']['review_access'])
            subprocess.run(['node','--check',str(dest/'app.js')],check=True,capture_output=True)

    @unittest.skipUnless(shutil.which('javac') and shutil.which('java'),'Android sample provenance check needs Java')
    def test_samples_are_exact_android_prerecorded_logs(self):
        source=ROOT/'android/app/src/main/java/app/bibimer/DemoWorkspace.java'
        stored=json.loads((HERE/'Resources/review-samples.json').read_text())
        self.assertEqual(stored['androidSourceSHA256'],hashlib.sha256(source.read_bytes()).hexdigest())
        with tempfile.TemporaryDirectory() as directory:
            subprocess.run(['javac','-d',directory,str(source),str(Path(__file__).with_name('ExportAndroidDemo.java'))],check=True,capture_output=True)
            result=subprocess.check_output(['java','-cp',directory,'app.bibimer.ExportAndroidDemo'],text=True)
            self.assertEqual(json.loads(result),stored['samples'])

if __name__=='__main__':unittest.main()
