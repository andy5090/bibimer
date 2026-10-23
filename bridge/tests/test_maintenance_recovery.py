"""Owned processes only: maintenance receipts, stable identity and no work replay."""
import json
import os
from pathlib import Path
import time
import uuid
from unittest.mock import patch

from test_bridge import module
from test_providers import ProviderFixture

recovery = module.maintenance_recovery


class RecoveryTests(ProviderFixture):
    def stop(self, key):
        self.bridge.get_session(key).stop()
        self.bridge.get_session(key).process.wait(timeout=5)
        self.bridge.get_session(key).reader.join(timeout=2)
        deadline=time.monotonic()+3
        while self.bridge.get_session(key).state!='exited' and time.monotonic()<deadline:time.sleep(.02)
        self.assertEqual('exited', self.bridge.get_session(key).state)

    def arm(self, ids):
        request = {'id': str(uuid.uuid4()), 'instance': self.bridge.instance, 'session_ids': ids}
        recovery.prepare(self.state, self.bridge.health(), request)
        return request

    def reload(self):
        if self.bridge.browser_tools:
            self.bridge.browser_tools.close()
        self.bridge = module.Bridge(self.state)
        self.server.bridge = self.bridge

    def done(self):
        deadline = time.monotonic()+8
        while self.bridge.recovery.running and time.monotonic()<deadline:
            time.sleep(.02)
        self.assertFalse(self.bridge.recovery.running)
        return self.bridge.recovery.snapshot()

    def test_saved_chat_and_terminal_keep_ids_selection_archive_and_never_replay_work(self):
        with patch.dict(os.environ, BIBIMER_TEST_CODEX_STORE=str(self.root/'native.json')):
            first = self.chat()
            self.message('SAVED_PRIVATE_CHAT')
            self.until(lambda event: any(item['kind']=='turn' for item in event['items']))
            native_id = first.thread_id
            self.api('POST', f'/v1/sessions/{first.id}/manage', {'action':'rename','title':'Saved chat'})
            status, result = self.api('POST', '/v1/sessions', {'agent':'shell','new_session':True,'request_id':str(uuid.uuid4())})
            self.assertEqual(200, status)
            terminal = result['session']
            self.send(terminal['id'], "echo OLD_PTY_MARKER; echo once >> ran-command\n")
            deadline=time.monotonic()+3
            while not (self.root/'project/ran-command').exists() and time.monotonic()<deadline:time.sleep(.02)
            self.assertTrue((self.root/'project/ran-command').exists())
            self.api('POST', f"/v1/sessions/{terminal['id']}/manage", {'action':'archive'})
            self.api('POST','/v1/project-session',{'project_id':first.project['id'],'session_id':first.id})
            self.stop(first.id); self.stop(terminal['id'])
            request = self.arm([first.id, terminal['id']])
            record = (self.state/recovery.NAME).read_text()
            self.assertNotIn('SAVED_PRIVATE_CHAT',record)
            self.assertNotIn('OLD_PTY_MARKER',record)
            self.assertEqual(0o600,(self.state/recovery.NAME).stat().st_mode & 0o777)
            self.reload()
            self.assertEqual(0,self.bridge.active_count())
            self.bridge.recovery.begin(request['id'], automatic=True)
            summary = self.done()
            self.assertEqual(2, summary['restored'], summary)
            self.assertEqual('done',summary['state'])
            self.assertEqual({first.id,terminal['id']},set(self.bridge.sessions))
            self.assertEqual(first.id,self.bridge.selected_sessions[first.project['id']]['codex'])
            resumed = self.bridge.get_session(first.id)
            self.assertEqual(native_id,resumed.thread_id)
            self.assertTrue(any(item.get('text')=='SAVED_PRIVATE_CHAT' for item in resumed.events(0,0)['items']))
            snapshots = {row['id']:row for row in self.bridge.snapshots()}
            self.assertEqual('Saved chat',snapshots[first.id]['title'])
            self.assertTrue(snapshots[terminal['id']]['archived'])
            self.assertEqual('1',(self.root/'project/turn-count').read_text())
            self.assertEqual('once\n',(self.root/'project/ran-command').read_text())
            launch_ids = {key:value.launch_id for key,value in self.bridge.sessions.items()}
            self.bridge.recovery.begin(request['id']); self.done()
            self.assertEqual(launch_ids,{key:value.launch_id for key,value in self.bridge.sessions.items()})

    def test_claude_and_opencode_resume_native_ids_without_sending_another_turn(self):
        for agent in ('claude', 'opencode'):
            with self.subTest(agent=agent):
                session=self.begin(agent, imported=True, mode='resume')
                native=session.thread_id
                self.message('Completed before maintenance')
                self.until(lambda event: event['session']['turn_state']=='ready' and any(item['kind']=='turn' for item in event['items']))
                self.stop(session.id)
                request=self.arm([session.id])
                self.reload()
                self.bridge.recovery.begin(request['id'],automatic=True)
                summary=self.done()
                self.assertEqual(1,summary['restored'],summary)
                restored=self.bridge.get_session(session.id)
                self.assertEqual(native,restored.thread_id)
                self.assertFalse(restored.queue)
                self.assertEqual('1',(self.root/'project'/f'{agent}-turn-count').read_text())
                self.stop(session.id)

    def test_native_resume_failure_keeps_original_row_and_confirmed_exit_is_retryable(self):
        first=self.chat()
        self.stop(first.id)
        first.thread_id='import-failure'
        first.history_persisted=True
        self.bridge.persist()
        request=self.arm([first.id])
        self.reload()
        self.bridge.recovery.begin(request['id'],automatic=True)
        summary=self.done()
        self.assertEqual(1,summary['failed'],summary)
        self.assertEqual(1,summary['retryable'])
        self.assertEqual([],list(self.bridge.sessions))
        source=self.bridge.snapshots()[0]
        self.assertEqual(first.id,source['id'])
        self.assertEqual('import-failure',source['external_thread_id'])
        self.assertEqual('exited',source['state'])

    def test_ephemeral_chat_is_skipped_and_ordinary_startup_does_not_reopen(self):
        first = self.chat()
        first.history_persisted=False  # Agent explicitly reports no resumable history.
        self.stop(first.id)
        request = self.arm([first.id])
        self.reload()
        self.assertEqual(0,self.bridge.active_count())
        self.assertEqual('exited',self.bridge.snapshots()[0]['state'])
        self.bridge.recovery.begin(request['id'], automatic=True)
        summary = self.done()
        self.assertEqual(1,summary['skipped'])
        self.assertEqual(0,summary['retryable'])
        self.assertEqual(0,self.bridge.active_count())

    def test_missing_folder_failure_can_retry_without_duplicate_and_changed_source_is_kept(self):
        key = self.launch()
        self.stop(key)
        request = self.arm([key])
        self.reload()
        folder = self.root/'project'
        folder.rename(self.root/'moved')
        self.bridge.recovery.begin(request['id'], automatic=True)
        summary = self.done()
        self.assertEqual(1,summary['failed'],summary)
        self.assertEqual(1,summary['retryable'])
        self.assertEqual('exited',self.bridge.snapshots()[0]['state'])
        (self.root/'moved').rename(folder)
        self.assertEqual(401,self.api('POST','/v1/maintenance/recovery',{'id':request['id']},auth=False)[0])
        self.assertEqual(200,self.api('POST','/v1/maintenance/recovery',{'id':request['id']})[0])
        self.assertEqual(1,self.done()['restored'])
        self.assertEqual([key],list(self.bridge.sessions))

    def test_unconfirmed_launch_receipt_never_replayed_after_crash(self):
        key = self.launch(); self.stop(key)
        request = self.arm([key])
        plan = recovery.read(self.state)
        plan['state']='restoring';plan['rows'][0]['state']='launching'
        recovery.save(self.state,plan)
        self.reload()
        self.bridge.recovery.begin(request['id'],automatic=True)
        self.assertEqual(0,self.bridge.active_count())
        self.bridge.recovery.begin(request['id'])
        summary = self.done()
        self.assertEqual(1,summary['uncertain'])
        self.assertEqual(0,summary['retryable'])
        self.assertEqual(0,self.bridge.active_count())

    def test_expired_plan_requires_explicit_retry_and_corrupt_record_does_not_break_health(self):
        key=self.launch(); self.stop(key)
        request=self.arm([key])
        plan=recovery.read(self.state);plan['expires_at']=0;recovery.save(self.state,plan)
        self.reload()
        self.bridge.recovery.begin(request['id'],automatic=True)
        self.assertEqual(0,self.bridge.active_count())
        self.assertEqual('armed',self.bridge.recovery.snapshot()['state'])
        self.bridge.recovery.begin(request['id'])
        self.assertEqual(1,self.done()['restored'])
        self.stop(key)
        (self.state/recovery.NAME).write_text('{"format":1,"rows":[{}]}')
        self.reload()
        self.assertIsNone(self.bridge.health()['maintenance_recovery'])
        self.arm([key])  # A new explicit update can replace the corrupt receipt.
        self.assertIsNotNone(recovery.read(self.state))

    def test_changed_source_receipt_cannot_replace_or_delete_the_newer_row(self):
        key=self.launch(); self.stop(key)
        request=self.arm([key]); self.reload()
        newer=str(uuid.uuid4())
        self.bridge.previous_sessions[key]['launch_id']=newer
        self.bridge.recovery.begin(request['id'],automatic=True)
        self.assertEqual(1,self.done()['failed'])
        self.assertEqual(newer,self.bridge.snapshots()[0]['launch_id'])
        self.assertEqual(0,self.bridge.active_count())

    def test_prepare_rejects_active_stale_instance_unknown_duplicate_and_extra_targets(self):
        key = self.launch()
        request = {'id':str(uuid.uuid4()),'instance':self.bridge.instance,'session_ids':[key]}
        with self.assertRaises(ValueError):recovery.prepare(self.state,self.bridge.health(),request)
        self.stop(key)
        for change in [{'instance':str(uuid.uuid4())},{'session_ids':[str(uuid.uuid4())]},
                       {'session_ids':[key,key]},{'command':'must not execute'}]:
            with self.assertRaises(ValueError):recovery.prepare(self.state,self.bridge.health(),{**request,**change})
        self.assertFalse((self.state/recovery.NAME).exists())
