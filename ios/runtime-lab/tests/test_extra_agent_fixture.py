"""Reject invented search/tool success in the guest-local inference fixture."""
import importlib.util
from pathlib import Path
from types import SimpleNamespace
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location(
    'extra_agent_fixture', Path(__file__).parents[1] / 'Resources/extra-agents.py')
fixture = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fixture)


class SearchFixtureTests(unittest.TestCase):
    def setUp(self):
        self.handler = fixture.Handler.__new__(fixture.Handler)
        self.handler.server = SimpleNamespace(work=Path('/isolated'), requests=[], glob_seen=False, grep_seen=False,
                                              read_seen=False, write_seen=False)
        self.replies = []
        self.handler.reply = self.replies.append
        self.environment = patch.dict('os.environ', BIBIMER_TEST_OPENCODE_SEARCH='1')
        self.environment.start()
        self.addCleanup(self.environment.stop)

    def request(self, results=(), tools=('glob', 'grep', 'bash')):
        self.handler.opencode({'messages': list(results),
            'tools': [{'function': {'name': name}} for name in tools]})
        return self.replies[-1]['choices'][0]['message']

    @staticmethod
    def result(identity, text):
        return {'role': 'tool', 'tool_call_id': identity, 'content': text}

    def test_requires_original_glob_then_grep_then_bash(self):
        first = self.request()['tool_calls'][0]
        self.assertEqual(first['function']['name'], 'glob')
        glob = self.result('call_local_glob', '/isolated/input.txt')
        second = self.request([glob])['tool_calls'][0]
        self.assertEqual(second['function']['name'], 'grep')
        grep = self.result('call_local_grep', '/isolated/input.txt:\n  Line 1: ' + fixture.INPUT)
        third = self.request([glob, grep])['tool_calls'][0]
        self.assertEqual(third['function']['name'], 'bash')
        self.assertFalse(self.handler.server.read_seen)
        bash = self.result('call_local', fixture.INPUT)
        self.assertEqual(self.request([glob, grep, bash])['content'], fixture.FINAL)
        self.assertTrue(self.handler.server.glob_seen)
        self.assertTrue(self.handler.server.grep_seen)
        self.assertTrue(self.handler.server.read_seen)

    def test_rejects_empty_or_failed_native_search(self):
        with self.assertRaisesRegex(ValueError, 'search result mismatch'):
            self.request([self.result('call_local_glob', 'No files found')])
        self.handler.server.glob_seen = True
        with self.assertRaisesRegex(ValueError, 'search result mismatch'):
            self.request([self.result('call_local_grep', 'Unable to grep')])
        with self.assertRaisesRegex(ValueError, 'search result mismatch'):
            self.request([self.result('call_local_grep', 'Unable to grep for ' + fixture.INPUT)])

    def test_prior_grep_result_cannot_substitute_for_bash_output(self):
        results = [self.result('call_local_glob', '/isolated/input.txt'),
                   self.result('call_local_grep', 'input.txt: Line 1: ' + fixture.INPUT),
                   self.result('call_local', 'cat failed')]
        with self.assertRaisesRegex(ValueError, 'bash result'):
            self.request(results)
        self.assertFalse(self.handler.server.read_seen)

    def test_auxiliary_title_does_not_count_as_search(self):
        self.assertEqual(self.request(tools=())['content'], 'Bibimer runtime probe')
        self.assertFalse(self.handler.server.glob_seen)
        self.assertFalse(self.handler.server.grep_seen)


if __name__ == '__main__':
    unittest.main()
