"""Explicit, bounded maintenance recovery. No messages, commands or PTY replay."""
import contextlib
import fcntl
import json
import math
import os
from pathlib import Path
import tempfile
import threading
import time
import uuid

NAME = 'maintenance-recovery.json'
LIMIT = 128
FIELDS = ('id', 'launch_id', 'project', 'agent', 'mode', 'kind', 'options', 'started_at',
          'cols', 'rows', 'external_thread_id', 'history_persisted', 'source_thread_id', 'import_mode',
          'launch_options', 'handoff', 'browser_digest', 'exit_code')


def identity(value):
    if not isinstance(value, str) or str(uuid.UUID(value)) != value:
        raise ValueError('Invalid recovery identity')
    return value


def read(state):
    path = Path(state) / NAME
    try:
        fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW)
        with os.fdopen(fd, encoding='utf-8') as stream:
            data = stream.read(1024 * 1024 + 1)
        if len(data) > 1024 * 1024:
            raise ValueError('Invalid recovery size')
        value = json.loads(data)
        identity(value['id'])
        if value.get('format') != 1 or not isinstance(value.get('rows'), list) or len(value['rows']) > LIMIT:
            raise ValueError('Invalid recovery record')
        identity(value['source_instance'])
        if value.get('bound_instance') is not None:
            identity(value['bound_instance'])
        if value.get('state') not in {'armed', 'restoring', 'done', 'partial'} or not math.isfinite(value['expires_at']):
            raise ValueError('Invalid recovery state')
        seen = set()
        for row in value['rows']:
            identity(row['id']); identity(row['launch_id'])
            source = row['source']
            if (row['id'] in seen or source['id'] != row['id'] or
                    row['state'] not in {'pending', 'launching', 'restored', 'failed', 'skipped', 'uncertain'} or
                    row.get('error') not in {None, 'maintenance_recovery_no_history', 'maintenance_recovery_failed', 'maintenance_recovery_uncertain'} or
                    source['agent'] not in {'shell', 'codex', 'claude', 'opencode'} or
                    source.get('mode', 'terminal') not in {'chat', 'terminal'} or
                    not isinstance(source['project']['path'], str)):
                raise ValueError('Invalid recovery target')
            identity(source['project']['id'])
            seen.add(row['id'])
        return value
    except FileNotFoundError:
        return None


def save(state, value):
    fd, temporary = tempfile.mkstemp(prefix='.recovery-', dir=state)
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as stream:
            json.dump(value, stream, ensure_ascii=False, allow_nan=False)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, Path(state) / NAME)
    finally:
        with contextlib.suppress(FileNotFoundError):
            os.unlink(temporary)


def prepare(state, health, request):
    """Called by the fixed helper only after every approved process has exited."""
    if not isinstance(request, dict) or set(request) != {'id', 'instance', 'session_ids'}:
        raise ValueError('Invalid recovery request')
    key, instance = identity(request['id']), identity(request['instance'])
    ids = request['session_ids']
    if not isinstance(ids, list) or not 0 < len(ids) <= LIMIT or len(set(ids)) != len(ids):
        raise ValueError('Invalid recovery targets')
    for value in ids:
        identity(value)
    if not health or health['instance'] != instance or health.get('active_sessions'):
        raise ValueError('Recovery source changed')
    rows = {row['id']: row for project in health.get('projects', []) for row in project.get('sessions', [])}
    result = []
    for key_id in ids:
        source = rows.get(key_id)
        if not source or source.get('state') != 'exited':
            raise ValueError('Recovery target is not stopped')
        project = source.get('project', {})
        identity(project.get('id'))
        if not isinstance(project.get('path'), str) or source.get('agent') not in ('shell', 'codex', 'claude', 'opencode'):
            raise ValueError('Invalid recovery source')
        kept = {name: source[name] for name in FIELDS if name in source}
        # Never copy queue entries, item text, previews, URLs or credentials.
        row = {'id': key_id, 'launch_id': str(uuid.uuid5(uuid.UUID(key), key_id)), 'source': kept,
               'state': 'pending', 'error': None}
        if source.get('mode') == 'chat' and (not source.get('history_persisted') or not source.get('external_thread_id')):
            row.update(state='skipped', error='maintenance_recovery_no_history')
        result.append(row)
    plan = {'format': 1, 'id': key, 'source_instance': instance, 'bound_instance': None,
            'created_at': time.time(), 'expires_at': time.time() + 900, 'state': 'armed', 'rows': result}
    try:
        old = read(state)
    except (OSError, ValueError, KeyError, TypeError):
        old = None
    if old and old['id'] == key:
        if old['source_instance'] != instance or [row['id'] for row in old['rows']] != ids:
            raise ValueError('Recovery request changed')
        return key
    save(state, plan)
    return key


