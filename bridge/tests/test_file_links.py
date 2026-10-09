import base64
import json
import os
import subprocess
import time
from unittest import mock
from urllib.parse import quote

from test_bridge import BridgeTestCase, module


class LinkedFileTests(BridgeTestCase):
    def setUp(self):
        super().setUp()
        self.workspace = self.register()
        self.project_id = self.bridge.project['id']

    def tearDown(self):
        self.bridge.linked_files.close()
        super().tearDown()

    def files(self, action, **data):
        return self.api('POST', '/v1/files', {'action':action, **data})

    def prepare(self, path, **extra):
        return self.files('prepare', project_id=self.project_id, path=str(path), **extra)

    def test_chunk_roundtrip_and_no_persisted_content(self):
        content = b'\x89PNG\r\n\x1a\n' + os.urandom(600000)
        target = self.workspace / '한글 image.png'
        target.write_bytes(content)
        for link in [target, quote(str(target)), target.as_uri(), '한글 image.png', './한글 image.png:12:4', quote(target.name)+'#L12-L20']:
            status, info = self.prepare(link)
            self.assertEqual(200, status, info)
            self.assertEqual(('image/png', len(content)), (info['mime'], info['size']))
            received = b''
            while True:
                status, block = self.files('read', id=info['id'], offset=len(received))
                self.assertEqual(200, status, block)
                received += base64.b64decode(block['data'])
                if block['done']: break
            self.assertEqual(content, received)
            self.assertEqual(200, self.files('release', id=info['id'])[0])
            self.assertEqual(410, self.files('read', id=info['id'], offset=0)[0])
        self.assertFalse(self.bridge.linked_files.handles)
        self.assertFalse(self.bridge.sessions)
        self.assertNotIn('한글 image', json.dumps(self.bridge.health()))

    def test_empty_file_root_filename_line_and_pdf_sniff(self):
        (self.workspace / 'README.md').write_text('')
        status, info = self.prepare('README.md:12')
        self.assertEqual(200, status, info)
        self.assertEqual({'data':'','offset':0,'next':0,'done':True}, self.files('read', id=info['id'], offset=0)[1])
        (self.workspace / 'document').write_bytes(b'%PDF-1.7\n')
        self.assertEqual('application/pdf', self.prepare('document')[1]['mime'])

    def test_download_alias_and_outside_scope(self):
        downloads = self.root / 'Download'; downloads.mkdir()
        (downloads / 'preview.png').write_bytes(b'\x89PNG\r\n\x1a\n')
        alias = self.root / 'downloads-link'; alias.symlink_to(downloads)
        with mock.patch.object(module.LinkedFiles, 'downloads', return_value=[alias]):
            for path in [downloads/'preview.png', alias/'preview.png']:
                self.assertEqual(200, self.prepare(path)[0])
            other = self.root/'private.txt'; other.write_text('private')
            self.assertEqual(403, self.prepare(other)[0])
            self.assertEqual(403, self.prepare('../private.txt')[0])
            (downloads / 'escape').symlink_to(other)
            self.assertEqual(400, self.prepare(downloads/'escape')[0])

    def test_auth_and_invalid_links(self):
        self.assertEqual(401, self.api('POST','/v1/files',{'action':'prepare'},auth=False)[0])
        self.assertEqual(403, self.api('POST','/v1/files',{},headers={'Origin':'https://evil.invalid'})[0])
        self.assertIn('file_links', self.bridge.health()['features'])
        for value in ['',None,[],{},'https://example.com/a','file://remote/tmp/a','file://[x/a','file:///a?x=1','//remote/a','javascript:alert(1)','a\x00.txt','a%00.txt']:
            status, data = self.prepare(value) if isinstance(value,str) else self.files('prepare',project_id=self.project_id,path=value)
            self.assertEqual(400,status,(value,data))

    def test_no_symlinks_git_state_directories_or_special_files(self):
        target=self.workspace/'plain'; target.write_text('hello')
        (self.workspace/'link').symlink_to(target)
        (self.workspace/'dir').mkdir()
        (self.workspace/'alias').symlink_to(self.workspace/'dir')
        (self.workspace/'dir'/'file').write_text('hello')
        (self.workspace/'.git').mkdir()
        (self.workspace/'.git'/'config').write_text('private')
        os.mkfifo(self.workspace/'fifo')
        for path in ['link','dir','alias/file','fifo','missing']:
            self.assertEqual(400,self.prepare(path)[0],path)
        self.assertEqual(403,self.prepare('.git/config')[0])
        with mock.patch.object(module.LinkedFiles, 'downloads', return_value=[self.root]):
            self.assertEqual(403,self.prepare(self.state/'token')[0])

    def test_large_changed_expired_busy_and_invalid_offset(self):
        path=self.workspace/'data'; path.write_bytes(b'123')
        with mock.patch.object(module.LinkedFiles,'LIMIT',2):
            self.assertEqual(413,self.prepare(path)[0])
        info=self.prepare(path)[1]
        for offset in [-1,4,True,'0',None]:
            self.assertEqual(400,self.files('read',id=info['id'],offset=offset)[0])
        path.write_bytes(b'changed')
        self.assertEqual((409,'error_file_changed'), (self.files('read',id=info['id'],offset=0)[0],self.files('read',id=info['id'],offset=0)[1]['code']))
        self.bridge.linked_files.handles[info['id']]['expires']=time.monotonic()-1
        self.assertEqual(410,self.files('read',id=info['id'],offset=0)[0])
        for _ in range(8): self.assertEqual(200,self.prepare(path)[0])
        self.assertEqual(429,self.prepare(path)[0])
        self.bridge.linked_files.close()
        self.assertFalse(self.bridge.linked_files.handles)

    def test_worktree_scope_and_keeps_selection(self):
        def git(*args): subprocess.run(['git','-C',str(self.workspace),*args],check=True,capture_output=True)
        git('init','-b','main')
        (self.workspace/'text.txt').write_text('primary')
        git('add','.')
        git('-c','user.name=Test','-c','user.email=test@example.invalid','commit','-m','fixture')
        worktree=self.root/'worktree'; git('worktree','add','-b','branch',str(worktree))
        (worktree/'text.txt').write_text('worktree')
        status,info=self.prepare('text.txt',worktree_path=str(worktree))
        self.assertEqual(200,status,info)
        self.assertEqual(b'worktree',base64.b64decode(self.files('read',id=info['id'],offset=0)[1]['data']))
        self.assertEqual(self.project_id,self.bridge.active_project_id)
        self.assertFalse(self.bridge.sessions)
        self.assertEqual(200,self.prepare(self.workspace/'text.txt',worktree_path=str(worktree))[0])
        self.assertEqual(400,self.prepare('text.txt',worktree_path=str(self.root))[0])
