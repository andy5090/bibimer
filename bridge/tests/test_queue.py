import json
import uuid

from test_chat import ChatFixture
from test_bridge import module


class QueueTests(ChatFixture):
    def queue(self, action='add', key=None, **values):
        return self.api('POST', f'/v1/sessions/{self.session_id}/queue',
                        {'action': action, 'request_id': key or str(uuid.uuid4()), **values})

    def steer(self, text, turn, key=None):
        return self.api('POST', f'/v1/sessions/{self.session_id}/steer',
                        {'text': text, 'turn_id': turn, 'request_id': key or str(uuid.uuid4())})

    def test_fifo_cancel_replay_approval_and_no_prompt_metadata(self):
        session = self.chat()
        self.message('approval')
        event = self.until(lambda e: bool(e['requests']))
        prompt = event['requests'][0]['id']
        first, removed = str(uuid.uuid4()), str(uuid.uuid4())
        self.assertEqual(200, self.queue(text='PRIVATE queued first', key=first)[0])
        self.assertEqual(200, self.queue(text='PRIVATE queued first', key=first)[0])
        self.assertEqual(409, self.queue(text='different', key=first)[0])
        self.assertEqual(200, self.queue(text='remove me', key=removed)[0])
        self.assertEqual(200, self.queue('remove', entry_id=removed)[0])
        self.assertEqual(200, self.queue(text='PRIVATE queued second')[0])
        event = self.until(lambda e: len(e['queue']) == 2)
        self.assertEqual(prompt, event['requests'][0]['id'])
        self.assertEqual('1', (self.root/'project/turn-count').read_text())
        session.configure({'options': {'permission':'read-only', 'fast':True}, 'request_id':str(uuid.uuid4())})
        self.bridge.persist()
        self.assertNotIn('PRIVATE queued', (self.state/'metadata.json').read_text())
        self.assertNotIn('text', json.dumps(session.snapshot()))
        restored = module.Bridge(self.state)
        snapshot = restored.health()['session']
        self.assertEqual('lost', snapshot['state'])
        self.assertEqual(0, snapshot['queued_count'])
        self.assertIsNone(snapshot['active_turn_id'])
        self.assertEqual([], restored.session_events(session.id, 0, 0)['queue'])
        self.assertEqual(200, self.api('POST', f'/v1/sessions/{self.session_id}/respond',
            {'prompt_id': prompt, 'decision': 'decline', 'request_id': str(uuid.uuid4())})[0])
        event = self.until(lambda e: not e['queue'] and sum(i['kind'] == 'turn' for i in e['items']) == 3)
        self.assertEqual(['approval', 'PRIVATE queued first', 'PRIVATE queued second'],
                         [i['text'] for i in event['items'] if i['kind'] == 'user'])
        self.assertFalse((self.root/'project/approved').exists())
        self.assertEqual(200, self.queue(text='PRIVATE queued first', key=first)[0])
        self.assertEqual('3', (self.root/'project/turn-count').read_text())
        turns = [json.loads(line) for line in (self.root/'project/codex-options.jsonl').read_text().splitlines()
                 if json.loads(line)['method'] == 'turn/start']
        self.assertEqual(['readOnly', 'readOnly'], [entry['sandboxPolicy']['type'] for entry in turns[1:]])
        self.assertEqual(['fast', 'fast'], [entry['serviceTier'] for entry in turns[1:]])

    def test_interrupt_pauses_queue_until_explicit_resume(self):
        self.chat()
        self.message('wait')
        self.until(lambda e: e['session']['turn_state'] == 'running')
        self.queue(text='after interrupted response')
        self.api('POST', f'/v1/sessions/{self.session_id}/interrupt', {})
        event = self.until(lambda e: e['session']['turn_state'] == 'ready')
        self.assertTrue(event['session']['queue_paused'])
        self.assertEqual(1, len(event['queue']))
        self.assertEqual('1', (self.root/'project/turn-count').read_text())
        self.assertEqual(200, self.queue('resume')[0])
        self.until(lambda e: not e['queue'] and e['session']['turn_state'] == 'ready')
        self.assertEqual('2', (self.root/'project/turn-count').read_text())

    def test_rejected_start_is_retained_and_does_not_run_followups(self):
        self.chat()
        key = str(uuid.uuid4())
        self.assertEqual(200, self.queue(text='start-error', key=key)[0])
        event = self.until(lambda e: e['queue'] and e['queue'][0]['state'] == 'failed')
        self.assertTrue(event['session']['queue_paused'])
        self.queue(text='after rejected start')
        self.assertFalse((self.root/'project/turn-count').exists())
        self.queue('remove', entry_id=key)
        self.queue('resume')
        self.until(lambda e: not e['queue'] and e['session']['turn_state'] == 'ready')
        self.assertEqual('1', (self.root/'project/turn-count').read_text())

    def test_limits_invalid_requests_session_isolation_and_stop(self):
        first = self.chat()
        self.message('wait')
        self.until(lambda e: e['session']['turn_state'] == 'running')
        for i in range(16):
            self.assertEqual(200, self.queue(text=f'queued {i}')[0])
        self.assertEqual(409, self.queue(text='overflow')[0])
        for value in ('', ' ', None, 1, '한' * 6000):
            self.assertEqual(400, self.queue(text=value)[0])
        self.assertEqual(400, self.queue(action=[])[0])
        self.assertEqual(400, self.queue('remove', entry_id='bad')[0])
        self.assertEqual(409, self.queue('remove', entry_id=str(uuid.uuid4()))[0])
        _, project = self.api('POST', '/v1/project', {'path': str(self.root/'second'), 'create': True, 'add': True})
        _, result = self.api('POST', '/v1/sessions', {'agent': 'codex', 'mode': 'chat',
            'project_id': project['project']['id'], 'request_id': str(uuid.uuid4())})
        self.session_id = result['session']['id']
        self.until(lambda e: e['session']['ready'])
        self.queue(text='second project only')
        event = self.until(lambda e: e['session']['turn_state'] == 'ready' and any(i['kind'] == 'user' for i in e['items']))
        self.assertEqual(['second project only'], [i['text'] for i in event['items'] if i['kind'] == 'user'])
        self.assertEqual(16, first.snapshot()['queued_count'])
        self.session_id = first.id
        self.api('POST', f'/v1/sessions/{first.id}/stop', {})
        self.until(lambda e: e['session']['state'] == 'exited' and not e['queue'])
        self.assertEqual(409, self.queue(text='after stop')[0])

    def test_steer_same_turn_native_receipt_no_new_turn_and_stale_target(self):
        self.chat()
        self.message('approval')
        event = self.until(lambda e: bool(e['requests']))
        turn, prompt = event['session']['active_turn_id'], event['requests'][0]['id']
        key = str(uuid.uuid4())
        self.assertEqual(200, self.steer('focus on tests', turn, key)[0])
        self.assertEqual(200, self.steer('focus on tests', turn, key)[0])
        event = self.until(lambda e: any(i.get('text') == 'focus on tests' for i in e['items']))
        self.assertEqual(1, sum(i.get('text') == 'focus on tests' for i in event['items']))
        self.assertEqual(prompt, event['requests'][0]['id'])
        self.assertEqual(turn, event['session']['active_turn_id'])
        self.assertEqual('1', (self.root/'project/turn-count').read_text())
        rejected = str(uuid.uuid4())
        for _ in range(2):
            status, result = self.steer('steer-reject', turn, rejected)
            self.assertEqual(409, status)
            self.assertEqual('error_steer_rejected', result['code'])
        self.assertEqual(409, self.steer('different', turn, key)[0])
        self.assertEqual(409, self.steer('stale', 'old-turn')[0])
        self.api('POST', f'/v1/sessions/{self.session_id}/respond',
            {'prompt_id': prompt, 'decision': 'decline', 'request_id': str(uuid.uuid4())})
        self.until(lambda e: e['session']['turn_state'] == 'ready')
        self.assertEqual(409, self.steer('too late', turn)[0])
        self.assertFalse((self.root/'project/approved').exists())

    def test_steer_timeout_is_not_reported_as_success_or_replayed(self):
        self.chat()
        self.message('wait')
        turn = self.until(lambda e: e['session']['turn_state'] == 'running')['session']['active_turn_id']
        key = str(uuid.uuid4())
        for _ in range(2):
            status, result = self.steer('steer-timeout', turn, key)
            self.assertEqual(409, status)
            self.assertEqual('error_input_uncertain', result['code'])
        self.assertEqual('1', (self.root/'project/turn-count').read_text())
        self.queue(text='after timed out steer')
        self.api('POST', f'/v1/sessions/{self.session_id}/interrupt', {})
        self.until(lambda e: e['session']['turn_state'] == 'ready')
        self.assertEqual(200, self.queue('resume')[0])
        self.until(lambda e: e['session']['turn_state'] == 'ready' and not e['queue'])
        self.assertEqual('2', (self.root/'project/turn-count').read_text())