class Recovery:
    def __init__(self, bridge):
        self.bridge = bridge
        self.lock = threading.RLock()
        self.running = False
        try:
            self.plan = read(bridge.state)
        except (OSError, ValueError, KeyError, TypeError):
            self.plan = None

    def snapshot(self):
        with self.lock:
            if not self.plan:
                return None
            rows = [{**row, 'state': 'uncertain', 'error': 'maintenance_recovery_uncertain'}
                    if row['state'] == 'launching' and not self.running else row for row in self.plan['rows']]
            counts = {key: sum(row['state'] == key for row in rows)
                      for key in ('restored', 'failed', 'skipped', 'uncertain', 'pending', 'launching')}
            state = self.plan['state']
            if state == 'restoring' and not self.running:
                state = 'interrupted'
            return {'id': self.plan['id'], 'state': state, 'total': len(self.plan['rows']), **counts,
                    'retryable': counts['failed'] + counts['pending'],
                    'rows': [{'id': row['id'], 'state': row['state'], 'error': row.get('error'),
                              'mode': row['source'].get('mode'), 'kind': row['source'].get('kind')}
                             for row in rows]}

    def begin(self, key, automatic=False):
        identity(key)
        with self.lock:
            if not self.plan or self.plan['id'] != key:
                raise ValueError('Recovery not found')
            if self.running:
                return self.snapshot()
            if automatic and (self.plan['state'] != 'armed' or self.plan['expires_at'] < time.time() or
                              self.plan['source_instance'] == self.bridge.instance):
                return self.snapshot()
            guard = open(self.bridge.state / 'maintenance-recovery.lock', 'a')
            try:
                fcntl.flock(guard, fcntl.LOCK_EX | fcntl.LOCK_NB)
            except BlockingIOError:
                guard.close()
                raise ValueError('Recovery is busy') from None
            # Unknown deliveries from another bridge instance must never be replayed.
            for row in self.plan['rows']:
                if row['state'] == 'launching':
                    row.update(state='uncertain', error='maintenance_recovery_uncertain')
            self.plan.update(state='restoring', bound_instance=self.bridge.instance)
            self.running = True
            try:
                save(self.bridge.state, self.plan)
                threading.Thread(target=self._run, args=(guard,), daemon=True).start()
            except Exception:
                self.running = False
                guard.close()
                raise
            return self.snapshot()

    def _set(self, row, state, error=None):
        with self.lock:
            row.update(state=state, error=error)
            save(self.bridge.state, self.plan)

    def _open(self, row):
        bridge, source = self.bridge, row['source']
        with bridge.lock:
            if bridge.closing:
                raise ValueError('Bridge stopping')
            current = next((item for item in bridge.snapshots() if item['id'] == row['id']), None)
            if not current or current.get('state') != 'exited' or current.get('launch_id') != source.get('launch_id'):
                raise ValueError('Source session changed')
            if current['project'] != source['project']:
                raise ValueError('Source project changed')
        body = {'project_id': source['project']['id'], 'worktree_path': source['project']['path'],
                'request_id': row['launch_id']}
        if source.get('kind') == 'browser':
            result = bridge.browser({**body, 'action': 'start', 'url': ''}, restore_id=(source['id'], source.get('launch_id')))['session']
        else:
            body.update(agent=source['agent'], mode=source.get('mode', 'terminal'), new_session=True,
                        options=source.get('options', {'permission': 'inherit'}),
                        cols=source.get('cols', 80), rows=source.get('rows', 24))
            if source.get('mode') == 'chat':
                body.update(source_thread_id=source['external_thread_id'], import_mode='resume')
            result = bridge.launch(body, select=False, restore_id=(source['id'], source.get('launch_id')))
        if result['id'] != source['id']:
            raise ValueError('Another session is already open')
        session = bridge.get_session(result['id'])
        if source.get('mode') == 'chat':
            deadline = time.monotonic() + 25
            with session.condition:
                while time.monotonic() < deadline and session.state == 'running' and session.turn_state not in ('ready', 'failed'):
                    session.condition.wait(timeout=.2)
                if (session.state != 'running' or session.turn_state != 'ready' or session.history_pending or
                        session.thread_id != source['external_thread_id']):
                    raise ValueError('Saved conversation could not resume')
        elif session.process.poll() is not None:
            raise ValueError('Session exited during reopen')

    def _failed(self, row):
        # Terminate only a process launched by this exact recovery receipt. Keep
        # the original logical row/history for an explicit retry after failure.
        bridge = self.bridge
        with bridge.lock:
            session = bridge.sessions.get(row['id'])
        if session and session.launch_id == row['launch_id']:
            try:
                session.stop()
                session.process.wait(timeout=5)
                deadline = time.monotonic() + 3
                while session.state != 'exited' and time.monotonic() < deadline:
                    time.sleep(.02)
                if session.state != 'exited':
                    raise ValueError('Exit unconfirmed')
                with bridge.lock:
                    if bridge.sessions.get(row['id']) is not session:
                        raise ValueError('Session changed')
                    del bridge.sessions[row['id']]
                    bridge.previous_sessions[row['id']] = {**row['source'], 'state': 'exited', 'exit_code': row['source'].get('exit_code'),
                                                          'output_start': 0, 'output_end': 0}
                    bridge.persist()
            except Exception:
                self._set(row, 'uncertain', 'maintenance_recovery_uncertain')
                return
        self._set(row, 'failed', 'maintenance_recovery_failed')

    def _run(self, guard):
        try:
            for row in self.plan['rows']:
                if row['state'] not in ('pending', 'failed'):
                    continue
                if self.bridge.closing:
                    break
                self._set(row, 'launching')
                try:
                    self._open(row)
                    self._set(row, 'restored')
                except Exception:
                    self._failed(row)
        finally:
            try:
                with self.lock:
                    self.running = False
                    self.plan['state'] = 'done' if all(row['state'] == 'restored' for row in self.plan['rows']) else 'partial'
                    save(self.bridge.state, self.plan)
            finally:
                guard.close()
