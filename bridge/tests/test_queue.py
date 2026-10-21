import json
import threading
import uuid

from test_chat import ChatFixture
from test_bridge import module


class QueueTests(ChatFixture):
    def test_batch_freezes_members_and_new_messages_wait_for_next_response(self):
        session = self.chat()
        self.message('approval')
        prompt = self.until(lambda e: bool(e['requests']))['requests'][0]['id']
        for text in ['one', 'two', 'three']:
            self.queue(text=text)
        original = session._rpc
        batches = []
        def hold(method, params, kind):
            if isinstance(kind, tuple) and kind[0] == 'queue':
                batches.append((params, kind))
                return 'held-batch'
            return original(method, params, kind)
        session._rpc = hold
        self.api('POST', f'/v1/sessions/{self.session_id}/respond', {'prompt_id':prompt,'decision':'decline','request_id':str(uuid.uuid4())})
        event = self.until(lambda e: len(e['queue']) == 3 and all(row['state'] == 'sending' for row in e['queue']))
        self.assertEqual('one\n\ntwo\n\nthree', batches[0][0]['input'][0]['text'])
        self.assertEqual(409, self.queue('remove', entry_id=event['queue'][1]['id'])[0])
        self.queue(text='arrived later')
        with session.condition:
            session.rpc_pending['held-batch'] = batches[0][1]
            session._handle({'id':'held-batch','result':{'turn':{'id':'batch-turn'}}})
        self.assertEqual(['arrived later'], [row['text'] for row in session.events(0,0)['queue']])
        self.assertEqual(1, len(batches))
        session._rpc = original
        with session.condition:
            session._handle({'method':'turn/completed','params':{'turn':{'id':'batch-turn','status':'completed'}}})
            session._drain_queue()
        event = self.until(lambda e: not e['queue'] and e['session']['turn_state'] == 'ready')
        self.assertIn('arrived later', [row.get('text') for row in event['items']])

    def test_rejected_batch_retains_all_members_and_resumes_together(self):
        session = self.chat()
        self.message('wait')
        self.until(lambda e: e['session']['turn_state'] == 'running')
        first = str(uuid.uuid4())
        self.queue(text='start-error', key=first)
        self.queue(text='second message')
        self.api('POST', f'/v1/sessions/{self.session_id}/interrupt', {})
        self.until(lambda e: e['session']['turn_state'] == 'ready')
        # The fixture rejects by the exact first text; inject a native refusal
        # to test atomic retention of the complete submitted batch.
        original = session._rpc
        def reject(method, params, kind):
            if isinstance(kind, tuple) and kind[0] == 'queue':
                session.rpc_pending['reject-batch'] = kind
                session._handle({'id':'reject-batch','error':{'message':'controlled refusal'}})
                return 'reject-batch'
            return original(method, params, kind)
        session._rpc = reject
        self.queue('resume')
        event = self.until(lambda e: e['session']['queue_paused'] and all(row['state'] == 'failed' for row in e['queue']))
        self.assertEqual(2, len(event['queue']))
        self.assertEqual('1', (self.root/'project/turn-count').read_text())
        session._rpc = original
        self.queue('remove', entry_id=first)
        self.queue('resume')
        self.until(lambda e: not e['queue'] and e['session']['turn_state'] == 'ready')
        self.assertEqual('2', (self.root/'project/turn-count').read_text())

    def test_full_capacity_batch_preserves_all_text_in_one_native_input(self):
        self.chat()
        self.message('wait')
        self.until(lambda e: e['session']['turn_state'] == 'running')
        texts = [str(index) + 'x' * 16382 for index in range(16)]
        for text in texts:
            self.assertEqual(200, self.queue(text=text)[0])
        self.api('POST', f'/v1/sessions/{self.session_id}/interrupt', {})
        self.until(lambda e: e['session']['turn_state'] == 'ready')
        self.queue('resume')
        self.until(lambda e: not e['queue'] and e['session']['turn_state'] == 'ready')
        captured = json.loads((self.root/'project/codex-inputs.jsonl').read_text().splitlines()[-1])
        self.assertEqual('\n\n'.join(texts), captured['input'][0]['text'])
        self.assertEqual('2', (self.root/'project/turn-count').read_text())

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
        self.assertNotIn('"text"', json.dumps(session.snapshot()))
        self.assertNotIn('PRIVATE queued', json.dumps(session.snapshot()))
        restored = module.Bridge(self.state)
        snapshot = restored.health()['session']
        self.assertEqual('lost', snapshot['state'])
        self.assertEqual(0, snapshot['queued_count'])
        self.assertIsNone(snapshot['active_turn_id'])
        self.assertEqual([], restored.session_events(session.id, 0, 0)['queue'])
        self.assertEqual(200, self.api('POST', f'/v1/sessions/{self.session_id}/respond',
            {'prompt_id': prompt, 'decision': 'decline', 'request_id': str(uuid.uuid4())})[0])
        event = self.until(lambda e: not e['queue'] and sum(i['kind'] == 'turn' for i in e['items']) == 2)
        self.assertEqual(['approval', 'PRIVATE queued first\n\nPRIVATE queued second'],
                         [i['text'] for i in event['items'] if i['kind'] == 'user'])
        self.assertFalse((self.root/'project/approved').exists())
        self.assertEqual(200, self.queue(text='PRIVATE queued first', key=first)[0])
        self.assertEqual('2', (self.root/'project/turn-count').read_text())
        turns = [json.loads(line) for line in (self.root/'project/codex-options.jsonl').read_text().splitlines()
                 if json.loads(line)['method'] == 'turn/start']
        self.assertEqual(['readOnly'], [entry['sandboxPolicy']['type'] for entry in turns[1:]])
        self.assertEqual(['fast'], [entry['serviceTier'] for entry in turns[1:]])

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

    def test_queue_steer_moves_selected_entry_once_and_preserves_approval(self):
        self.chat()
        self.message('approval')
        event = self.until(lambda e: bool(e['requests']))
        turn, prompt = event['session']['active_turn_id'], event['requests'][0]['id']
        first, selected, request = (str(uuid.uuid4()) for _ in range(3))
        self.queue(text='keep FIFO position', key=first)
        self.queue(text='queued steer only once', key=selected)
        for _ in range(2):
            status, result = self.queue('steer', key=request, entry_id=selected, turn_id=turn)
            self.assertEqual(200, status, result)
            self.assertEqual([first], [row['id'] for row in result['queue']])
        event = self.until(lambda e: any(i.get('text') == 'queued steer only once' for i in e['items']))
        self.assertEqual(prompt, event['requests'][0]['id'])
        self.assertEqual(turn, event['session']['active_turn_id'])
        self.assertEqual(1, sum(i.get('text') == 'queued steer only once' for i in event['items']))
        self.assertEqual('1', (self.root/'project/turn-count').read_text())
        self.assertEqual(409, self.queue('steer', entry_id=selected, turn_id=turn)[0])
        self.assertEqual(409, self.queue('steer', key=request, entry_id=first, turn_id=turn)[0])
        self.api('POST', f'/v1/sessions/{self.session_id}/respond',
            {'prompt_id':prompt, 'decision':'decline', 'request_id':str(uuid.uuid4())})
        event = self.until(lambda e: not e['queue'] and e['session']['turn_state'] == 'ready')
        self.assertEqual('2', (self.root/'project/turn-count').read_text())
        self.assertFalse((self.root/'project/approved').exists())

    def test_queue_steer_rejection_stale_target_and_other_session_keep_entry(self):
        first_session = self.chat()
        self.message('wait')
        turn = self.until(lambda e: e['session']['turn_state'] == 'running')['session']['active_turn_id']
        entry, request = str(uuid.uuid4()), str(uuid.uuid4())
        self.queue(text='steer-reject', key=entry)
        self.assertEqual(409, self.queue('steer', entry_id=entry, turn_id='stale-turn')[0])
        self.assertEqual('queued', first_session.events(0,0)['queue'][0]['state'])
        for _ in range(2):
            status, result = self.queue('steer', key=request, entry_id=entry, turn_id=turn)
            self.assertEqual(409, status)
            self.assertEqual('error_queue_steer_rejected', result['code'])
        event = self.until(lambda e: e['queue'][0]['state'] == 'failed')
        self.assertTrue(event['session']['queue_paused'])
        self.assertEqual('steer-reject', event['queue'][0]['text'])
        _, project = self.api('POST','/v1/project',{'path':str(self.root/'second'),'create':True,'add':True})
        _, result = self.api('POST','/v1/sessions',{'agent':'codex','mode':'chat',
            'project_id':project['project']['id'],'request_id':str(uuid.uuid4())})
        self.session_id = result['session']['id']
        self.until(lambda e: e['session']['ready'])
        self.message('wait')
        other_turn = self.until(lambda e: e['session']['turn_state'] == 'running')['session']['active_turn_id']
        self.assertEqual(409,self.queue('steer',entry_id=entry,turn_id=other_turn)[0])
        self.assertEqual(entry,first_session.events(0,0)['queue'][0]['id'])
        self.session_id = first_session.id
        self.api('POST', f'/v1/sessions/{self.session_id}/interrupt', {})
        self.until(lambda e: e['session']['turn_state'] == 'ready')
        self.assertEqual(200,self.queue('resume')[0])
        self.until(lambda e: not e['queue'] and e['session']['turn_state'] == 'ready')
        self.assertEqual('2',(self.root/'project/turn-count').read_text())

    def test_queue_steer_uncertain_delivery_cannot_be_replayed_or_resumed(self):
        self.chat()
        self.message('wait')
        turn = self.until(lambda e: e['session']['turn_state'] == 'running')['session']['active_turn_id']
        for text in ['steer-timeout','steer-wrong-receipt']:
            with self.subTest(text=text):
                entry, request = str(uuid.uuid4()), str(uuid.uuid4())
                self.queue(text=text,key=entry)
                for _ in range(2):
                    status,result = self.queue('steer',key=request,entry_id=entry,turn_id=turn)
                    self.assertEqual((409,'error_input_uncertain'),(status,result.get('code')))
                event = self.until(lambda e: e['queue'][0]['state'] == 'uncertain')
                self.assertTrue(event['session']['queue_paused'])
                self.assertEqual(text,event['queue'][0]['text'])
                self.assertEqual(409,self.queue('steer',entry_id=entry,turn_id=turn)[0])
                self.assertEqual(409,self.queue('resume')[0])
                self.assertEqual(200,self.queue('remove',entry_id=entry)[0])
        self.assertEqual('1',(self.root/'project/turn-count').read_text())

    def test_queue_steer_blocks_fifo_until_receipt_even_when_turn_finishes(self):
        self.chat()
        self.message('wait')
        turn = self.until(lambda e: e['session']['turn_state'] == 'running')['session']['active_turn_id']
        first, selected = str(uuid.uuid4()), str(uuid.uuid4())
        self.queue(text='next response',key=first)
        self.queue(text='steer-complete-before-receipt',key=selected)
        result = []
        worker = threading.Thread(target=lambda: result.append(self.queue('steer',entry_id=selected,turn_id=turn)))
        worker.start()
        try:
            event = self.until(lambda e: e['session']['turn_state']=='ready' and any(row['state']=='steering' for row in e['queue']))
            self.assertEqual([first,selected],[row['id'] for row in event['queue']])
            self.assertEqual('1',(self.root/'project/turn-count').read_text())
            self.assertEqual(409,self.queue('remove',entry_id=selected)[0])
            self.assertEqual(409,self.queue('resume')[0])
        finally:
            (self.root/'project/release-steer-receipt').touch()
            worker.join(timeout=5)
        self.assertFalse(worker.is_alive())
        self.assertEqual(200,result[0][0],result)
        event = self.until(lambda e: not e['queue'] and e['session']['turn_state']=='ready')
        self.assertEqual('2',(self.root/'project/turn-count').read_text())
        self.assertEqual(1,sum(i.get('text')=='steer-complete-before-receipt' for i in event['items']))
