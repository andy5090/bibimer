"""Account quota reports never derive from tokens or run a synthetic model turn."""
import json
import time
from unittest.mock import patch

from test_providers import ProviderFixture
from test_bridge import module


class SubscriptionTests(ProviderFixture):
    def update(self, session, method, params):
        with session.condition:
            session._handle({'method':method, 'params':params})

    def test_codex_initial_read_and_claude_events_do_not_create_extra_turns(self):
        session = self.begin('codex')
        event = self.until(lambda e: len(e['session']['subscription_usage']['windows']) == 2)
        self.assertEqual([35,12], [row['used_percent'] for row in event['session']['subscription_usage']['windows']])
        self.assertFalse((self.root/'project/turn-count').exists())
        session = self.begin('claude')
        self.assertEqual([], session.snapshot()['subscription_usage']['windows'])
        self.message('quota-subagent')
        event = self.until(lambda e: e['session']['turn_state'] == 'ready' and len(e['session']['subscription_usage']['windows']) == 2)
        self.assertEqual([35,12], [row['used_percent'] for row in event['session']['subscription_usage']['windows']])
        self.assertEqual('1', (self.root/'project/claude-turn-count').read_text())

    def test_claude_status_only_does_not_invent_percent_and_report_uses_percent_units(self):
        self.begin('claude')
        self.message('quota-status')
        event = self.until(lambda e: e['session']['turn_state'] == 'ready' and bool(e['session']['subscription_usage']['windows']))
        row = event['session']['subscription_usage']['windows'][0]
        self.assertIsNone(row['used_percent'])
        self.assertEqual('allowed_warning', row['status'])
        self.message('quota-report')
        event = self.until(lambda e: e['session']['turn_state'] == 'ready' and
                          e['session']['subscription_usage']['windows'][0]['used_percent'] == 1)
        self.assertEqual(1, len(event['session']['subscription_usage']['windows']))

    def test_sparse_buckets_nulls_and_reset_rollover(self):
        session = self.begin('codex')
        self.until(lambda e: len(e['session']['subscription_usage']['windows']) == 2)
        before = session.snapshot()['subscription_usage']['windows']
        self.update(session, 'account/rateLimits/updated', {'rateLimits':{'limitId':'codex','primary':{'usedPercent':48},'secondary':None}})
        rows = session.snapshot()['subscription_usage']['windows']
        self.assertEqual([48,12], [row['used_percent'] for row in rows])
        self.assertEqual(before[0]['resets_at'], rows[0]['resets_at'])
        self.update(session, 'account/rateLimits/updated', {'rateLimits':{'limitId':'another','limitName':'Separate <bucket>',
            'primary':{'usedPercent':70,'windowDurationMins':60,'resetsAt':int(time.time())+600},'email':'PRIVATE_EMAIL','token':'PRIVATE_TOKEN'}})
        rows = session.snapshot()['subscription_usage']['windows']
        self.assertEqual(3, len(rows))
        self.assertEqual('another:primary', rows[-1]['id'])
        self.assertNotIn('PRIVATE_', json.dumps(rows))
        self.update(session, 'account/rateLimits/updated', {'rateLimits':{'limitId':'codex','primary':{'resetsAt':before[0]['resets_at']+300}}})
        self.assertIsNone(session.snapshot()['subscription_usage']['windows'][0]['used_percent'])

    def test_claude_legacy_fraction_and_new_query_cannot_reuse_previous_account(self):
        self.begin('claude')
        self.message('quota-legacy')
        event = self.until(lambda e: e['session']['turn_state'] == 'ready' and bool(e['session']['subscription_usage']['windows']))
        self.assertEqual(100,event['session']['subscription_usage']['windows'][0]['used_percent'])
        self.assertEqual('rejected',event['session']['subscription_usage']['windows'][0]['status'])
        self.message('quota-none')
        self.until(lambda e: e['session']['turn_state'] == 'ready' and not e['session']['subscription_usage']['windows'])

    def test_multi_bucket_snapshot_does_not_duplicate_legacy_or_assume_window_length(self):
        session = self.begin('codex')
        self.until(lambda e: bool(e['session']['subscription_usage']['windows']))
        with session.condition:
            session._subscription_codex({'rateLimits':{'primary':{'usedPercent':99}},'rateLimitsByLimitId':{
                'codex':{'primary':{'usedPercent':20,'windowDurationMins':15}},
                'model':{'limitName':'Model quota','primary':{'usedPercent':80,'windowDurationMins':60},'secondary':{'usedPercent':10}}}},replace=True)
        rows = session.snapshot()['subscription_usage']['windows']
        self.assertEqual([20,80,10],[row['used_percent'] for row in rows])
        self.assertEqual(15,rows[0]['window_minutes'])
        self.update(session,'account/rateLimits/updated',{'rateLimits':{'limitId':'codex','primary':{'windowDurationMins':60}}})
        self.assertIsNone(session.snapshot()['subscription_usage']['windows'][0]['used_percent'])
        previous = module.quota_window('claude:five_hour',{'usedPercent':100,'status':'rejected','resetsAt':2000000000})
        rolled = module.quota_window('claude:five_hour',{'resetsAt':2000000300},previous)
        self.assertIsNone(rolled['status']);self.assertIsNone(rolled['used_percent'])
        fresh = module.quota_window('claude:five_hour',{'usedPercent':2},previous)
        self.assertIsNone(fresh['status']);self.assertEqual(2,fresh['used_percent'])

    def test_refresh_is_throttled_and_optional_failures_never_fault_chat(self):
        session = self.begin('codex')
        self.until(lambda e: bool(e['session']['subscription_usage']['windows']))
        original = session._rpc
        calls = []
        def hold(method, params, kind):
            calls.append((method,params,kind))
            session.rpc_pending['held-quota'] = kind
            return 'held-quota'
        with patch.object(session,'_rpc',side_effect=hold), session.condition:
            session.subscription_next = 0
            session._refresh_subscription()
            session._refresh_subscription()
            self.assertEqual(1,len(calls))
            session._handle({'id':'held-quota','error':{'code':-32603,'message':'SECRET transport error'}})
            self.assertEqual('stale', session.subscription_usage['state'])
            self.assertEqual('running',session.state)
            self.assertEqual('ready',session.turn_state)
            self.assertFalse(session.queue_paused)
            self.assertFalse(any(row.get('kind') == 'notice' for row in session.items.values()))
            session.subscription_next = 0
            session._refresh_subscription()
            session.subscription_pending = ('held-quota',time.monotonic()-1)
            session._refresh_subscription()
            self.assertIsNone(session.subscription_pending)
            self.assertNotIn('held-quota',session.rpc_pending)
        self.assertIsNotNone(original)

    def test_newer_notification_wins_over_delayed_read_and_auth_change_clears(self):
        session = self.begin('codex')
        self.until(lambda e: bool(e['session']['subscription_usage']['windows']))
        def hold(method, params, kind):
            key='quota-'+str(kind[1])
            session.rpc_pending[key] = kind
            return key
        with patch.object(session,'_rpc',side_effect=hold), session.condition:
            session.subscription_next = 0; session._refresh_subscription()
            session._handle({'method':'account/rateLimits/updated','params':{'rateLimits':{'primary':{'usedPercent':62}}}})
            session._handle({'id':'quota-0','result':{'rateLimits':{'primary':{'usedPercent':4}}}})
            self.assertEqual(62,session.subscription_usage['windows'][0]['used_percent'])
            session.subscription_next = 0; session._refresh_subscription()
            session._handle({'method':'account/updated','params':{'authMode':'apikey','email':'DO_NOT_COPY'}})
            self.assertEqual([],session.subscription_usage['windows'])
            session._handle({'id':'quota-0','result':{'rateLimits':{'primary':{'usedPercent':90}}}})
            self.assertEqual([],session.subscription_usage['windows'])
            session._handle({'id':'quota-1','error':{'code':-32601}})
            self.assertFalse(session.subscription_supported)
        self.assertEqual('running',session.state)

    def test_session_isolation_reconnect_and_no_persisted_quota(self):
        first = self.begin('codex')
        self.until(lambda e: len(e['session']['subscription_usage']['windows']) == 2)
        second = self.begin('claude')
        self.assertEqual([],second.snapshot()['subscription_usage']['windows'])
        self.assertEqual(35,first.events(0,0)['session']['subscription_usage']['windows'][0]['used_percent'])
        copied = first.snapshot()['subscription_usage'];copied['windows'][0]['used_percent']=99
        self.assertEqual(35,first.snapshot()['subscription_usage']['windows'][0]['used_percent'])
        self.bridge.persist()
        self.assertNotIn('subscription_usage',(self.state/'metadata.json').read_text())
        self.assertFalse(any(row.get('subscription_usage') for row in module.Bridge(self.state).snapshots()))

    def test_invalid_numeric_data_and_foreign_provider_events_are_ignored(self):
        session = self.begin('claude')
        for value in [True,'35',float('inf'),float('nan'),-1,10001]:
            self.update(session,'bibimer/subscriptionUsage',{'threadId':session.thread_id,'windows':[{'id':'bad','usedPercent':value}]})
        self.assertEqual([],session.snapshot()['subscription_usage']['windows'])
        self.update(session,'bibimer/subscriptionUsage',{'threadId':'foreign','windows':[{'id':'bad','usedPercent':35}]})
        self.update(session,'account/rateLimits/updated',{'rateLimits':{'primary':{'usedPercent':99}}})
        self.assertEqual([],session.snapshot()['subscription_usage']['windows'])
        self.update(session,'bibimer/subscriptionUsage',{'threadId':session.thread_id,'windows':[{'id':'zero','usedPercent':0,'resetsAt':True}]})
        self.assertEqual(0,session.snapshot()['subscription_usage']['windows'][0]['used_percent'])
        self.assertIsNone(session.snapshot()['subscription_usage']['windows'][0]['resets_at'])
        self.message('wait')
        self.until(lambda e: e['session']['turn_state'] == 'running' and len(e['session']['subscription_usage']['windows']) == 2)
        self.update(session,'bibimer/subscriptionUsage',{'threadId':session.thread_id,'turnId':'previous-query',
            'windows':[{'id':'claude:five_hour','usedPercent':99}]})
        self.assertEqual(35,session.snapshot()['subscription_usage']['windows'][0]['used_percent'])
