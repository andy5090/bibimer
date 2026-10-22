"""Opt-in Termux:X11/Firefox smoke test using a fresh profile and a local page.
Run from the repository root: python scripts/smoke_browser_native.py
Opens a temporary tagged X11 window. Never signs in or calls a real model.
Existing browser profiles and bridge processes are not used or restarted.
"""
import base64, contextlib, http.server, importlib.util, json, os
from pathlib import Path
import shutil, subprocess, sys, tempfile, threading, time, uuid
sys.path.insert(0,str(Path('bridge').resolve()))
import bibimer_bridge as m
received=[]
class Page(http.server.BaseHTTPRequestHandler):
 def log_message(self,*args):pass
 def do_GET(self):
  if self.path.startswith('/event?'):
   received.append(self.path); self.send_response(204); self.end_headers(); return
  self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8');self.end_headers()
  self.wfile.write('''<!doctype html><html><meta charset="utf-8"><title>Bibimer native browser test</title><style>body{font:24px sans-serif;padding:24px;background:#fafafa;color:#111}input,button{font:inherit;padding:12px;margin:12px}main{height:1800px}</style><h1>Bibimer browser test</h1><p>Local test page · no account</p><input id="text" autofocus placeholder="한글 입력 확인"><button id="send" onclick="fetch('/event?text='+encodeURIComponent(document.querySelector('#text').value));this.textContent='Passed'">Submit test</button><input type="file"><main></main></html>'''.encode())
page=http.server.ThreadingHTTPServer(('127.0.0.1',0),Page)
threading.Thread(target=page.serve_forever,daemon=True).start()
result={}
folder=Path(tempfile.mkdtemp(prefix='bbr-native-'))
b=m.Bridge(folder/'state')
try:
 project=b.register(dict(path=str(folder/'project'),create=True))
 binary=folder/'bin';binary.mkdir()
 fake=binary/'codex';fake.write_text('#!'+sys.executable+'\n'+Path('bridge/tests/fake_codex.py').read_text());fake.chmod(0o700)
 os.environ['PATH']=str(binary)+os.pathsep+os.environ['PATH']
 launched=b.launch(dict(project_id=project['id'],agent='codex',mode='chat',new_session=True,request_id=str(uuid.uuid4())))
 agent=b.sessions[launched['id']]
 tool=lambda action,**data:b.browser_tools.handle(dict(capability=agent.browser_key,action=action,**data))
 # Use the normal session start path with only a harmless local page.
 row=b.browser(dict(action='start',project_id=project['id'],url='http://127.0.0.1:'+str(page.server_port),request_id=str(uuid.uuid4())))['session']
 window=b.sessions[row['id']]
 result['display']=window.browser_display
 result['manual_initial']=window.browser_manual
 for action in ['screenshot','key']:
  try:tool(action,key='Return');raise AssertionError('Manual guard bypassed')
  except ValueError as error:assert str(error)=='error_browser_manual'
 result['manual_guard']=True
 m.browser_tools.run(['am','start','--user','0','-n','com.termux.x11/com.termux.x11.MainActivity','-d',row['browser_tag']],m.browser_tools.environment())
 env=m.browser_tools.environment();env.update(DISPLAY=':'+str(window.browser_display),XAUTHORITY=str(window.browser_authority))
 deadline=time.monotonic()+20
 while True:
  try:
   ident=m.browser_tools.run(['xdotool','getactivewindow'],env).decode().strip()
   klass=m.browser_tools.run(['xdotool','getwindowclassname',ident],env).decode()
   if 'firefox' in klass.lower():break
  except ValueError:pass
  if time.monotonic()>deadline:raise RuntimeError('Firefox window not ready')
  time.sleep(.4)
 time.sleep(2)
 b.browser(dict(action='allow',project_id=project['id'],session_id=row['id']))
 tool('type',text='비비머 Firefox 입력 성공')
 time.sleep(.5)
 # The local test page has a fixed layout; click the submit button in the captured display.
 tool('click',x=500,y=355)
 result['native_click']=True
 deadline=time.monotonic()+5
 while not received and time.monotonic()<deadline:time.sleep(.1)
 from urllib.parse import unquote
 assert any('비비머 Firefox 입력 성공' in unquote(value) for value in received), 'Unicode input did not reach the local page'
 result['unicode_input']=True
 shot=tool('screenshot');target=Path('dist/screenshots/browser-native-local.png');target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(shot['path'],target)
 result['native_screenshot']=target.stat().st_size>1000
 tool('scroll',steps=3);tool('scroll',steps=-3)
 # The file chooser stays active; Escape must act on the modal, not its parent.
 tool('key',key='Tab');tool('key',key='Return');time.sleep(.8)
 modal=m.browser_tools.run(['xdotool','getactivewindow'],env).decode().strip()
 result['file_chooser_opened']=modal!=ident
 assert result['file_chooser_opened']
 tool('key',key='Escape');time.sleep(.5)
 result['file_chooser_dismissed']=m.browser_tools.run(['xdotool','getactivewindow'],env).decode().strip()==ident
 assert result['file_chooser_dismissed']
 tool('click',x=30,y=30)
 tool('release')
 b.browser(dict(action='manual',project_id=project['id'],session_id=row['id']))
 assert not list(b.browser_tools.screens.glob('*.png'))
 result['manual_return_clears_capture']=True
 result['passed']=True
finally:
 for session in list(b.sessions.values()):
  session.stop()
  with contextlib.suppress(subprocess.TimeoutExpired):session.process.wait(timeout=5)
 if b.browser_tools:b.browser_tools.close()
 b.linked_files.close();b.github.close();b.worktree_creation.close()
 page.shutdown();page.server_close()
 shutil.rmtree(folder,ignore_errors=True)
 Path('.tools/browser-native-result.json').write_text(json.dumps(result,indent=2))
 print(json.dumps(result))
