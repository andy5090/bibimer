"""Maintenance labels follow confirmed process exits, not ordinary session ends."""
import time
import uuid
from unittest.mock import patch

from test_bridge import BridgeTestCase, module


class MaintenanceArchiveTests(BridgeTestCase):
    def receipt(self, key):
        return {'maintenance': {'instance': self.bridge.instance,
            'launch_id': self.bridge.get_session(key).launch_id}}

    def exited(self, key):
        session = self.bridge.get_session(key)
        session.process.wait(timeout=5)
        session.reader.join(timeout=2)
        deadline = time.monotonic() + 3
        while time.monotonic() < deadline:
            row = self.bridge.snapshot_by_id(key)
            marker = self.bridge.session_labels.get(key, {}).get('maintenance_archive')
            if row['state'] == 'exited' and (not marker or row.get('archived')):
                break
            time.sleep(.01)
        self.assertEqual('exited', session.state)
        return self.bridge.snapshot_by_id(key)

    def test_archiving_waits_for_exit_persists_and_preserves_title_and_selection(self):
        key = self.launch()
        session = self.bridge.get_session(key)
        self.bridge.manage_session(key, {'action':'rename', 'title':'Kept session'})
        with patch.object(session, 'stop'):
            self.bridge.stop_session(key, self.receipt(key))
            self.assertFalse(self.bridge.snapshot_by_id(key).get('archived', False))
        session.stop()
        row = self.exited(key)
        self.assertTrue(row['archived'])
        self.assertEqual('Kept session', row['title'])
        self.assertNotIn('maintenance_archive', row)
        restarted = module.Bridge(self.state)
        self.assertTrue(restarted.snapshot_by_id(key)['archived'])
        self.assertEqual(key, restarted.selected_id(row['project']['id']))

    def test_ordinary_stop_and_stale_receipts_do_not_auto_archive(self):
        key = self.launch()
        receipt = self.receipt(key)
        for field in ('instance', 'launch_id'):
            changed = {'maintenance': {**receipt['maintenance'], field:str(uuid.uuid4())}}
            self.assertEqual(409, self.api('POST', f'/v1/sessions/{key}/stop', changed)[0])
            self.assertEqual('running', self.bridge.get_session(key).state)
        self.assertEqual(200, self.api('POST', f'/v1/sessions/{key}/stop', {})[0])
        self.assertFalse(self.exited(key).get('archived', False))

    def test_stop_failure_removes_marker_and_manual_classification_overrides_it(self):
        key = self.launch()
        session = self.bridge.get_session(key)
        with patch.object(session, 'stop', side_effect=OSError('fixture failure')):
            with self.assertRaises(OSError):
                self.bridge.stop_session(key, self.receipt(key))
        self.assertNotIn('maintenance_archive', self.bridge.session_labels[key])
        with patch.object(session, 'stop'):
            self.bridge.stop_session(key, self.receipt(key))
        self.bridge.manage_session(key, {'action':'restore'})
        session.stop()
        self.assertFalse(self.exited(key).get('archived', False))
