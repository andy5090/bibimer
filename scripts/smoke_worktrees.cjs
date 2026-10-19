/* Real isolated bridge + Git worktrees; browser native adapter, no external model calls. */
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http');
const {spawn,execFileSync}=require('node:child_process'),assert=require('node:assert/strict');
if(process.platform==='android')Object.defineProperty(process,'platform',{value:'linux'});
const {chromium}=require('../.tools/ui/node_modules/playwright-core');
const root=path.resolve(__dirname,'..'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'bibimer-worktrees-'));
const state=path.join(tmp,'state'),projectPath=path.join(tmp,'Mobile studio');
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let assets,bridge,browser,holdAction=null,releaseResponse=null,held=false,hideCreation=false,loseLaunch=false;
const requests=[];
async function main(){
  fs.mkdirSync(projectPath);fs.mkdirSync(path.join(tmp,'bin'));
  const python=execFileSync('which',['python'],{encoding:'utf8'}).trim();
  fs.writeFileSync(path.join(tmp,'bin/codex'),'#!'+python+'\n'+fs.readFileSync(path.join(root,'bridge/tests/fake_codex.py'),'utf8'),{mode:0o700});
  const git=(...args)=>execFileSync('git',['-C',projectPath,...args],{stdio:'pipe'});
  git('init','-b','main');git('-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','--allow-empty','-m','fixture');
  git('branch','existing');
  fs.writeFileSync(path.join(projectPath,'private.env'),'fixture private file');
  assets=http.createServer((req,res)=>{const name=req.url==='/'?'index.html':req.url.slice(1);try{
    if(name.includes('..'))throw Error();
    res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.woff2')?'font/woff2':name.endsWith('.svg')?'image/svg+xml':'text/html');
    res.end(fs.readFileSync(path.join(root,'android/app/src/main/assets',name)));
  }catch{res.writeHead(404).end();}});
  await new Promise(resolve=>assets.listen(0,'127.0.0.1',resolve));
  const probe=http.createServer();await new Promise(resolve=>probe.listen(0,'127.0.0.1',resolve));const port=probe.address().port;await new Promise(resolve=>probe.close(resolve));
  bridge=spawn('python',[path.join(root,'bridge/bibimer_bridge.py'),'serve','--state-dir',state,'--port',String(port)],{stdio:'ignore',env:{...process.env,PATH:path.join(tmp,'bin')+':'+process.env.PATH}});
  for(let i=0;i<100&&!fs.existsSync(path.join(state,'token.json'));i++)await delay(50);
  const token=JSON.parse(fs.readFileSync(path.join(state,'token.json')));
  const call=async(method,endpoint,body)=>{const response=await fetch('http://127.0.0.1:'+port+endpoint,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(method==='POST'?{body:JSON.stringify(body||{})}:{})});return {ok:response.ok,status:response.status,data:await response.json()};};
  const project=(await call('POST','/v1/project',{path:projectPath,add:true})).data.project;
  const secondPath=path.join(tmp,'Other project');fs.mkdirSync(secondPath);
  const other=(await call('POST','/v1/project',{path:secondPath,add:true})).data.project;
  await call('POST','/v1/project',{project_id:project.id});
  browser=await chromium.launch({executablePath:path.join(process.env.PREFIX,'bin/headless_shell'),headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  const page=await browser.newPage({viewport:{width:393,height:780},isMobile:true,hasTouch:true});page.setDefaultTimeout(12000);
  const errors=[];page.on('pageerror',error=>{errors.push(error.message);console.error('Page error:',error.message);});
  await page.exposeFunction('nativeRequest',async(id,method,endpoint,body)=>{
    const data=JSON.parse(body),result=await call(method,endpoint.replace('wait=20','wait=1'),data);
    if(endpoint==='/v1/worktrees/manage'){
      requests.push({...data});
      if(data.action===holdAction){holdAction=null;held=true;await new Promise(resolve=>releaseResponse=resolve);held=false;}
      if(data.action==='launch'&&loseLaunch){loseLaunch=false;result.ok=false;result.status=503;result.data={code:'error_request_failed'};}
    }
    if(hideCreation&&endpoint==='/v1/health')result.data.features=result.data.features.filter(value=>value!=='worktree_creation');
    try{await page.evaluate(({id,result})=>window.BibimerNativeReply(id,result),{id,result});}catch{}
  });
  await page.addInitScript(()=>{window.Bibimer={environment:()=>JSON.stringify({paired:true,termuxInstalled:true,language:localStorage.language||'en',version:'test',notifications:{enabled:localStorage.notifications!=='off',allowed:window.notificationAllowed!==false,state:'listening'}}),notificationsConnected:value=>window.notificationsSupported=value,setResponseNotifications:value=>{localStorage.notifications=value?'on':'off';window.BibimerNotificationStatus();},openNotificationSettings:()=>window.openedNotificationSettings=true,takeNotificationTarget:()=>{const target=window.notificationTarget||JSON.parse(localStorage.notificationTarget||'{}');window.notificationTarget=null;localStorage.removeItem('notificationTarget');return JSON.stringify(target);},request:(...args)=>window.nativeRequest(...args),cancelPoll:()=>{},setLanguage:value=>{localStorage.language=value;return true;},setAgentOptions:()=>true,setEnterBehavior:()=>true,setBackHandling:value=>window.backHandled=value,copyText:value=>window.copiedPath=value};});
  await page.goto('http://127.0.0.1:'+assets.address().port);
  await page.waitForFunction(()=>document.querySelector('#connection').textContent==='Connected');
  const choose=async(id,value)=>{await page.locator('#'+id+'-trigger').click();await page.locator('#select-options [data-value='+JSON.stringify(value)+']').click();};
  const sidebar=async()=>{if(!await page.locator('#sidebar').evaluate(node=>node.open))await page.locator('#sidebar-open').click();};
  const closeSidebar=async()=>{if(await page.locator('#sidebar').evaluate(node=>node.open))await page.locator('#sidebar-close').click();};
  const openGroup=async id=>{const group=page.locator('[data-project='+JSON.stringify(id)+']');if(!await group.evaluate(node=>node.open))await group.locator(':scope > summary').click();return group;};
  const select=async(id,p=project.id)=>{await sidebar();const group=await openGroup(p);const row=group.locator('[data-session='+JSON.stringify(id)+']');const tree=row.locator('xpath=ancestor::details[contains(@class,"sidebar-worktree")]');if(await tree.count()&&!await tree.evaluate(node=>node.open))await tree.locator(':scope > summary').click();await row.locator('.sidebar-session-open').click();await page.locator('#sidebar').waitFor({state:'hidden'});};
  const launch=async()=>{await page.locator('#launch').click();await page.waitForFunction(()=>document.querySelector('#turn-status').textContent==='Ready for your message');return (await call('GET','/v1/health')).data.session.id;};
  const openCreate=async(id=project.id)=>{await sidebar();await openGroup(id);await page.locator('[data-create-worktree='+JSON.stringify(id)+']').click();await page.locator('#worktree-create-dialog').waitFor({state:'visible'});await page.waitForFunction(()=>document.querySelector('#worktree-base').options.length>0);};
  const status=async()=>(await call('POST','/v1/worktrees/manage',{action:'status',project_id:project.id})).data.jobs;
  const waitUntil=async(check)=>{for(let i=0;i<200;i++){if(await check())return;await delay(50);}throw Error('fixture timed out');};
  const create=async(branch,agent='shell')=>{await page.locator('#worktree-branch').fill(branch);await choose('worktree-agent',agent);await page.locator('#worktree-create-submit').click();};
  const selected=async()=>(await call('GET','/v1/health')).data.session;
  await choose('agent','codex');const original=await launch();
  await page.locator('#input').fill('wait');await page.locator('#send').click();
  await page.waitForFunction(()=>document.querySelector('#turn-status').textContent.includes('Responding'));
  await page.locator('#input').fill('Keep original draft');
  await openCreate();
  assert.equal(await page.locator('#worktree-agent').inputValue(),'codex');
  await page.locator('#worktree-branch-choice-trigger').click();
  assert.equal(await page.locator('#select-options [data-value="main"]').isDisabled(),true);
  await page.locator('#select-close').click();
  await create('feature/한글');
  await page.locator('#worktree-create-dialog').waitFor({state:'hidden'});
  const first=await selected();assert.notEqual(first.id,original);
  assert.equal(first.agent,'shell');assert.notEqual(first.project.path,projectPath);
  assert.equal(git('-C',first.project.path,'branch','--show-current').toString().trim(),'feature/한글');
  assert.equal(fs.existsSync(path.join(first.project.path,'private.env')),false);
  assert.equal(git('branch','--show-current').toString().trim(),'main');
  assert.equal((await call('GET','/v1/health')).data.active_sessions,2);
  await select(original);await page.waitForFunction(()=>document.querySelector('#input').value==='Keep original draft');
  assert.equal((await selected()).turn_state,'running');
  console.log('PASS: sidebar creates a new branch and real worktree, opens a session; original response and draft survive');

  await openCreate();await page.locator('#worktree-create-reset').click();
  await page.waitForFunction(()=>!document.querySelector('#worktree-agent').disabled);
  await choose('worktree-branch-choice','existing');
  assert.equal(await page.locator('#worktree-branch').isHidden(),true);
  assert.equal(await page.locator('#worktree-base-trigger').isDisabled(),true);
  await choose('worktree-agent','shell');await page.locator('#worktree-create-submit').click();
  await page.locator('#worktree-create-dialog').waitFor({state:'hidden'});
  const second=await selected();assert.equal(git('-C',second.project.path,'branch','--show-current').toString().trim(),'existing');
  assert.equal((await status()).find(row=>row.branch==='existing').new_branch,false);
  assert.equal(git('rev-parse','existing').toString(),git('rev-parse','main').toString());
  console.log('PASS: existing branch choice reuses the branch without resetting it; checked-out branch is disabled');

  await openCreate();await page.locator('#worktree-create-reset').click();
  await page.waitForFunction(()=>!document.querySelector('#worktree-agent').disabled);
  await page.locator('#worktree-branch').fill('bad..branch');await choose('worktree-agent','shell');
  await page.locator('#worktree-create-submit').click();
  await page.waitForFunction(()=>!document.querySelector('#worktree-branch').disabled);
  assert.match(await page.locator('#worktree-create-status').textContent(),/branch/i);
  await page.locator('#worktree-branch').fill('feature/closed');
  holdAction='create';await page.locator('#worktree-create-submit').click();await waitUntil(()=>held);
  assert.equal(await page.locator('#worktree-create-submit').isDisabled(),true);
  const count=requests.filter(row=>row.action==='create').length;
  await page.locator('#worktree-create-form').evaluate(node=>node.dispatchEvent(new Event('submit',{cancelable:true})));
  assert.equal(requests.filter(row=>row.action==='create').length,count);
  await page.locator('#worktree-create-close').click();releaseResponse();
  await waitUntil(async()=>(await status()).some(row=>row.branch==='feature/closed'&&row.state==='complete'));
  await delay(1000);assert.equal((await selected()).id,second.id);
  assert.equal((await call('GET','/v1/health')).data.active_sessions,3);
  await page.reload();await page.waitForFunction(()=>document.querySelector('#connection').textContent==='Connected');
  await openCreate();await page.waitForFunction(()=>!document.querySelector('#worktree-create-submit').disabled);
  assert.equal(await page.locator('#worktree-branch').inputValue(),'feature/closed');
  assert.equal(await page.locator('#worktree-base').inputValue(),(await status()).find(row=>row.branch==='feature/closed').base);
  assert.match(await page.locator('#worktree-create-submit').textContent(),/Start session/i);
  loseLaunch=true;await page.locator('#worktree-create-submit').click();
  await page.waitForFunction(()=>!document.querySelector('#worktree-create-submit').disabled);
  assert.equal(await page.locator('#worktree-create-dialog').isVisible(),true);
  assert.equal((await selected()).id,second.id);
  assert.equal((await call('GET','/v1/health')).data.active_sessions,4);
  await page.locator('#worktree-create-submit').click();await page.locator('#worktree-create-dialog').waitFor({state:'hidden'});
  const third=await selected();assert.notEqual(third.id,second.id);
  assert.equal((await call('GET','/v1/health')).data.active_sessions,4);
  const launchIds=requests.filter(row=>row.action==='launch').slice(-2).map(row=>row.request_id);assert.equal(launchIds[0],launchIds[1]);
  console.log('PASS: closing keeps background creation without launching; reload recovers it; lost launch response retry creates one session');

  await select(original);await page.locator('#input').fill('Keep original draft');await select(third.id);
  await openCreate();await page.locator('#worktree-create-reset').click();
  await page.waitForFunction(()=>!document.querySelector('#worktree-agent').disabled);
  holdAction='launch';await create('feature/launch-closed');await waitUntil(()=>held);
  await page.locator('#worktree-create-close').click();await closeSidebar();
  await select(original);await page.waitForFunction(()=>document.querySelector('#input').value==='Keep original draft');
  releaseResponse();await delay(1200);
  assert.equal((await selected()).id,original);
  assert.equal(await page.locator('#input').inputValue(),'Keep original draft');
  assert.equal((await call('GET','/v1/health')).data.active_sessions,5);
  console.log('PASS: closing during session start and switching sessions never steals the selected session');

  await sidebar();await openGroup(other.id);
  assert.equal(await page.locator('[data-create-worktree='+JSON.stringify(other.id)+']').isDisabled(),true);
  fs.mkdirSync(path.join(root,'dist/screenshots'),{recursive:true});
  for(const language of ['en','ko','pt-BR','es','id','zh-Hans','ja','zh-Hant','fr','de']){
    await closeSidebar();await page.locator('#tab-settings').click();await choose('language',language);await page.locator('#tab-work').click();
    await openCreate();if(await page.locator('#worktree-create-reset').isVisible())await page.locator('#worktree-create-reset').click();
    await page.waitForFunction(()=>!document.querySelector('#worktree-agent').disabled);
    await page.locator('#worktree-branch').fill('feature/mobile-layout');
    await page.waitForFunction(()=>document.querySelector('#worktree-branch-choice-trigger .select-value').textContent===window.BibimerI18n.t('worktree_new_branch') &&
      document.querySelector('#worktree-mode-trigger .select-value').textContent===window.BibimerI18n.t('mode_'+document.querySelector('#worktree-mode').value));
    for(const width of [320,393]){
      await page.setViewportSize({width,height:640});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,language);
      assert.equal(await page.locator('#worktree-create-dialog').evaluate(node=>node.scrollWidth<=node.clientWidth+1),true,language);
      if(['en','ko'].includes(language))await page.screenshot({path:path.join(root,'dist/screenshots/worktree-create-'+width+'-'+language+'.png')});
    }
    await choose('worktree-base','refs/heads/main');await choose('worktree-agent','codex');
    assert.equal(await page.locator('#worktree-mode').inputValue(),'chat');
    assert.equal(await page.evaluate(()=>window.BibimerBack()),true);
    assert.equal(await page.locator('#worktree-create-dialog').isVisible(),false);
  }
  console.log('PASS: non-Git disabled; 10 languages at 320/393px; own bottom sheets, base/agent/mode selection, Android Back');
  hideCreation=true;await page.reload();await page.waitForFunction(()=>document.querySelector('#connection').textContent.length>0);
  await sidebar();await openGroup(project.id);assert.equal(await page.locator('[data-create-worktree]').count(),0);
  assert.deepEqual(errors,[]);console.log('PASS: older bridge hides worktree creation; no browser errors');
}
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{
  if(releaseResponse)releaseResponse();if(browser)await browser.close();
  if(bridge){bridge.kill('SIGTERM');await delay(500);if(bridge.exitCode===null)bridge.kill('SIGKILL');}
  if(assets)await new Promise(resolve=>assets.close(resolve));fs.rmSync(tmp,{recursive:true,force:true});
});
