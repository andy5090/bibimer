/* Browser/native adapter + isolated bridge, gh fixture and real local Git clones.
 * Does not authenticate, clone a user's remote repository or change their gh config. */
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http');
const {spawn,execFileSync}=require('node:child_process'),assert=require('node:assert/strict');
if(process.platform==='android')Object.defineProperty(process,'platform',{value:'linux'});
const {chromium}=require('../.tools/ui/node_modules/playwright-core');
const root=path.resolve(__dirname,'..'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'bibimer-github-'));
const state=path.join(tmp,'state'),repo=path.join(tmp,'source'),parent=path.join(tmp,'Projects 한글'),bin=path.join(tmp,'bin');
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let server,bridge,browser,legacy=false,missing=false,lose=false,holdPoll=false,cloneRequests=[];
async function main(){
  fs.mkdirSync(repo);fs.mkdirSync(parent);fs.mkdirSync(bin);
  const python=execFileSync('which',['python'],{encoding:'utf8'}).trim(),git=execFileSync('which',['git'],{encoding:'utf8'}).trim();
  execFileSync(git,['init','-b','main',repo],{stdio:'pipe'});fs.writeFileSync(path.join(repo,'hello.txt'),'Cloned content\n');
  execFileSync(git,['-C',repo,'add','.']);execFileSync(git,['-C',repo,'-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-m','Fixture'],{stdio:'pipe'});
  fs.writeFileSync(path.join(bin,'gh'),'#!'+python+'\n'+`
import sys, json, time
from pathlib import Path
root=Path(${JSON.stringify(tmp)})
args=sys.argv[1:]
if args[:2]==['auth','status']:
    print(json.dumps([{'login':'fixture','state':'success'}] if (root/'authenticated').exists() else []))
elif args[:2]==['auth','login']:
    print('! First copy your one-time code: ABCD-1234',file=sys.stderr,flush=True)
    print('SECRET_OUTPUT',file=sys.stderr,flush=True)
    while not (root/'authenticated').exists(): time.sleep(.1)
elif args[0]=='api':
    page=2 if 'page=2&' in ' '.join(args) else 1
    print(json.dumps([{'full_name':f'fixture/repo-{page}-{i}','private':True,'description':'<script>unsafe</script>','archived':False} for i in range(50 if page==1 else 1)]))
else: sys.exit(1)
`,{mode:0o700});
  fs.writeFileSync(path.join(bin,'git'),'#!'+python+'\n'+`
import os, sys, time
from pathlib import Path
args=sys.argv[1:]
if 'clone' in args:
    dest=Path(args[-1])
    if '/slow.git' in args[-2]:
        (dest/'partial').write_text('keep')
        os.write(2,b'SECRET_PROGRESS_OUTPUT\\rReceiving objects: 42% (42/100), controlled\\r')
        while not (Path(${JSON.stringify(tmp)})/'progress100').exists(): time.sleep(.05)
        os.write(2,b'Receiving objects: 100% (100/100), done.\\r')
        time.sleep(30)
    if '/fail.git' in args[-2]:
        (dest/'partial').write_text('keep')
        sys.exit(1)
    time.sleep(.4)
    os.execv(${JSON.stringify(git)},[${JSON.stringify(git)},'clone','--',${JSON.stringify(repo)},str(dest)])
os.execv(${JSON.stringify(git)},[${JSON.stringify(git)},*args])
`,{mode:0o700});
  server=http.createServer((req,res)=>{try{
    const name=req.url==='/'?'index.html':req.url.slice(1);if(name.includes('..'))throw Error();
    res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.woff2')?'font/woff2':name.endsWith('.svg')?'image/svg+xml':'text/html');
    res.end(fs.readFileSync(path.join(root,'android/app/src/main/assets',name)));
  }catch{res.writeHead(404).end();}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const probe=http.createServer();await new Promise(resolve=>probe.listen(0,'127.0.0.1',resolve));const port=probe.address().port;await new Promise(resolve=>probe.close(resolve));
  bridge=spawn(python,[path.join(root,'bridge/bibimer_bridge.py'),'serve','--state-dir',state,'--port',String(port)],{stdio:'ignore',env:{...process.env,PATH:bin+':'+process.env.PATH}});
  for(let i=0;i<100&&!fs.existsSync(path.join(state,'token.json'));i++)await delay(50);
  const token=JSON.parse(fs.readFileSync(path.join(state,'token.json')));
  const call=async(method,url,data={})=>{const response=await fetch(`http://127.0.0.1:${port}${url}`,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(method==='POST'?{body:JSON.stringify(data)}:{})});return{ok:response.ok,status:response.status,data:await response.json()};};
  const project=(await call('POST','/v1/project',{path:repo,add:true})).data.project;
  const session=(await call('POST','/v1/sessions',{project_id:project.id,agent:'shell',request_id:crypto.randomUUID()})).data.session;
  browser=await chromium.launch({executablePath:path.join(process.env.PREFIX,'bin/headless_shell'),headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  const page=await browser.newPage({viewport:{width:393,height:851},isMobile:true,hasTouch:true});page.setDefaultTimeout(12000);
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.exposeFunction('nativeRequest',async(id,method,url,body)=>{
    const data=JSON.parse(body);let result=await call(method,url.replace('wait=20','wait=1'),data);
    if(legacy&&url==='/v1/health')result.data.features=result.data.features.filter(value=>value!=='github_import');
    if(missing&&url==='/v1/github'&&data.action==='status')result.data={installed:false,account:null,login:{state:'idle'},jobs:[]};
    if(url==='/v1/github'&&data.action==='clone'){
      cloneRequests.push(data);
      if(lose){lose=false;holdPoll=true;await delay(600);result={ok:false,status:0,data:{code:'error_timeout'}};}
      else holdPoll=false;
    }
    if(holdPoll&&url==='/v1/github'&&data.action==='poll')result.data.jobs=[];
    // Android may forbid listing /; model a readable but read-only root for the UI boundary.
    if(url==='/v1/folders'&&data.path==='/')result={ok:true,status:200,data:{path:'/',parent:null,entries:[],next:null,writable:false}};
    try{await page.evaluate(({id,result})=>window.BibimerNativeReply(id,result),{id,result});}catch{}
  });
  await page.exposeFunction('nativeBrowser',()=>fs.writeFileSync(path.join(tmp,'authenticated'),'yes'));
  await page.addInitScript(()=>{window.Bibimer={environment:()=>JSON.stringify({paired:true,termuxInstalled:true,language:localStorage.language||'en',version:'test',
    lastProjectParent:localStorage.projectParent||'',lastProjectFolder:localStorage.projectFolder||''}),
    setProjectLocation:(parent,folder)=>{localStorage.projectParent=parent;localStorage.projectFolder=folder;return true;},
    request:(...args)=>window.nativeRequest(...args),cancelPoll:()=>{},setLanguage:value=>{localStorage.language=value;return true;},setAgentOptions:()=>true,setEnterBehavior:()=>true,setBackHandling:()=>{},copyText:text=>window.copied=text,openLink:url=>{window.opened=url;window.nativeBrowser();},openTermux:()=>{}};});
  const url=`http://127.0.0.1:${server.address().port}`;
  await page.goto(url);await page.waitForFunction(()=>document.querySelector('#connection').textContent==='Connected');
  await page.locator('#input').fill('Keep my existing draft');
  const open=async()=>{await page.locator('#sidebar-open').click();if(!await page.locator('#github-launch').isVisible())await page.locator('#edit-project').click();await page.locator('#github-launch').click();};
  await open();await page.locator('#github-connect').click();
  await page.waitForFunction(()=>document.querySelector('#github-code').textContent==='ABCD-1234');
  assert.equal((await page.locator('#github-dialog').innerText()).includes('SECRET_OUTPUT'),false);
  await page.locator('#github-copy-code').click();assert.equal(await page.evaluate(()=>window.copied),'ABCD-1234');
  await page.locator('#github-browser').click();assert.equal(await page.evaluate(()=>window.opened),'https://github.com/login/device');
  await page.waitForFunction(()=>document.querySelectorAll('.github-repository').length===50);
  assert.equal(await page.locator('#github-submit').isDisabled(),true);
  assert.equal(await page.locator('#github-clone-status').textContent(),'Choose a repository or enter owner/repository.');
  assert.equal(await page.locator('#github-entries script').count(),0);
  await page.locator('#github-more').click();await page.waitForFunction(()=>document.querySelectorAll('.github-repository').length===51);
  await page.locator('#github-filter').fill('repo-2-0');assert.equal(await page.locator('.github-repository').count(),1);
  await page.locator('.github-repository').click();assert.equal(await page.locator('#github-name').inputValue(),'repo-2-0');
  await page.locator('#github-name').fill('');
  assert.equal(await page.locator('#github-submit').isDisabled(),true);
  assert.equal(await page.locator('#github-clone-status').textContent(),'Enter a new folder name.');
  await page.locator('#github-name').fill('repo-2-0');
  await page.locator('#github-parent').fill('');
  assert.equal(await page.locator('#github-submit').isDisabled(),true);
  assert.equal(await page.locator('#github-clone-status').textContent(),'Choose the parent folder to clone into.');
  assert.equal(cloneRequests.length,0,'incomplete forms never issue a clone');
  await page.locator('#github-parent').fill('/');await page.locator('#github-browse').click();
  await page.waitForFunction(()=>document.querySelector('#folder-path').textContent==='/'&&document.querySelector('#folder-entries').getAttribute('aria-busy')==='false');
  assert.equal(await page.locator('#folder-up').isVisible(),false,'root has no parent row');
  assert.equal(await page.locator('#folder-select').isDisabled(),true,'read-only root cannot be selected');
  await page.locator('#folder-cancel').click();
  await page.locator('#github-parent').fill(tmp);await page.locator('#github-browse').click();
  await page.waitForFunction(()=>document.querySelector('#folder-entries').firstElementChild.id==='folder-up'&&!document.querySelector('#folder-up').disabled);
  assert.equal(await page.locator('#folder-up').getAttribute('title'),path.dirname(tmp));
  await page.locator('.folder-row').filter({hasText:'Projects 한글'}).locator('.folder-pick').click();
  assert.equal(await page.locator('#github-parent').inputValue(),parent);
  assert.equal(await page.evaluate(()=>localStorage.projectParent),parent);
  assert.equal(await page.evaluate(()=>localStorage.projectFolder),parent);
  assert.equal(await page.locator('#path').inputValue(),'~/projects/');
  await page.locator('#github-name').fill('가져온 프로젝트');
  fs.mkdirSync(path.join(root,'dist/screenshots'),{recursive:true});
  await page.screenshot({path:path.join(root,'dist/screenshots/github-import-en.png')});
  lose=true;await page.locator('#github-submit').tap();
  assert.equal(await page.locator('#github-clone-status').textContent(),'Checking the import request…');
  assert.equal(await page.locator('#github-submit').getAttribute('aria-busy'),'true');
  assert.equal(await page.locator('#github-clone-progress').isVisible(),true);
  assert.equal(await page.locator('#github-clone-progress').getAttribute('value'),null);
  await page.evaluate(()=>document.querySelector('#github-submit').click());
  await page.getByText('The request may have been accepted. Check again to recover the same import.').waitFor();
  assert.equal(cloneRequests.length,1,'repeated taps while sending do not duplicate the clone');
  await page.locator('#github-submit').click();
  await page.waitForFunction(()=>document.querySelector('#project-name').textContent==='가져온 프로젝트'&&!document.querySelector('#github-dialog').open);
  assert.equal(await page.locator('#sidebar').isVisible(),false,'clone completion closes sidebar');
  assert.equal(cloneRequests.length,2);assert.equal(cloneRequests[0].request_id,cloneRequests[1].request_id);
  assert.equal(fs.readFileSync(path.join(parent,'가져온 프로젝트','hello.txt'),'utf8'),'Cloned content\n');
  let health=(await call('GET','/v1/health')).data;assert.equal(health.projects.length,2);assert.notEqual(health.project.id,project.id);assert.equal(health.session,null);
  assert.equal(health.active_sessions,1,'auto-open does not start or terminate sessions');
  await page.locator('#sidebar-open').click();
  await page.locator('.sidebar-project[data-project="'+project.id+'"] .sidebar-project-open').click();
  await page.waitForFunction(()=>document.querySelector('#project-name').textContent==='source');
  assert.equal(await page.locator('#input').inputValue(),'Keep my existing draft');
  await open();await page.getByText('Project registered',{exact:true}).waitFor();
  assert.equal((await call('GET','/v1/health')).data.project.id,project.id,'history does not auto-open completed imports');
  await page.locator('#github-filter').fill('');
  await page.locator('#github-submit').tap();await page.getByText('That path already exists. Choose a new folder name; existing files are never overwritten.').waitFor();
  assert.ok(await page.evaluate(()=>{
    const status=document.querySelector('#github-clone-status')||document.querySelector('#github-status');
    const bounds=status.getBoundingClientRect();
    return bounds.top>=0&&bounds.bottom<=innerHeight;
  }),'Clone errors must be visible beside the submit button, even below a long repository list');
  for(const locale of ['en','ko','pt-BR','es','id','zh-Hans','ja','zh-Hant','fr','de']) {
    await page.evaluate(value=>{localStorage.language=value;window.BibimerRefreshLanguage();},locale);
    await page.setViewportSize({width:320,height:568});
    await page.locator('#github-clone-status').scrollIntoViewIfNeeded();
    assert.equal(await page.locator('#github-clone-status').textContent(),await page.evaluate(()=>window.BibimerI18n.t('error_github_exists')));
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    if(['en','ko'].includes(locale))await page.screenshot({path:path.join(root,`dist/screenshots/github-clone-feedback-320-${locale}.png`)});
  }
  await page.evaluate(()=>{localStorage.language='en';window.BibimerRefreshLanguage();});
  await page.setViewportSize({width:393,height:851});
  await page.locator('#github-repository').fill('fixture/fail');await page.locator('#github-name').fill('failed-copy');await page.locator('#github-submit').click();await page.getByText('Import failed',{exact:true}).waitFor();
  assert.equal(await page.locator('#github-clone-status').textContent(),await page.evaluate(()=>window.BibimerI18n.t('error_github_clone')));
  assert.equal(fs.readFileSync(path.join(parent,'failed-copy','partial'),'utf8'),'keep');
  await page.locator('#github-repository').fill('fixture/slow');await page.locator('#github-name').fill('cancel-copy');await page.locator('#github-submit').click();
  assert.equal(await page.locator('#github-submit').textContent(),'Cloning…');
  assert.equal(await page.locator('#github-submit').isDisabled(),true);
  assert.equal(await page.locator('#github-submit').getAttribute('aria-busy'),'true');
  const slowRequests=cloneRequests.length;
  await page.evaluate(()=>document.querySelector('#github-submit').click());
  assert.equal(cloneRequests.length,slowRequests);
  await page.waitForFunction(()=>document.querySelector('#github-clone-progress').getAttribute('value')==='42');
  assert.equal(await page.locator('#github-clone-status').textContent(),'Receiving objects · 42%');
  assert.equal((await page.locator('#github-dialog').innerText()).includes('SECRET_PROGRESS_OUTPUT'),false);
  for(const locale of ['en','ko','pt-BR','es','id','zh-Hans','ja','zh-Hant','fr','de']) {
    await page.evaluate(value=>{localStorage.language=value;window.BibimerRefreshLanguage();},locale);
    await page.setViewportSize({width:320,height:568});
    await page.locator('#github-clone-feedback').scrollIntoViewIfNeeded();
    assert.equal(await page.locator('#github-clone-status').textContent(),await page.evaluate(()=>window.BibimerI18n.t('github_progress_receiving',{percent:42})));
    assert.equal(await page.locator('#github-submit').isDisabled(),true);
    assert.equal(await page.locator('#github-clone-progress').getAttribute('value'),'42');
    assert.ok(await page.locator('#github-clone-progress').evaluate(node=>{const r=node.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;}));
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    if(['en','ko'].includes(locale))await page.screenshot({path:path.join(root,`dist/screenshots/github-progress-320-${locale}.png`)});
  }
  await page.evaluate(()=>{localStorage.language='en';window.BibimerRefreshLanguage();});
  await page.setViewportSize({width:393,height:851});
  await page.locator('#github-close').click();await page.locator('#sidebar-close').click();await open();
  await page.waitForFunction(()=>document.querySelector('#github-clone-progress').getAttribute('value')==='42');
  assert.equal(await page.locator('#github-submit').isDisabled(),true,'closing and reopening keeps the active clone locked');
  fs.writeFileSync(path.join(tmp,'progress100'),'yes');
  await page.waitForFunction(()=>document.querySelector('#github-clone-progress').getAttribute('value')==='100');
  assert.equal(await page.locator('#github-submit').isDisabled(),true,'100% of a Git stage is not project registration');
  await page.getByText('Cancel clone',{exact:true}).click();await page.getByText('Import cancelled',{exact:true}).waitFor();
  assert.equal(await page.locator('#github-clone-progress').isVisible(),false);
  assert.equal(await page.locator('#github-submit').getAttribute('aria-busy'),'false');
  assert.equal((await call('GET','/v1/health')).data.projects.length,2);
  await page.locator('#github-close').click();await page.locator('#sidebar-close').click();
  await page.evaluate(()=>{localStorage.language='ko';});await page.reload();await page.waitForFunction(()=>document.querySelector('#connection').textContent==='기기 연결됨');
  await open();await page.locator('.github-repository').first().waitFor();await page.setViewportSize({width:320,height:568});
  assert.equal(await page.locator('#github-parent').inputValue(),parent,'clone parent survives page/app recreation');
  await page.locator('.github-repository').first().click();await page.locator('#github-parent').fill(parent);await page.locator('#github-name').fill('새 폴더');
  await page.screenshot({path:path.join(root,'dist/screenshots/github-import-ko-320.png')});
  const bounds=await page.locator('#github-dialog').evaluate(node=>({width:node.clientWidth,scroll:node.scrollWidth}));assert.ok(bounds.scroll<=bounds.width+1);
  const jobs=await call('POST','/v1/github',{action:'poll'});const complete=jobs.data.jobs.find(job=>job.state==='complete');
  await page.getByText('프로젝트 열기',{exact:true}).click();await page.waitForFunction(()=>document.querySelector('#project-name').textContent==='가져온 프로젝트');
  assert.equal((await call('GET','/v1/health')).data.project.id,complete.project_id);
  const imported=path.join(parent,'가져온 프로젝트');
  assert.equal(await page.evaluate(()=>localStorage.projectFolder),imported,'opening cloned project remembers its canonical folder');
  await page.locator('#sidebar-open').click();if(!await page.locator('#path').isVisible())await page.locator('#edit-project').click();
  assert.equal(await page.locator('#path').inputValue(),parent+'/','next project is a sibling of the opened project');
  await page.locator('#browse-project').click();
  await page.waitForFunction(folder=>document.querySelector('#folder-path').textContent===folder&&!document.querySelector('#folder-select').disabled,imported);
  await page.locator('#folder-up').click();await page.waitForFunction(folder=>document.querySelector('#folder-path').textContent===folder, parent);
  await page.locator('#folder-cancel').click();assert.equal(await page.evaluate(()=>localStorage.projectFolder),imported,'navigation and cancellation do not change selection');
  const otherParent=path.join(tmp,'다른 projects'),existing=path.join(otherParent,'existing');fs.mkdirSync(existing,{recursive:true});
  await page.locator('#path').fill(existing);await page.locator('#browse-project').click();
  await page.waitForFunction(folder=>document.querySelector('#folder-path').textContent===folder&&!document.querySelector('#folder-select').disabled,existing);
  await page.locator('#folder-select').click();assert.equal(await page.locator('#create-folder').isChecked(),false);
  await page.locator('#project-form button[type=submit]').click();await page.waitForFunction(()=>document.querySelector('#project-name').textContent==='existing');
  assert.equal(await page.locator('#sidebar').isVisible(),false,'existing project registration closes sidebar');
  await page.reload();await page.waitForFunction(()=>document.querySelector('#connection').textContent==='기기 연결됨');
  await open();await page.locator('.github-repository').first().waitFor();
  assert.equal(await page.locator('#github-parent').inputValue(),otherParent,'opening existing folder also updates clone default');
  await page.locator('#github-browse').click();await page.waitForFunction(folder=>document.querySelector('#folder-path').textContent===folder&&!document.querySelector('#folder-select').disabled,otherParent);
  await page.locator('#folder-cancel').click();await page.locator('#github-close').click();await page.locator('#sidebar-close').click();
  await page.locator('#tab-settings').click();
  await page.locator('#sidebar-open').click();if(!await page.locator('#path').isVisible())await page.locator('#edit-project').click();
  assert.equal(await page.locator('#path').inputValue(),otherParent+'/');
  const created=path.join(otherParent,'typed new project');await page.locator('#path').fill(created);
  await page.locator('#project-form button[type=submit]').click();await page.waitForFunction(()=>document.querySelector('#project-name').textContent==='typed new project');
  assert.equal(await page.locator('#sidebar').isVisible(),false,'new project registration closes sidebar');
  assert.equal(await page.locator('#workspace').isVisible(),true,'registration from Settings opens the work page');
  assert.ok(fs.statSync(created).isDirectory());assert.equal(await page.evaluate(()=>localStorage.projectFolder),created,'typed creation remembers resolved path');
  await page.reload();await page.waitForFunction(()=>document.querySelector('#connection').textContent==='기기 연결됨');
  await open();assert.equal(await page.locator('#github-parent').inputValue(),otherParent);await page.locator('#github-close').click();await page.locator('#sidebar-close').click();
  // Feature gating and missing tooling guidance, with no login/clone side effect.
  legacy=true;await page.reload();await page.waitForFunction(()=>document.querySelector('#connection').textContent==='기기 연결됨');await open();
  await page.locator('#github-account').filter({hasText:'GitHub에서 프로젝트를 가져오려면 Termux 브리지를 업데이트하세요.'}).waitFor();assert.ok(await page.locator('#github-connect').isDisabled());
  legacy=false;missing=true;await page.reload();await page.waitForFunction(()=>document.querySelector('#connection').textContent==='기기 연결됨');await open();await page.locator('#github-install').click();
  assert.equal(await page.evaluate(()=>window.copied),'pkg install git gh');
  assert.equal((await call('GET','/v1/health')).data.active_sessions,1);
  assert.deepEqual(errors,[]);
  for(const name of fs.readdirSync(state).filter(name=>name.endsWith('.json'))){const data=fs.readFileSync(path.join(state,name),'utf8');assert.ok(!data.includes('SECRET_OUTPUT')&&!data.includes('SECRET_PROGRESS_OUTPUT')&&!data.includes('ABCD-1234'));}
  console.log('PASS: GitHub inline missing-field/request/progress/error feedback, visible errors below long repository lists, ten locales at 320px, login/list/filter, shared folder defaults, real clone/registration/lost-reply retry with automatic opening and duplicate-tap prevention, session/draft preservation, failures/cancel, old bridge and missing CLI.');
}
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{
  if(browser)await browser.close();if(bridge){bridge.kill('SIGTERM');await Promise.race([new Promise(resolve=>bridge.once('exit',resolve)),delay(3000)]);}
  if(server)await new Promise(resolve=>server.close(resolve));fs.rmSync(tmp,{recursive:true,force:true});
});
