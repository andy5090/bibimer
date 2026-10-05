/* Cross-agent continuation with an isolated bridge and native provider fixtures. */
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http');
const {spawn,execFileSync}=require('node:child_process'),assert=require('node:assert/strict');
if(process.platform==='android')Object.defineProperty(process,'platform',{value:'linux'});
const {chromium}=require('../.tools/ui/node_modules/playwright-core');
const root=path.resolve(__dirname,'..'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'bibimer-handoff-'));
const state=path.join(tmp,'state'),projectPath=path.join(tmp,'Mobile studio');
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let assets,bridge,browser,dropHandoff=false,hideHandoff=false;
async function main(){
  fs.mkdirSync(projectPath);fs.mkdirSync(path.join(tmp,'bin'));
  const python=execFileSync('which',['python'],{encoding:'utf8'}).trim();
  fs.writeFileSync(path.join(tmp,'bin/codex'),'#!'+python+'\n'+fs.readFileSync(path.join(root,'bridge/tests/fake_codex.py'),'utf8'),{mode:0o700});
  fs.writeFileSync(path.join(tmp,'bin/opencode'),'#!'+python+'\n'+fs.readFileSync(path.join(root,'bridge/tests/fake_opencode.py'),'utf8'),{mode:0o700});
  fs.writeFileSync(path.join(tmp,'bin/claude'),'#!'+python+'\nprint("2.1.283")\n',{mode:0o700});
  assets=http.createServer((req,res)=>{const name=req.url==='/'?'index.html':req.url.slice(1);try{
    if(name.includes('..'))throw Error();
    res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.woff2')?'font/woff2':name.endsWith('.svg')?'image/svg+xml':'text/html');
    res.end(fs.readFileSync(path.join(root,'android/app/src/main/assets',name)));
  }catch{res.writeHead(404).end();}});
  await new Promise(resolve=>assets.listen(0,'127.0.0.1',resolve));
  const probe=http.createServer();await new Promise(resolve=>probe.listen(0,'127.0.0.1',resolve));const port=probe.address().port;await new Promise(resolve=>probe.close(resolve));
  bridge=spawn('python',[path.join(root,'bridge/bibimer_bridge.py'),'serve','--state-dir',state,'--port',String(port)],{stdio:'ignore',env:{...process.env,BIBIMER_CLAUDE_EXECUTABLE:path.join(tmp,'bin/claude'),BIBIMER_CLAUDE_SDK_PATH:path.join(root,'bridge/tests/fake_claude_sdk.mjs'),PATH:path.join(tmp,'bin')+':'+process.env.PATH}});
  for(let i=0;i<100&&!fs.existsSync(path.join(state,'token.json'));i++)await delay(50);
  const token=JSON.parse(fs.readFileSync(path.join(state,'token.json')));
  const call=async(method,endpoint,body)=>{const response=await fetch('http://127.0.0.1:'+port+endpoint,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(method==='POST'?{body:JSON.stringify(body||{})}:{})});return {ok:response.ok,status:response.status,data:await response.json()};};
  const project=(await call('POST','/v1/project',{path:projectPath,add:true})).data.project;
  browser=await chromium.launch({executablePath:path.join(process.env.PREFIX,'bin/headless_shell'),headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  const page=await browser.newPage({viewport:{width:393,height:780},isMobile:true,hasTouch:true});page.setDefaultTimeout(12000);
  const errors=[];page.on('pageerror',error=>{errors.push(error.message);console.error('Page error:',error.message);});
  const agentMutations=[];
  await page.exposeFunction('nativeRequest',async(id,method,endpoint,body)=>{
    if(method==='POST'&&endpoint.startsWith('/v1/sessions'))agentMutations.push(endpoint);
    const result=await call(method,endpoint.replace('wait=20','wait=1'),JSON.parse(body));
    if(hideHandoff&&endpoint==='/v1/health')result.data.features=result.data.features.filter(value=>value!=='agent_handoff');
    if(dropHandoff&&endpoint.endsWith('/handoff')&&JSON.parse(body).action==='start'&&result.ok){
      dropHandoff=false;result.ok=false;result.status=503;result.data={code:'error_connection_failed'};
    }
    try{await page.evaluate(({id,result})=>window.BibimerNativeReply(id,result),{id,result});}catch{}
  });
  await page.addInitScript(()=>{window.Bibimer={environment:()=>JSON.stringify({paired:true,termuxInstalled:true,language:localStorage.language||'en',version:'test',notifications:{enabled:localStorage.notifications!=='off',allowed:window.notificationAllowed!==false,state:'listening'}}),notificationsConnected:value=>window.notificationsSupported=value,setResponseNotifications:value=>{localStorage.notifications=value?'on':'off';window.BibimerNotificationStatus();},openNotificationSettings:()=>window.openedNotificationSettings=true,takeNotificationTarget:()=>{const target=window.notificationTarget||JSON.parse(localStorage.notificationTarget||'{}');window.notificationTarget=null;localStorage.removeItem('notificationTarget');return JSON.stringify(target);},request:(...args)=>window.nativeRequest(...args),cancelPoll:()=>{},setLanguage:value=>{localStorage.language=value;return true;},setAgentOptions:()=>true,setEnterBehavior:()=>true,setBackHandling:value=>window.backHandled=value,copyText:value=>window.copiedPath=value};});
  await page.goto('http://127.0.0.1:'+assets.address().port);
  await page.waitForFunction(()=>document.querySelector('#connection').textContent==='Connected');
  const choose=async(id,value)=>{await page.locator('#'+id+'-trigger').click();await page.locator('#select-options [data-value='+JSON.stringify(value)+']').click();};
  const sidebar=async()=>{if(!await page.locator('#sidebar').evaluate(node=>node.open))await page.locator('#sidebar-open').click();};
  const openGroup=async id=>{const group=page.locator('[data-project='+JSON.stringify(id)+']');if(!await group.evaluate(node=>node.open))await group.locator(':scope > summary').click();return group;};
  const select=async(id,p=project.id)=>{await sidebar();const group=await openGroup(p);const row=group.locator('[data-session='+JSON.stringify(id)+']');const tree=row.locator('xpath=ancestor::details[contains(@class,"sidebar-worktree")]');if(await tree.count()&&!await tree.evaluate(node=>node.open))await tree.locator(':scope > summary').click();await row.locator('.sidebar-session-open').click();await page.locator('#sidebar').waitFor({state:'hidden'});};
  const launch=async()=>{await page.locator('#launch').click();await page.waitForFunction(()=>document.querySelector('#turn-status').textContent==='Ready for your message');return (await call('GET','/v1/health')).data.session.id;};
  const firstAgent='codex';await choose('agent',firstAgent);const first=await launch();
  const input=page.locator('#input'), dialog=page.locator('#handoff-dialog');
  const sessionCount=async()=>(await call('GET','/v1/health')).data.projects.flatMap(p=>p.sessions).length;
  await input.fill('Original task: keep the project context'); await page.locator('#send').click();
  await page.waitForFunction(()=>document.querySelector('#turn-status').textContent==='Ready for your message');
  await input.fill('Keep this original draft');
  await choose('quick-agent','claude'); await dialog.waitFor();
  await page.waitForFunction(()=>document.querySelector('#handoff-context').value.includes('Original task'));
  assert.equal(await input.inputValue(),'Keep this original draft');
  assert.equal(await page.locator('#handoff-instruction').inputValue(),'Keep this original draft');
  assert.equal(await sessionCount(),1); assert.equal(fs.existsSync(path.join(projectPath,'claude-turn-count')),false);
  await page.locator('#handoff-context-details summary').click();
  fs.mkdirSync(path.join(root,'dist/screenshots'),{recursive:true});
  await page.screenshot({path:path.join(root,'dist/screenshots/handoff-393-en.png')});
  await page.locator('#handoff-existing').click(); await dialog.waitFor({state:'hidden'});
  await page.locator('#launch').waitFor({state:'visible'}); const existing=await launch();
  await input.fill('Unrelated Claude session');await page.locator('#send').click();
  await page.waitForFunction(()=>document.querySelector('#turn-status').textContent==='Ready for your message');
  await select(first);assert.equal(await input.inputValue(),'Keep this original draft');
  await choose('quick-agent','claude');await dialog.waitFor();
  await page.waitForFunction(()=>!document.querySelector('#handoff-send').disabled);
  await page.locator('#handoff-instruction').fill('Implement the next step');
  await page.locator('#handoff-send').click(); await dialog.waitFor({state:'hidden'});
  await page.waitForFunction(()=>document.querySelector('#turn-status').textContent==='Ready for your message' && !document.querySelector('#handoff-source').hidden);
  const transferred=(await call('GET','/v1/health')).data.session;
  assert.notEqual(transferred.id,existing);assert.equal(transferred.handoff.source_session_id,first);
  assert.equal(transferred.agent,'claude');assert.equal(transferred.project.path,projectPath);
  const actual=JSON.parse(fs.readFileSync(path.join(projectPath,'claude-input.json'),'utf8')).text;
  assert.match(actual,/Original task: keep the project context/);assert.match(actual,/^Implement the next step\n\n/);
  assert.doesNotMatch(actual,/controlled output/);assert.equal(await sessionCount(),3);
  assert.equal((await call('GET','/v1/sessions/'+first+'/events?cursor=0&wait=0')).data.session.state,'running');
  await page.locator('#handoff-source').click();assert.equal(await input.inputValue(),'Keep this original draft');
  // Busy source is explained; opening the other session still works without stopping it.
  await input.fill('approval');await page.locator('#send').click();await page.locator('.request-card').waitFor();
  await choose('quick-agent','opencode');await dialog.waitFor();
  await page.waitForFunction(()=>document.querySelector('#handoff-error').textContent.includes('Finish the response'));
  assert.equal(await page.locator('#handoff-send').isDisabled(),true);
  await page.locator('#handoff-close').click();assert.equal(await page.locator('.request-card').count(),1);
  await page.locator('#interrupt-turn').click();await page.waitForFunction(()=>document.querySelector('#turn-status').textContent==='Ready for your message');
  // Review becomes stale if another client adds messages; no destination is created.
  await choose('quick-agent','opencode');await dialog.waitFor();
  await page.waitForFunction(()=>document.querySelector('#handoff-context').value.includes('Original task'));
  await page.locator('#handoff-instruction').fill('Follow up');
  await call('POST','/v1/sessions/'+first+'/message',{text:'An update from another client',request_id:crypto.randomUUID()});
  await delay(250);await page.locator('#handoff-send').click();
  await page.waitForFunction(()=>document.querySelector('#handoff-error').textContent.includes('source conversation changed'));
  assert.equal(await sessionCount(),3);
  await page.locator('#handoff-refresh').click();await page.waitForFunction(()=>document.querySelector('#handoff-context').value.includes('An update from another client'));
  // A lost response is retried with the same id, and creates only one destination.
  dropHandoff=true;await page.locator('#handoff-send').click();
  await page.waitForFunction(()=>document.querySelector('#handoff-error').textContent.includes('may have been accepted'));
  const count=await sessionCount();assert.equal(count,4);
  assert.equal(await page.locator('#handoff-instruction').isDisabled(),true);
  await page.locator('#handoff-send').click();await dialog.waitFor({state:'hidden'});
  await page.waitForFunction(()=>!document.querySelector('#handoff-source').hidden && document.querySelector('#turn-status').textContent==='Ready for your message');
  assert.equal(await sessionCount(),count);
  // Small Korean screen, retained history link after reload, and old bridge guidance.
  await page.reload();await page.waitForFunction(()=>!document.querySelector('#handoff-source').hidden);
  await page.setViewportSize({width:320,height:700});
  await page.evaluate(()=>{window.BibimerI18n.setLanguage('ko');window.BibimerI18n.apply();});
  await choose('quick-agent','codex');await dialog.waitFor();await page.locator('#handoff-context-details summary').click();
  await page.waitForFunction(()=>document.querySelector('#handoff-context').value.length>0);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:path.join(root,'dist/screenshots/handoff-320-ko.png')});
  assert.equal(await page.evaluate(()=>window.BibimerBack()),true);await dialog.waitFor({state:'hidden'});
  hideHandoff=true;await page.reload();await page.waitForFunction(()=>document.querySelector('#connection').textContent==='Connected');
  await choose('quick-agent','codex');await dialog.waitFor();
  assert.match(await page.locator('#handoff-error').innerText(),/Update the bridge/);
  assert.equal(await page.locator('#handoff-send').isDisabled(),true);assert.equal(await sessionCount(),4);
  assert.deepEqual(errors,[]);
  console.log('PASS: switch choice; no launch on preview/cancel; existing destination isolated; context/next instruction to native agent; original draft/process kept; origin link/reload; busy approvals; stale preview; uncertain retry exactly once; 320/393px EN/KO; Back; old bridge');
}
main().catch(async error=>{console.error(error.stack);if(browser){try{await browser.contexts()[0].pages()[0].screenshot({path:path.join(root,'dist/screenshots/handoff-failure.png')});}catch{}}process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();if(bridge&&bridge.exitCode===null){const done=new Promise(resolve=>bridge.once('exit',resolve));bridge.kill('SIGTERM');await done;}if(assets)await new Promise(resolve=>assets.close(resolve));fs.rmSync(tmp,{recursive:true,force:true});});
