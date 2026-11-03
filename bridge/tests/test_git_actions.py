import subprocess
import time
import uuid
from pathlib import Path
from unittest.mock import patch
from test_bridge import BridgeTestCase, module


class GitActionsTests(BridgeTestCase):
    def setUp(self):
        super().setUp()
        self.path = self.register()
        self.project = self.bridge.project['id']
        self.git('init', '-b', 'main')
        self.git('config', 'user.name', 'Fixture')
        self.git('config', 'user.email', 'fixture@example.invalid')
        (self.path / 'file').write_text('original')
        self.git('add', '.')
        self.git('commit', '-m', 'initial')

    def git(self, *args, cwd=None):
        return subprocess.check_output(['git', '-C', str(cwd or self.path), *args], stderr=subprocess.DEVNULL)

    def api_git(self, action, **data):
        return self.api('POST', '/v1/git', {'project_id':self.project, 'action':action, **data})

    def prepare(self, action, **data):
        state = self.api_git('state', **({'worktree_path':data['worktree_path']} if 'worktree_path' in data else {}))[1]
        return {'project_id':self.project, 'action':action, 'request_id':str(uuid.uuid4()),
                'expected_head':state['head'], 'expected_branch':state['branch'], **data}

    def wait(self, body):
        for _ in range(300):
            status, job = self.api_git('job', request_id=body['request_id'], **({'worktree_path':body['worktree_path']} if 'worktree_path' in body else {}))
            self.assertEqual(200, status)
            if job['state'] != 'running': return job
            time.sleep(.02)
        self.fail('Git job did not finish')

    def perform(self, action, **data):
        body = self.prepare(action, **data)
        status, _ = self.api('POST', '/v1/git', body)
        self.assertEqual(200, status)
        return self.wait(body)

    def remote(self):
        remote = self.root / 'remote.git'
        self.git('init', '--bare', str(remote))
        self.git('remote', 'add', 'origin', str(remote))
        self.git('push', '-u', 'origin', 'main')
        return remote

    def test_scoping_authentication_and_validation(self):
        self.assertEqual(401, self.api('POST', '/v1/git', {}, auth=False)[0])
        self.assertIn('git_actions', self.bridge.health()['features'])
        self.assertEqual(400, self.api_git('reset', request_id=str(uuid.uuid4()))[0])
        self.assertEqual(400, self.api_git('state', worktree_path=str(self.root))[0])
        self.assertEqual(404, self.api_git('job', request_id=str(uuid.uuid4()))[0])
        body = self.prepare('commit', message='message', all_changes='true')
        self.assertEqual(400, self.api('POST', '/v1/git', body)[0])
        nested = self.path / 'nested'; nested.mkdir()
        with self.assertRaises(module.Problem) as error:
            self.bridge.git_actions.snapshot({'path':str(nested)})
        self.assertEqual('git_root', error.exception.code)

    def test_staged_only_all_changes_idempotency_and_branch_guard(self):
        (self.path / 'file').write_text('staged')
        self.git('add', 'file')
        (self.path / 'new').write_text('new')
        body = self.prepare('commit', message='한글 staged')
        self.assertEqual(200, self.api('POST', '/v1/git', body)[0])
        self.assertEqual('succeeded', self.wait(body)['state'])
        self.assertIn(b'?? new', self.git('status', '--porcelain'))
        head = self.git('rev-parse', 'HEAD')
        self.assertEqual(200, self.api('POST', '/v1/git', body)[0])
        self.assertEqual(head, self.git('rev-parse', 'HEAD'))
        self.assertEqual(409, self.api('POST', '/v1/git', {**body, 'message':'different'})[0])
        self.assertEqual('succeeded', self.perform('commit', message='all files', all_changes=True)['state'])
        self.assertFalse(self.git('status', '--porcelain'))
        self.assertEqual('git_no_staged', self.perform('commit', message='nothing')['error'])
        stale = self.prepare('push'); self.git('switch', '-c', 'other')
        self.assertEqual(409, self.api('POST', '/v1/git', stale)[0])

    def test_first_commit_and_worktree_scope(self):
        empty = self.root / 'empty'; empty.mkdir()
        self.git('init', '-b', 'main', cwd=empty)
        self.git('config', 'user.name', 'Fixture', cwd=empty)
        self.git('config', 'user.email', 'fixture@example.invalid', cwd=empty)
        state = self.bridge.git_actions.snapshot({'path':str(empty)})
        self.assertEqual('', state['head'])
        self.assertFalse(state['staged'])
        tree = self.root / 'tree'
        self.git('worktree', 'add', '-b', 'tree', str(tree))
        (tree / 'only-tree').write_text('tree')
        job = self.perform('commit', worktree_path=str(tree), message='tree only', all_changes=True)
        self.assertEqual('succeeded', job['state'])
        self.assertFalse((self.path / 'only-tree').exists())
        self.assertEqual(b'initial\n', self.git('log', '-1', '--format=%s'))

    def test_real_push_pull_sync_and_failure_does_not_push(self):
        remote = self.remote()
        other = self.root / 'other'
        self.git('clone', '-b', 'main', str(remote), str(other))
        self.git('config', 'user.name', 'Other', cwd=other)
        self.git('config', 'user.email', 'other@example.invalid', cwd=other)
        (other / 'incoming').write_text('incoming')
        self.git('add', '.', cwd=other); self.git('commit', '-m', 'incoming', cwd=other)
        self.git('push', cwd=other)
        self.assertEqual('succeeded', self.perform('pull')['state'])
        self.assertTrue((self.path / 'incoming').exists())
        (self.path / 'outgoing').write_text('outgoing')
        self.perform('commit', message='outgoing', all_changes=True)
        self.assertEqual('succeeded', self.perform('push')['state'])
        self.assertEqual('succeeded', self.perform('sync')['state'])
        (self.path / 'file').write_text('dirty')
        self.assertEqual('git_dirty', self.perform('sync')['error'])
        self.git('restore', 'file')
        # Diverge both branches: ff-only must fail and never push/rebase/stash.
        self.git('pull', '--ff-only', cwd=other)
        (other / 'diverge').write_text('remote')
        self.git('add', '.', cwd=other); self.git('commit', '-m', 'remote', cwd=other)
        self.git('push', cwd=other)
        (self.path / 'diverge').write_text('local')
        self.perform('commit', message='local', all_changes=True)
        before_local = self.git('rev-parse', 'HEAD')
        before_remote = self.git('rev-parse', 'refs/heads/main', cwd=remote)
        job = self.perform('sync')
        self.assertEqual('failed', job['state']); self.assertEqual('pull', job['phase'])
        self.assertEqual(before_local, self.git('rev-parse', 'HEAD'))
        self.assertEqual(before_remote, self.git('rev-parse', 'refs/heads/main', cwd=remote))
        self.git('config', 'remote.origin.push', '+refs/heads/main:refs/heads/main')
        self.assertEqual('failed', self.perform('push')['state'])
        self.assertEqual(before_remote, self.git('rev-parse', 'refs/heads/main', cwd=remote))
        self.git('config', 'remote.origin.mirror', 'true')
        self.assertEqual('git_upstream', self.perform('push')['error'])

    def test_upstream_conflict_and_shared_repo_serialization(self):
        self.assertEqual('git_upstream', self.perform('push')['error'])
        (self.path / '.git/MERGE_HEAD').write_text(self.git('rev-parse', 'HEAD').decode())
        self.assertEqual('git_conflict', self.perform('commit', message='blocked')['error'])
        (self.path / '.git/MERGE_HEAD').unlink()
        body = self.prepare('commit', message='blocked')
        def stalled(*args): time.sleep(.3)
        with patch.object(self.bridge.git_actions, 'worker', side_effect=stalled):
            self.assertEqual(200, self.api('POST', '/v1/git', body)[0])
            self.assertEqual(409, self.api('POST', '/v1/git', {**body,'request_id':str(uuid.uuid4())})[0])
            with self.assertRaises(module.Problem): self.bridge.begin_shutdown()
        self.bridge.git_actions.busy.clear()

    def test_timeout_kills_process_and_no_raw_output_in_job(self):
        with self.assertRaises(module.Problem) as error:
            module.GitActions.run(self.path, ['-c', 'alias.slow=!sleep 5', 'slow'], timeout=.05)
        self.assertEqual('git_timeout', error.exception.code)
        self.git('config', 'user.name', '')
        (self.path / 'file').write_text('next')
        job = self.perform('commit', message='private message', all_changes=True)
        self.assertEqual('failed', job['state'])
        self.assertNotIn('private message', str(job))
        self.assertNotIn('message', job)
