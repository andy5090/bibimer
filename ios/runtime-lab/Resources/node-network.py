"""Guest Node HTTP/fetch diagnostics; no credentials or provider calls."""
from http.server import BaseHTTPRequestHandler, HTTPServer
import os
import subprocess
import sys
import threading


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def do_GET(self):
        body = b'bibimer-node-network'
        self.send_response(200)
        self.send_header('Content-Type', 'text/plain')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)


server = HTTPServer(('127.0.0.1', 0), Handler)
threading.Thread(target=server.serve_forever, daemon=True).start()
url = f'http://127.0.0.1:{server.server_port}/probe'
scripts = {
    'http': '''const http=require('http');http.get(process.argv[1],r=>{let b='';r.on('data',c=>b+=c);r.on('end',()=>{console.log('HTTP',r.statusCode,b);process.exit(r.statusCode===200&&b==='bibimer-node-network'?0:1)})}).on('error',e=>{console.error(e);process.exit(1)})''',
    'fetch': '''fetch(process.argv[1],{signal:AbortSignal.timeout(12000)}).then(async r=>{const b=await r.text();console.log('FETCH',r.status,b);process.exit(r.status===200&&b==='bibimer-node-network'?0:1)}).catch(e=>{console.error(e,e.cause);process.exit(1)})''',
}
failed = []
native_wasm = len(sys.argv) > 1 and sys.argv[1] == 'wasm'
node = ['node']
env = {**os.environ, 'NODE_DEBUG': 'net'}
if native_wasm:
    # Keep JavaScript on Ignition while allowing V8's genuine WebAssembly
    # compiler to emit guest ARM64 code, still interpreted by our Linux engine.
    # This is an experiment, not a host JIT entitlement or a fake WASM module.
    node += ['--no-opt', '--no-sparkplug', '--single-threaded', '--no-wasm-tier-up',
             '--liftoff-only', '--no-lazy', '--max-old-space-size=512']
    env['ISH_NODE_NO_ARG_INJECTION'] = '1'
    print('NODE_WASM_PROFILE', node, flush=True)
    scripts = {'wasm': '''const b=new Uint8Array([0,97,115,109,1,0,0,0,1,7,1,96,2,127,127,1,127,3,2,1,0,7,7,1,3,97,100,100,0,0,10,9,1,7,0,32,0,32,1,106,11]);WebAssembly.instantiate(b).then(({instance})=>{const v=instance.exports.add(19,23);console.log('NATIVE_WASM_ADD',v);process.exit(v===42?0:1)}).catch(e=>{console.error(e);process.exit(1)})''', **scripts}
try:
    for name, script in scripts.items():
        print('NODE_NETWORK_START', name, url, flush=True)
        try:
            result = subprocess.run([*node, '-e', script, url], env=env, timeout=45 if native_wasm else 20)
            if result.returncode:
                failed.append(name)
        except subprocess.TimeoutExpired:
            print('NODE_NETWORK_TIMEOUT', name, flush=True)
            failed.append(name)
    if failed:
        raise RuntimeError('Node guest loopback network failed: ' + repr(failed))
    if native_wasm:
        cli = '/root/bibimer-probe/gemini/node_modules/.bin/gemini'
        print('GEMINI_NATIVE_WASM_VERSION_START', flush=True)
        result = subprocess.run([*node, cli, '--version'], env=env, timeout=180)
        if result.returncode:
            raise RuntimeError('Gemini native WASM profile failed')
finally:
    server.shutdown()
    server.server_close()
