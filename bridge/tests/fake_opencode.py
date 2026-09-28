"""Controlled OpenCode HTTP/TUI fixture. No external process or model execution."""
import base64
import http.server
import json
import os
from pathlib import Path
import sys
import urllib.parse
import uuid

if '--version' in sys.argv:
    print('1.17.13'); raise SystemExit(0)
if 'serve' not in sys.argv:
    print('\x1b[32mOpenCode fixture terminal\x1b[0m', flush=True)
    for line in sys.stdin:
        print('OpenCode input: '+line.strip(),flush=True)
    raise SystemExit(0)

cwd = str(Path.cwd())
saved_id = 'ses_saved_example'
threads, messages, states, pending, questions = {}, {}, {}, {}, {}

def record(key, title='OpenCode saved session'):
    return {'id': key, 'directory': cwd if key!='ses_foreign' else cwd+'/other', 'title':title,
            'time': {'created':1,'updated':1790564400000}}

def historical(key):
    return [{'info':{'id':'msg_history_user','sessionID':key,'role':'user','time':{'created':1}},
             'parts':[{'id':'prt_user','type':'text','text':'Saved OpenCode prompt'}]},
            {'info':{'id':'msg_history_reply','sessionID':key,'parentID':'msg_history_user','role':'assistant','time':{'created':2,'completed':3}},
             'parts':[{'id':'prt_reply','type':'text','text':'## OpenCode history\n```python\nprint("restored")\n```'},
                      {'id':'prt_hidden','type':'reasoning','text':'RAW_THINKING_MUST_NOT_APPEAR'}]}]
threads[saved_id]=record(saved_id); messages[saved_id]=historical(saved_id)

def finish(key, status='completed'):
    states[key]={'type':'idle'}
    latest=messages[key][-1]
    latest['info']['time']['completed']=4
    latest['parts']=[{'id':'prt_answer','type':'text','text':'## OpenCode result\n**Ready** for follow-up'},
        {'id':'prt_bash','type':'tool','tool':'bash','state':{'status':'completed','input':{'command':'controlled command'},'output':'controlled output','metadata':{'exit':0}}},
        {'id':'prt_edit','type':'tool','tool':'edit','state':{'status':'completed','input':{'filePath':'example.py'},'output':'updated','metadata':{'diff':'-old\n+new'}}}]
    pending.pop(key,None); questions.pop(key,None)

class Handler(http.server.BaseHTTPRequestHandler):
    def log_message(self,*_): pass
    def run(self):
        expected='Basic '+base64.b64encode((os.environ['OPENCODE_SERVER_USERNAME']+':'+os.environ['OPENCODE_SERVER_PASSWORD']).encode()).decode()
        if self.headers.get('Authorization')!=expected: self.reply(401,{}); return
        url=urllib.parse.urlsplit(self.path); route=url.path; query=urllib.parse.parse_qs(url.query)
        assert query.get('directory')==[cwd]
        body=json.loads(self.rfile.read(int(self.headers.get('Content-Length',0))) or b'{}')
        method=self.command
        if route=='/session' and method=='GET': self.reply(200,list(threads.values())); return
        if route=='/session' and method=='POST':
            assert body=={}
            key='ses_new_'+uuid.uuid4().hex; threads[key]=record(key,'New session'); messages[key]=[]
            self.reply(200,threads[key]); return
        if route=='/session/status': self.reply(200,states); return
        if route=='/permission':
            self.reply(200,list(pending.values())+[{'id':'per_foreign','sessionID':'ses_elsewhere','permission':'bash','patterns':['unrelated'],'metadata':{},'always':[]}]); return
        if route=='/question': self.reply(200,list(questions.values())); return
        parts=route.strip('/').split('/')
        if len(parts)==2 and parts[0]=='session': self.reply(200,threads.get(parts[1],record(parts[1]))); return
        if len(parts)==3 and parts[0]=='session':
            _,key,action=parts
            if action=='fork':
                assert body=={}
                fork=key+'_fork'; threads[fork]=record(fork); messages[fork]=historical(fork)
                self.reply(200,threads[fork]); return
            if action=='message': self.reply(200,messages.get(key,historical(key))); return
            if action=='abort':
                if messages.get(key): finish(key)
                self.reply(200,True); return
            if action=='prompt_async':
                assert set(body)=={'messageID','parts'}
                assert body['parts'][0]['type']=='text'
                message=body['messageID']; text=body['parts'][0]['text']
                Path('opencode-turn-count').write_text(str(int(Path('opencode-turn-count').read_text())+1) if Path('opencode-turn-count').exists() else '1')
                messages.setdefault(key,[]).extend([
                    {'info':{'id':message,'role':'user','sessionID':key,'time':{'created':3}},'parts':[{'id':'prt_input','type':'text','text':text}]},
                    {'info':{'id':'msg_reply_'+uuid.uuid4().hex,'parentID':message,'role':'assistant','sessionID':key,'time':{'created':4}},'parts':[{'id':'prt_response','type':'text','text':'Streaming **OpenCode**'}]}])
                states[key]={'type':'busy'}
                if text=='approval': pending[key]={'id':'per_'+key,'sessionID':key,'permission':'bash','patterns':['controlled command'],'metadata':{'command':'controlled command'},'always':[]}
                elif text=='question': questions[key]={'id':'que_'+key,'sessionID':key,'questions':[{'question':'Which checks?','header':'Checks','multiple':True,'custom':True,'options':[{'label':'Unit','description':'Unit tests'},{'label':'UI','description':'UI checks'}]}]}
                elif text=='wait': pass
                else: finish(key)
                self.reply(204,None);return
        if len(parts)==3 and parts[0] in {'permission','question'}:
            kind,identity,action=parts
            key=identity[4:]
            if kind=='permission':
                assert body['reply'] in {'once','reject'}
                if body['reply']=='once': Path('opencode-approved').write_text('once')
            elif action=='reply':
                assert body['answers']==[['Unit','UI']]
                Path('opencode-answers').write_text('both')
            finish(key);self.reply(200,True);return
        self.reply(404,{})
    def reply(self,code,body):
        data=b'' if code==204 else json.dumps(body).encode()
        self.send_response(code);self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data)
    do_GET=run
    do_POST=run

server=http.server.ThreadingHTTPServer(('127.0.0.1',0),Handler)
print('opencode server listening on http://127.0.0.1:'+str(server.server_port),flush=True)
server.serve_forever()
