/* Real temporary bridge, owned sessions and bundled update; never touches the installed bridge. */
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http');
const {spawn,execFile,execFileSync}=require('node:child_process'),assert=require('node:assert/strict');
if(process.platform==='android')Object.defineProperty(process,'platform',{value:'linux'});
const {chromium}=require('../.tools/ui/node_modules/playwright-core');
const root=path.resolve(__dirname,'..'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'bibimer-maintenance-ui-'));
const state=path.join(tmp,'state'),installed=path.join(tmp,'installed'),projectPath=path.join(tmp,'Mobile project'),otherPath=path.join(tmp,'Other project');
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const reopen=process.argv.includes('--reopen'),modern=reopen || process.argv.includes('--unchecked');
let assets,bridge,browser,call;
async function main(){
  for(const folder of [installed,projectPath,otherPath,path.join(tmp,'bin')])fs.mkdirSync(folder);
  const python=execFileSync('which',['python'],{encoding:'utf8'}).trim();
  const storeByDirectory='import os,hashlib\nos.environ["BIBIMER_TEST_CODEX_STORE"] += "."+hashlib.sha256(os.getcwd().encode()).hexdigest()[:12]\n';
  fs.writeFileSync(path.join(tmp,'bin/codex'),'#!'+python+'\n'+storeByDirectory+fs.readFileSync(path.join(root,'bridge/tests/fake_codex.py'),'utf8').replace('thread, turn, pending = "test-thread", None, None','thread, turn, pending = "test-thread-"+hashlib.sha256(os.getcwd().encode()).hexdigest()[:12], None, None'),{mode:0o700});
  const env={...process.env,PATH:path.join(tmp,'bin')+':'+process.env.PATH,BIBIMER_TEST_CODEX_STORE:path.join(tmp,'native-history.json')};
  const source=fs.readFileSync(path.join(root,'bridge/bibimer_bridge.py'),'utf8');
  const bundledVersion=source.match(/^VERSION = "([\d.]+)"/m)[1];
  for(const file of ['browser_tools.py','maintenance_recovery.py'])fs.copyFileSync(path.join(root,'bridge',file),path.join(installed,file));
  fs.writeFileSync(path.join(installed,'bibimer_bridge.py'),source.replace(/VERSION = "[\d.]+"/,'VERSION = "0.15.0"'));
  const git=(...args)=>execFileSync('git',['-C',projectPath,...args],{stdio:'pipe'});
  git('init','-b','main');git('-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','--allow-empty','-m','fixture');
  const worktree=path.join(tmp,'Task worktree');git('worktree','add','-b','task',worktree);
  const probe=http.createServer();await new Promise(resolve=>probe.listen(0,'127.0.0.1',resolve));const port=probe.address().port;await new Promise(resolve=>probe.close(resolve));
  bridge=spawn(python,[path.join(installed,'bibimer_bridge.py'),'serve','--state-dir',state,'--port',String(port)],{stdio:'ignore',env});
  for(let i=0;i<100&&!fs.existsSync(path.join(state,'token.json'));i++)await delay(50);
  const token=JSON.parse(fs.readFileSync(path.join(state,'token.json'))),tokenBefore=fs.readFileSync(path.join(state,'token.json'),'utf8');
  call=async(method,endpoint,body={})=>{const response=await fetch('http://127.0.0.1:'+port+endpoint,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(method==='POST'?{body:JSON.stringify(body)}:{})});const result=await response.json();assert.equal(response.ok,true,result.code);return result;};
  const project=(await call('POST','/v1/project',{path:projectPath,add:true})).project;
  const other=(await call('POST','/v1/project',{path:otherPath,add:true})).project;
  const launch=async(agent,p=project,worktree_path)=>{return (await call('POST','/v1/sessions',{project_id:p.id,agent,mode:agent==='codex'?'chat':'terminal',worktree_path,new_session:true,request_id:crypto.randomUUID()})).session;};
  const until=async(check)=>{for(let i=0;i<200;i++){if(await check())return;await delay(50);}throw Error('Fixture timed out');};
  const event=async id=>call('GET','/v1/sessions/'+id+'/events?cursor=0&wait=0');
  const first=await launch('codex');await until(async()=>(await event(first.id)).session.ready);
  await call('POST','/v1/sessions/'+first.id+'/message',{text:'Saved context survives maintenance',request_id:crypto.randomUUID()});
  await until(async()=>(await event(first.id)).session.turn_state==='ready');
  await call('POST','/v1/sessions/'+first.id+'/manage',{action:'rename',title:'Saved mobile chat'});
  const pending=await launch('codex',other);await until(async()=>(await event(pending.id)).session.ready);
  await call('POST','/v1/sessions/'+pending.id+'/message',{text:'approval',request_id:crypto.randomUUID()});
  await until(async()=>(await event(pending.id)).session.turn_state==='waiting');
  await call('POST','/v1/sessions/'+pending.id+'/queue',{action:'add',text:'Queued fixture message',request_id:crypto.randomUUID()});
  const terminal=await launch('shell',project,worktree);
  await call('POST','/v1/sessions/'+terminal.id+'/manage',{action:'archive'});
  await call('POST','/v1/project-session',{project_id:project.id,session_id:first.id});
  const before=await call('GET','/v1/health');assert.equal(before.active_sessions,3);
  const payload=path.join(tmp,'payload.json');
  execFileSync(python,['-c',"import base64,hashlib,json,pathlib,sys,zlib;p=pathlib.Path(sys.argv[1]);files=['bibimer_bridge.py','provider_opencode.py','provider_claude.mjs','repair_claude_termux.py','browser_tools.py','maintenance_recovery.py'];pathlib.Path(sys.argv[2]).write_text(json.dumps({n:{'data':base64.b64encode(zlib.compress((p/n).read_bytes())).decode(),'sha256':hashlib.sha256((p/n).read_bytes()).hexdigest()} for n in files}))",path.join(root,'bridge'),payload]);
  assets=http.createServer((req,res)=>{try{const file=req.url==='/'?'index.html':req.url.slice(1);if(file.includes('..'))throw Error();res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(path.join(root,'android/app/src/main/assets',file)));}catch{res.writeHead(404).end();}});
  await new Promise(resolve=>assets.listen(0,'127.0.0.1',resolve));
  browser=await chromium.launch({executablePath:path.join(process.env.PREFIX,'bin/headless_shell'),headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  const page=await browser.newPage({viewport:{width:393,height:780},isMobile:true,hasTouch:true});page.setDefaultTimeout(15000);
  const errors=[],nativeActions=[],stopped=[];page.on('pageerror',error=>errors.push(error.message));
  await page.exposeFunction('nativeRequest',async(id,method,endpoint,body)=>{
    try{const data=await call(method,endpoint.replace('wait=20','wait=1'),JSON.parse(body));if(method==='POST'&&endpoint.endsWith('/stop'))stopped.push(endpoint.split('/')[3]);await page.evaluate(({id,data})=>window.BibimerNativeReply(id,{ok:true,status:200,data}),{id,data});}
    catch{try{await page.evaluate(id=>window.BibimerNativeReply(id,{ok:false,status:503,data:{code:'error_connection_failed'}}),id);}catch{}}
  });
  await page.exposeFunction('nativeMaintain',async(action,recovery=null)=>{
    nativeActions.push(action);assert.equal((await call('GET','/v1/health')).active_sessions,0);
    const code="import json,pathlib,sys;sys.path.insert(0,sys.argv[1]);import maintain_bridge as m;print(m.maintain(sys.argv[2],json.loads(pathlib.Path(sys.argv[3]).read_text()),pathlib.Path(sys.argv[4]),pathlib.Path(sys.argv[5]),int(sys.argv[6]),recovery=json.loads(sys.argv[7])))";
    await new Promise((resolve,reject)=>execFile(python,['-c',code,path.join(root,'bridge'),action,payload,state,installed,String(port),JSON.stringify(recovery)],{env},(error,stdout)=>error?reject(error):stdout.trim()==='bridge_maintenance_done'?resolve():reject(Error('Unexpected maintenance result'))));
    await page.evaluate(()=>window.phase='bridge_maintenance_done');
  });
  await page.addInitScript(({bundledVersion,modern})=>{window.phase='';window.Bibimer={environment:()=>JSON.stringify({paired:true,language:'en',version:'test',bundledBridgeVersion:bundledVersion}),
    bridgeMaintenanceStatus:()=>window.phase,maintainBridge:action=>{window.phase='bridge_maintenance_running';void window.nativeMaintain(action);},request:(...args)=>window.nativeRequest(...args),cancelPoll:()=>{},setEnterBehavior:()=>true,setAgentOptions:()=>true,setBackHandling:()=>{}};if(modern)window.Bibimer.maintainBridgeWithRecovery=(action,request)=>{window.phase='bridge_maintenance_running';void window.nativeMaintain(action,JSON.parse(request));};},{bundledVersion,modern});
  await page.goto('http://127.0.0.1:'+assets.address().port);await page.waitForFunction(()=>document.querySelector('#connection').textContent==='Connected');
  await page.locator('#input').fill('Keep this draft');await page.locator('#tab-settings').click();
  await page.locator('#bridge-update-install').click();await page.waitForFunction(()=>!document.querySelector('#bridge-maintenance-confirm').disabled);
  assert.equal(await page.locator('#bridge-maintenance-sessions li').count(),3);
  assert.equal(await page.locator('#bridge-maintenance-reopen-option').isVisible(),modern);
  if(modern)assert.equal(await page.locator('#bridge-maintenance-reopen').isChecked(),true);
  assert.match(await page.locator('#bridge-maintenance-sessions').textContent(),/Other project/);
  assert.match(await page.locator('#bridge-maintenance-sessions').textContent(),/Task worktree/);
  await page.locator('#bridge-maintenance-cancel').click();assert.equal((await call('GET','/v1/health')).active_sessions,3);assert.deepEqual(stopped,[]);assert.deepEqual(nativeActions,[]);
  await page.locator('#bridge-update-install').click();await page.waitForFunction(()=>!document.querySelector('#bridge-maintenance-confirm').disabled);if(modern && !reopen)await page.locator('#bridge-maintenance-reopen').uncheck();await page.locator('#bridge-maintenance-confirm').click();
  await page.waitForFunction(()=>window.phase==='bridge_maintenance_done');
  await page.waitForFunction(version=>document.querySelector('#bridge-update-version').textContent.includes('Connected: '+version),bundledVersion);
  if(reopen)await until(async()=>['done','partial'].includes((await call('GET','/v1/health')).maintenance_recovery?.state));
  const after=await call('GET','/v1/health');assert.equal(after.active_sessions,reopen?3:0,JSON.stringify(after.maintenance_recovery));assert.notEqual(before.instance,after.instance);
  assert.deepEqual(new Set(stopped),new Set([first.id,pending.id,terminal.id]));assert.deepEqual(nativeActions,['update']);
  const saved=after.projects.flatMap(p=>p.sessions);assert.equal(saved.length,3);assert.equal(saved.find(row=>row.id===first.id).title,'Saved mobile chat');
  assert.equal(saved.find(row=>row.id===terminal.id).archived,true);assert.equal(saved.find(row=>row.id===terminal.id).project.path,worktree);
  assert.ok(saved.every(row=>row.state===(reopen?'running':'exited')));assert.equal(fs.readFileSync(path.join(state,'token.json'),'utf8'),tokenBefore);
  assert.equal(fs.readFileSync(path.join(installed,'bibimer_bridge.py'),'utf8'),source);
  await page.locator('#tab-work').click();assert.equal(await page.locator('#input').inputValue(),'Keep this draft');
  if(reopen){
    assert.equal(after.maintenance_recovery.restored,3);
    assert.equal(after.session.id,first.id,'selection survives reopening');
    const restored=await event(first.id),approval=await event(pending.id);
    assert.ok(restored.items.some(item=>item.text==='Saved context survives maintenance'));
    assert.equal(restored.session.ready,true);assert.equal(approval.session.ready,true);
    assert.equal(approval.requests.length,0);assert.equal(approval.session.queued_count,0);
    assert.equal(fs.readFileSync(path.join(projectPath,'turn-count'),'utf8'),'1');
    assert.equal(fs.readFileSync(path.join(otherPath,'turn-count'),'utf8'),'1');
    assert.equal(fs.existsSync(path.join(otherPath,'approved')),false);
    await page.locator('#tab-settings').click();
    await page.waitForFunction(()=>document.querySelector('#bridge-recovery-status').textContent.includes('3/3'));
  }else{
    const resumed=(await call('POST','/v1/sessions',{project_id:project.id,agent:'codex',mode:'chat',source_thread_id:saved.find(row=>row.id===first.id).external_thread_id,import_mode:'resume',new_session:true,request_id:crypto.randomUUID()})).session;
    await until(async()=>(await event(resumed.id)).session.ready);
    assert.ok((await event(resumed.id)).items.some(item=>item.text==='Saved context survives maintenance'));
    await call('POST','/v1/sessions/'+resumed.id+'/stop');await until(async()=>(await event(resumed.id)).session.state==='exited');
  }
  assert.deepEqual(errors,[]);console.log('PASS ('+(reopen?'automatic reopen':'legacy no reopen')+'): real idle Chat, pending approval/queue in another project and archived worktree terminal are reviewed; cancel keeps processes; explicit end waits before bundled update; reconnect, drafts, metadata, token and native resume survive');
}
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{
  if(browser)await browser.close();if(call){try{
    for(const row of (await call('GET','/v1/health')).projects.flatMap(p=>p.sessions))if(['running','stopping'].includes(row.state))await call('POST','/v1/sessions/'+row.id+'/stop');
    for(let i=0;i<60&&(await call('GET','/v1/health')).active_sessions;i++)await delay(100);
    await call('POST','/v1/shutdown');
  }catch{}}
  if(bridge&&bridge.exitCode===null)bridge.kill('SIGTERM');if(assets)await new Promise(resolve=>assets.close(resolve));await delay(500);fs.rmSync(tmp,{recursive:true,force:true});
});
