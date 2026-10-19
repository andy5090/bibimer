import json
import threading
import unittest
import uuid

from test_bridge import module
from test_chat import ChatFixture


class ResponsePreviewTests(unittest.TestCase):
    def test_markdown_becomes_readable_text_and_preserves_code_names(self):
        text = "## 완료\n- **알림 수정**: [`my_file.py`](https://example.invalid/path)\n- [x] _테스트_ 통과\n```python\nprint('ok')\n```\n&gt; 다음 단계 &amp; 확인"
        self.assertEqual("완료 알림 수정: my_file.py 테스트 통과 print('ok') 다음 단계 & 확인", module.response_preview(text))
        self.assertEqual("문서 참고", module.response_preview("[문서][ref] 참고\n[ref]: https://example.invalid"))

    def test_unicode_boundaries_controls_and_empty_answer(self):
        self.assertEqual("안녕 👩‍💻 작업 완료", module.response_preview("\x1b[32m안녕 👩‍💻\x1b[0m\n작업\t완료\u202e"))
        self.assertEqual("😀" * 179 + "…", module.response_preview("😀" * 181))
        self.assertEqual("가" * 180, module.response_preview("가" * 180))
        self.assertEqual("", module.response_preview(None))
        self.assertEqual("", module.response_preview("```\n```\n---"))


class CompletionFeedTests(unittest.TestCase):
    def test_baseline_restart_overflow_and_long_poll(self):
        instance = str(uuid.uuid4())
        feed = module.CompletionFeed(instance)
        feed.publish('session', 'project', 'codex')
        initial = feed.read('none', 0, 0)
        self.assertTrue(initial['reset'])
        self.assertEqual([], initial['events'])
        self.assertEqual(1, initial['cursor'])
        received = []
        worker = threading.Thread(target=lambda: received.append(feed.read(instance, 1, 2)))
        worker.start()
        feed.publish('second', 'project', 'claude')
        worker.join(1)
        self.assertFalse(worker.is_alive())
        self.assertEqual(['second'], [row['session_id'] for row in received[0]['events']])
        for _ in range(520):
            feed.publish('session', 'project', 'opencode')
        result = feed.read(instance, 1, 0)
        self.assertTrue(result['gap'])
        self.assertEqual(512, len(result['events']))
        self.assertEqual(list(range(11, 523)), [row['id'] for row in result['events']])
        self.assertTrue(feed.read(instance, 999, 0)['reset'])
        restarted = module.CompletionFeed(str(uuid.uuid4())).read(instance, result['cursor'], 0)
        self.assertTrue(restarted['reset'])
        self.assertEqual([], restarted['events'])


