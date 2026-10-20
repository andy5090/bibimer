"""Verify recorded crashes fail validation and previous evidence survives reruns."""
import importlib.util
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('ios_app_runner', Path(__file__).parents[1] / 'run_simulator.py')
runner = importlib.util.module_from_spec(spec)
spec.loader.exec_module(runner)


class EvidenceTests(unittest.TestCase):
    def test_native_crash_diagnostics_are_fatal(self):
        for diagnostic in ['V8_SIGABRT', 'V8_SIGSEGV', 'EXC_BAD_ACCESS', 'EXC_CRASH',
                           'Abort trap: 6', 'host crash', 'Segmentation fault',
                           'assertion failed', 'BIBIMER_RUNTIME_SHUTDOWN_INCOMPLETE']:
            with self.subTest(diagnostic=diagnostic):
                self.assertIsNotNone(runner.FATAL_CONSOLE.search(diagnostic))

    def test_supported_warnings_are_not_crashes(self):
        self.assertIsNone(runner.FATAL_CONSOLE.search(
            '17(bash) stub syscall 151\nWarning: disabling flag --expose_wasm due to conflicting flags\n0.163.0'))

    def test_previous_evidence_is_preserved_before_replacement(self):
        with tempfile.TemporaryDirectory() as temporary:
            evidence = Path(temporary) / 'smoke'
            evidence.mkdir()
            result = evidence / 'verification.json'
            result.write_text('{"status":"PASS"}\n')
            runner.archive_evidence(evidence)
            result.write_text('{"status":"FAIL"}\n')
            archived = list((evidence.parent / 'history').glob('smoke-*/verification.json'))
            self.assertEqual(len(archived), 1)
            self.assertEqual(archived[0].read_text(), '{"status":"PASS"}\n')


if __name__ == '__main__':
    unittest.main()
