import base64
import fcntl
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import time
import uuid
from unittest.mock import patch
import zlib

import test_restart
from test_bridge import module

SPEC = importlib.util.spec_from_file_location('maintenance', Path(__file__).parents[1] / 'maintain_bridge.py')
maintenance = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(maintenance)


class MaintenanceTests(test_restart.RestartTests):
    def setUp(self):
        super().setUp()
        self.folder = self.root / 'installed'
        self.folder.mkdir()
        self.source = Path(module.__file__).read_bytes()
        self.old = self.source.replace(f'VERSION = "{module.VERSION}"'.encode(), b'VERSION = "0.15.0"')
        (self.folder / 'bibimer_bridge.py').write_bytes(self.old)
        (self.folder / 'browser_tools.py').write_bytes(Path(module.__file__).with_name('browser_tools.py').read_bytes())
        self.payload = self.bundle({'bibimer_bridge.py': self.source, 'provider_opencode.py': b'# adapter\n', 'browser_tools.py': Path(module.__file__).with_name('browser_tools.py').read_bytes()})

    @staticmethod
    def bundle(files):
        return {name: {'data': base64.b64encode(zlib.compress(data)).decode(), 'sha256': hashlib.sha256(data).hexdigest()} for name, data in files.items()}

    def run_maintenance(self, action='update', payload=None):
        original = subprocess.Popen
        def spawn(*args, **kwargs):
            process = original(*args, **kwargs)
            self.processes.append(process)
            return process
        with patch.object(maintenance.subprocess, 'Popen', side_effect=spawn):
            return maintenance.maintain(action, payload or self.payload, self.state, self.folder, self.port)

    def test_update_and_restart_keep_token_archived_session_and_native_history(self):
        fixture = self.root / 'codex'
        fixture.write_text('#!' + sys.executable + '\n' + Path(__file__).with_name('fake_codex.py').read_text())
        fixture.chmod(0o700)
        with patch.dict(os.environ, {'PATH': str(self.root) + os.pathsep + os.environ['PATH'],
                                    'BIBIMER_TEST_CODEX_STORE': str(self.root / 'native-history.json')}):
            self.server()
            self.post('/v1/project', {'path': str(self.root / 'project'), 'create': True})
            session = self.post('/v1/sessions', {'agent': 'codex', 'mode': 'chat', 'request_id': str(uuid.uuid4())})['session']
            endpoint = '/v1/sessions/' + session['id']
            def event_until(predicate):
                deadline = time.monotonic() + 6
                while time.monotonic() < deadline:
                    status, event = self.request('GET', endpoint + '/events?cursor=0&wait=0')
                    if predicate(event):
                        return event
                    time.sleep(0.03)
                self.fail('Expected native chat state')
            event_until(lambda e: e['session']['ready'])
            self.post(endpoint + '/message', {'text': 'Preserve saved context', 'request_id': str(uuid.uuid4())})
            saved = event_until(lambda e: any(i['kind'] == 'turn' for i in e['items']))['session']
            self.post(endpoint + '/manage', {'action': 'rename', 'title': 'Saved conversation'})
            self.post(endpoint + '/manage', {'action': 'archive'})
            self.post(endpoint + '/stop', {})
            event_until(lambda e: e['session']['state'] == 'exited')
            token = (self.state / 'token.json').read_bytes()
            for action in ['update', 'restart']:
                old_instance = module.bridge_health(self.state, self.port)['instance']
                self.assertEqual('bridge_maintenance_done', self.run_maintenance(action))
                health = module.bridge_health(self.state, self.port)
                self.assertNotEqual(old_instance, health['instance'])
                self.assertEqual(module.VERSION, health['version'])
                row = next(r for p in health['projects'] for r in p['sessions'] if r['id'] == saved['id'])
                self.assertEqual('Saved conversation', row['title'])
                self.assertTrue(row['archived'])
                self.assertEqual('exited', row['state'])
                self.assertEqual(saved['external_thread_id'], row['external_thread_id'])
                self.assertEqual(token, (self.state / 'token.json').read_bytes())
            resumed = self.post('/v1/sessions', {'agent': 'codex', 'mode': 'chat', 'source_thread_id': saved['external_thread_id'],
                'import_mode': 'resume', 'new_session': True, 'request_id': str(uuid.uuid4())})['session']
            endpoint = '/v1/sessions/' + resumed['id']
            event = event_until(lambda e: e['session']['ready'])
            self.assertEqual(saved['external_thread_id'], event['session']['external_thread_id'])
            self.assertTrue(any(i.get('text') == 'Preserve saved context' for i in event['items']))
            self.post(endpoint + '/stop', {})
            event_until(lambda e: e['session']['state'] == 'exited')

    def test_active_session_blocks_both_actions_without_touching_files(self):
        process = self.server()
        self.post('/v1/project', {'path': str(self.root / 'project'), 'create': True})
        self.post('/v1/sessions', {'agent': 'shell', 'request_id': str(uuid.uuid4())})
        for action in ['update', 'restart']:
            with self.assertRaises(maintenance.MaintenanceError) as error:
                self.run_maintenance(action)
            self.assertEqual('bridge_maintenance_busy', error.exception.code)
            self.assertIsNone(process.poll())
            self.assertEqual(self.old, (self.folder / 'bibimer_bridge.py').read_bytes())
            self.assertEqual(1, module.bridge_health(self.state, self.port)['active_sessions'])

    def test_unreachable_locked_server_and_corrupt_bundle_fail_closed(self):
        self.server()
        corrupt = json.loads(json.dumps(self.payload))
        corrupt['provider_opencode.py']['sha256'] = '0' * 64
        before = module.bridge_health(self.state, self.port)['instance']
        with self.assertRaises(maintenance.MaintenanceError):
            self.run_maintenance(payload=corrupt)
        self.assertEqual(before, module.bridge_health(self.state, self.port)['instance'])
        # A locked state without an authenticated HTTP endpoint is never signalled.
        module.restart_bridge(self.state, self.port)
        self.processes[0].wait(timeout=5)
        with open(self.state / 'bridge.lock', 'a') as lock:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            with self.assertRaises(maintenance.MaintenanceError):
                self.run_maintenance()
        self.assertEqual(self.old, (self.folder / 'bibimer_bridge.py').read_bytes())

    def test_restart_uses_installed_version_and_does_not_install_payload(self):
        self.server()
        self.assertEqual('bridge_maintenance_done', self.run_maintenance('restart'))
        self.assertEqual('0.15.0', module.bridge_health(self.state, self.port)['version'])
        self.assertEqual(self.old, (self.folder / 'bibimer_bridge.py').read_bytes())
        self.assertFalse((self.folder / 'provider_opencode.py').exists())

    def test_failed_new_server_restores_old_files_and_restarts_previous_version(self):
        self.server()
        previous_adapter = b"# previous adapter\n"
        (self.folder / 'provider_opencode.py').write_bytes(previous_adapter)
        broken = self.source.replace(b'if __name__ == "__main__":\n    try:',
                                     b'if __name__ == "__main__":\n    sys.exit(9)\n    try:')
        token = (self.state / 'token.json').read_bytes()
        with self.assertRaises(maintenance.MaintenanceError):
            self.run_maintenance(payload=self.bundle({'bibimer_bridge.py': broken, 'provider_opencode.py': b'# new adapter\n', 'browser_tools.py': Path(module.__file__).with_name('browser_tools.py').read_bytes()}))
        deadline = time.monotonic() + 6
        while time.monotonic() < deadline:
            health = module.bridge_health(self.state, self.port)
            if health:
                break
            time.sleep(0.03)
        self.assertEqual('0.15.0', health['version'])
        self.assertEqual(self.old, (self.folder / 'bibimer_bridge.py').read_bytes())
        self.assertEqual(previous_adapter, (self.folder / 'provider_opencode.py').read_bytes())
        self.assertEqual(token, (self.state / 'token.json').read_bytes())
