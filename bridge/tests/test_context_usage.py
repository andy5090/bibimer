"""Window usage contracts through owned fixture processes, never real models."""
import importlib.util
from pathlib import Path
import unittest

from test_providers import ProviderFixture
from test_bridge import module


class ContextUsageTests(ProviderFixture):
    def test_native_adapters_use_latest_window_not_billing_totals(self):
        for agent in ('codex', 'claude', 'opencode'):
            with self.subTest(agent=agent):
                session = self.begin(agent)
                self.assertIsNone(session.snapshot()['context_usage'])
                self.message('context')
                event = self.until(lambda e: e['session']['turn_state'] == 'ready' and
                                   (e['session'].get('context_usage') or {}).get('limit_tokens') == 200000)
                usage = event['session']['context_usage']
                self.assertEqual(76000, usage['used_tokens'])
                self.assertEqual(agent == 'claude', usage['estimated'])
                self.assertGreater(usage['updated_at'], 0)
                self.end()

    def test_compaction_can_reduce_native_usage(self):
        session = self.begin('codex')
        self.message('context')
        self.until(lambda e: bool(e['session']['context_usage']))
        self.message('context-compact')
        self.until(lambda e: e['session']['turn_state'] == 'ready' and
                   (e['session']['context_usage'] or {}).get('used_tokens') == 12000)
        self.assertEqual(12000, session.snapshot()['context_usage']['used_tokens'])

    def test_wrong_thread_turn_malformed_values_and_compaction(self):
        session = self.begin('codex')
        self.message('wait')
        self.until(lambda e: e['session']['turn_state'] == 'running')
        def emit(used=76000, limit=200000, **overrides):
            params = {'threadId':session.thread_id, 'turnId':session.turn_id,
                      'tokenUsage':{'last':{'totalTokens':used}, 'total':{'totalTokens':99999999}, 'modelContextWindow':limit}, **overrides}
            with session.condition:
                session._handle({'method':'thread/tokenUsage/updated', 'params':params})
        emit()
        before = session.snapshot()['context_usage']
        emit(threadId='another-thread')
        emit(turnId='earlier-turn')
        for invalid in (None, -1, True, '100', 1.5, 2**53, float('inf')):
            emit(invalid)
        emit(tokenUsage={'total':{'totalTokens':20}})
        emit(tokenUsage=[])
        self.assertEqual(before, session.snapshot()['context_usage'])
        emit(0, None)
        self.assertEqual(0, session.snapshot()['context_usage']['used_tokens'])
        self.assertIsNone(session.snapshot()['context_usage']['limit_tokens'])
        emit(300000)
        self.assertEqual(300000, session.snapshot()['context_usage']['used_tokens'])
        with session.condition:
            session._handle({'method':'item/completed', 'params':{'threadId':session.thread_id,
                'item':{'type':'contextCompaction', 'id':'compact'}}})
        self.assertIsNone(session.snapshot()['context_usage'])
        self.assertEqual('running', session.state)

    def test_claude_structured_context_and_compaction_do_not_use_totals(self):
        self.begin('claude')
        self.message('context-native')
        event = self.until(lambda e: e['session']['turn_state'] == 'ready' and
                          (e['session']['context_usage'] or {}).get('used_tokens') == 48000)
        self.assertTrue(event['session']['context_usage']['estimated'])
        self.message('context-compact')
        self.until(lambda e: e['session']['turn_state'] == 'ready' and e['session']['context_usage'] is None)

    def test_partial_provider_report_zero_and_explicit_invalidation(self):
        session = self.begin('claude')
        def emit(**values):
            with session.condition:
                session._handle({'method':'bibimer/contextUsage', 'params':{
                    'threadId':session.thread_id, 'usedTokens':0, 'estimated':True, **values}})
        emit()
        usage = session.snapshot()['context_usage']
        self.assertEqual(0, usage['used_tokens'])
        self.assertIsNone(usage['limit_tokens'])
        self.assertTrue(usage['estimated'])
        usage['used_tokens'] = 100
        self.assertEqual(0, session.snapshot()['context_usage']['used_tokens'])
        for invalid in (None, '12', True, -1):
            emit(usedTokens=invalid)
        self.assertEqual(0, session.snapshot()['context_usage']['used_tokens'])
        emit(usedTokens=None, reset=True)
        self.assertIsNone(session.snapshot()['context_usage'])

    def test_reconnect_session_isolation_and_restart_does_not_restore_usage(self):
        first = self.begin('codex')
        self.message('context')
        self.until(lambda e: e['session']['turn_state'] == 'ready' and bool(e['session']['context_usage']))
        self.begin('claude')
        self.assertIsNone(self.bridge.session.snapshot()['context_usage'])
        self.assertEqual(76000, first.events(0, 0)['session']['context_usage']['used_tokens'])
        self.bridge.persist()
        self.assertNotIn('context_usage', (self.state / 'metadata.json').read_text())
        restored = module.Bridge(self.state)
        self.assertFalse(any(row.get('context_usage') for row in restored.snapshots()))


class OpenCodeWindowTests(unittest.TestCase):
    def test_latest_nonzero_message_and_optional_model_limit(self):
        spec = importlib.util.spec_from_file_location('context_opencode', Path(__file__).parents[1] / 'provider_opencode.py')
        provider = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(provider)
        adapter = provider.Adapter.__new__(provider.Adapter)
        adapter.context_limits, adapter.last_context = {}, None
        output = []
        adapter.notify = lambda method, value: output.append(value)
        adapter.http = lambda *args: {'all':[{'id':'test', 'models':{'coder':{'limit':{'context':200000}}}}]}
        def row(used, **extra):
            return {'info':{'role':'assistant', 'providerID':'test', 'modelID':'coder',
                            'tokens':{'input':used, 'output':0, 'cache':{}}, **extra}}
        adapter.context([row(90000), row(20000), row(0)])
        self.assertEqual({'usedTokens':20000, 'contextWindow':200000, 'estimated':False}, output[-1])
        adapter.context([row(20000), row(0)])
        self.assertEqual(1, len(output))
        adapter.http = lambda *args: (_ for _ in ()).throw(OSError())
        adapter.context([row(10000, modelID='unknown')])
        self.assertIsNone(output[-1]['contextWindow'])
        self.assertEqual(10000, output[-1]['usedTokens'])


if __name__ == '__main__':
    unittest.main()