class ResponseNotificationTests(ChatFixture):
    def feed(self, cursor=0):
        status, data = self.api('GET', f'/v1/completions?instance={self.bridge.instance}&cursor={cursor}&wait=0')
        self.assertEqual(200, status)
        return data

    def test_each_queued_completion_is_reported_without_transcript_or_duplicates(self):
        session = self.chat()
        self.assertEqual([], self.feed()['events'])  # Initial ready/import is not a response.
        self.message('approval')
        prompt = self.until(lambda e: bool(e['requests']))['requests'][0]['id']
        self.assertEqual([], self.feed()['events'])
        for text in ['PRIVATE first', 'PRIVATE second']:
            self.assertEqual(200, self.api('POST', f'/v1/sessions/{session.id}/queue',
                {'action':'add', 'text':text, 'request_id':str(uuid.uuid4())})[0])
        self.api('POST', f'/v1/sessions/{session.id}/respond',
            {'prompt_id':prompt, 'decision':'decline', 'request_id':str(uuid.uuid4())})
        self.until(lambda e: not e['queue'] and sum(row['kind'] == 'turn' for row in e['items']) == 2)
        result = self.feed()
        self.assertEqual([1, 2], [row['id'] for row in result['events']])
        self.assertEqual({session.id}, {row['session_id'] for row in result['events']})
        self.assertNotIn('PRIVATE', json.dumps(result))
        self.assertTrue(all(row['preview'].startswith('Result Formatted reply') for row in result['events']))
        self.assertTrue(all(len(row['preview']) <= 180 for row in result['events']))
        self.assertEqual({'id','session_id','project_id','agent','completed_at','project_name','session_title','preview'}, set(result['events'][0]))
        with session.condition:
            session._handle({'method':'turn/completed','params':{'turn':{'id':'duplicate','status':'completed'}}})
        self.assertEqual([], self.feed(result['cursor'])['events'])
        self.bridge.persist()
        self.assertNotIn('completed_at', (self.state/'metadata.json').read_text())
        self.assertNotIn(result['events'][0]['preview'], (self.state/'metadata.json').read_text())
        initial = self.api('GET', '/v1/completions?instance=none&cursor=0&wait=0')[1]
        self.assertTrue(initial['reset'])
        self.assertEqual([], initial['events'])

    def test_preview_uses_current_final_answer_and_survives_output_eviction(self):
        session = self.chat()
        def emit(method, **params):
            session._handle({'method':method,'params':params})
        def item(turn, kind, text, identity='answer', **fields):
            emit('item/completed', turnId=turn, item={'id':identity,'type':kind,'text':text,**fields})
        with session.condition:
            session._item({'id':'history','type':'agentMessage','text':'OLD HISTORY'}, 'old', True)
            emit('turn/started', turn={'id':'first'})
            emit('item/started', turnId='first', item={'id':'progress','type':'agentMessage','phase':'commentary','text':'PROGRESS'})
            item('first', 'agentMessage', 'PROGRESS DONE', identity='progress')
            item('first', 'reasoning', 'REASONING SECRET', identity='reasoning')
            item('first', 'userMessage', 'USER SECRET', identity='user')
            item('old', 'agentMessage', 'OLD RESPONSE', phase='final_answer')
            item('first', 'agentMessage', '**응답 미리보기**를 구현했습니다. ✅', phase='final_answer')
            item('first', 'agentMessage', 'LATE UNCLASSIFIED', identity='late')
            for number in range(205):
                item('first', 'commandExecution', 'TOOL OUTPUT', identity='command-'+str(number), aggregatedOutput='TOOL OUTPUT')
            emit('turn/completed', turn={'id':'first','status':'completed'})
            emit('turn/started', turn={'id':'second'})
            item('second', 'agentMessage', 'COMMENTARY ONLY', phase='commentary')
            emit('turn/completed', turn={'id':'second','status':'completed'})
            emit('turn/started', turn={'id':'third'})
            item('third', 'agentMessage', 'Legacy answer without phase')
            emit('turn/completed', turn={'id':'third','status':'completed'})
            emit('turn/started', turn={'id':'fourth'})
            item('fourth', 'agentMessage', 'UNFINISHED', status='inProgress')
            emit('turn/completed', turn={'id':'fourth','status':'completed'})
        self.assertEqual(['응답 미리보기를 구현했습니다. ✅', '', 'Legacy answer without phase', ''],
                         [row['preview'] for row in self.feed()['events']])

    def test_adapter_native_message_id_is_mapped_to_current_response_only(self):
        session = self.chat()
        with session.condition:
            session._handle({'method':'turn/started','params':{'turn':{'id':'bridge-turn'}}})
            for source_turn, mapped_turn, text in [('native-parent','bridge-turn','**OpenCode** answer'), ('old-parent',None,'OLD ANSWER')]:
                session._handle({'method':'item/completed','params':{'turnId':source_turn,'responseTurnId':mapped_turn,
                    'item':{'id':'native-answer','type':'agentMessage','text':text}}})
            session._handle({'method':'turn/completed','params':{'turn':{'id':'bridge-turn','status':'completed'}}})
        self.assertEqual('OpenCode answer', self.feed()['events'][0]['preview'])

    def test_interrupted_failed_unmatched_and_missing_status_do_not_notify(self):
        session = self.chat()
        self.message('wait')
        self.until(lambda e: e['session']['turn_state'] == 'running')
        self.api('POST', f'/v1/sessions/{session.id}/interrupt', {})
        self.until(lambda e: e['session']['turn_state'] == 'ready')
        for status in ['failed', 'interrupted', None]:
            with session.condition:
                session.turn_id = 'test-turn'
                session._handle({'method':'turn/completed','params':{'turn':{'id':'test-turn','status':status}}})
        with session.condition:
            session.turn_id = 'current'
            session._handle({'method':'turn/completed','params':{'turn':{'id':'old','status':'completed'}}})
            self.assertEqual('current', session.turn_id)
            session.turn_id = None
        self.assertEqual([], self.feed()['events'])

    def test_all_projects_archived_sessions_current_labels_and_deleted_session(self):
        first = self.chat()
        self.api('POST', f'/v1/sessions/{first.id}/manage', {'action':'archive'})
        self.message('one')
        self.until(lambda e: e['session']['turn_state'] == 'ready')
        self.api('POST', f'/v1/sessions/{first.id}/manage', {'action':'rename','title':'Mobile task'})
        self.api('POST', '/v1/project/manage', {'project_id':first.project['id'], 'action':'rename','name':'Renamed'})
        project = self.api('POST', '/v1/project', {'path':str(self.root/'other'), 'create':True, 'add':True})[1]['project']
        result = self.api('POST', '/v1/sessions', {'project_id':project['id'], 'agent':'codex', 'mode':'chat', 'request_id':str(uuid.uuid4())})[1]
        self.session_id = result['session']['id']
        self.until(lambda e: e['session']['turn_state'] == 'ready')
        self.message('two')
        self.until(lambda e: e['session']['turn_state'] == 'ready')
        rows = self.feed()['events']
        self.assertEqual([first.id, self.session_id], [row['session_id'] for row in rows])
        self.assertEqual('Renamed', rows[0]['project_name'])
        self.assertEqual('Mobile task', rows[0]['session_title'])
        first.stop()
        first.process.wait(timeout=5)
        first.reader.join(timeout=2)
        with first.condition:
            self.assertTrue(first.condition.wait_for(lambda: first.state == 'exited', timeout=5))
        self.assertEqual(200, self.api('POST', f'/v1/sessions/{first.id}/manage', {'action':'delete'})[0])
        self.assertEqual([self.session_id], [row['session_id'] for row in self.feed()['events']])
        self.assertEqual(2, self.feed()['cursor'])

    def test_feed_requires_auth_and_valid_cursor_and_ignores_pty(self):
        self.assertEqual(401, self.api('GET', '/v1/completions', auth=False)[0])
        for query in ['cursor=-1','cursor=9007199254740992','cursor=no','wait=21','wait=-1','instance=invalid']:
            self.assertEqual(400, self.api('GET', '/v1/completions?' + query)[0])
        session = self.launch()
        self.send(session, "printf 'Response complete\\n'\r")
        self.output_until(session, b'Response complete')
        self.assertEqual([], self.feed()['events'])
