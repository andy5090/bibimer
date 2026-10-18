/* Quick setup UI with a native lifecycle stand-in; no device permission or model changes. */
const fs=require('node:fs'), path=require('node:path'), http=require('node:http'), assert=require('node:assert/strict');
if(process.platform==='android') Object.defineProperty(process,'platform',{value:'linux'});
const {chromium}=require('../.tools/ui/node_modules/playwright-core');
const root=path.resolve(__dirname,'..'), assets=path.join(root,'android/app/src/main/assets');
let server,browser;
async function main(){
  server=http.createServer((req,res)=>{
    const file=req.url==='/'?'index.html':req.url.slice(1);
    if(!/^[\w./-]+$/.test(file)||file.includes('..')) return res.writeHead(404).end();
    try{res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.svg')?'image/svg+xml':file.endsWith('.woff2')?'font/woff2':'text/html');res.end(fs.readFileSync(path.join(assets,file)));}
    catch(_){res.writeHead(404).end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  browser=await chromium.launch({executablePath:process.env.BIBIMER_CHROMIUM||path.join(process.env.PREFIX,'bin/headless_shell'),headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  const page=await browser.newPage({viewport:{width:360,height:640},locale:'ko-KR'}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>{
    const get=()=>JSON.parse(localStorage.getItem('setup-state')||'{"phase":"idle","id":"","permitted":false}');
    const set=value=>localStorage.setItem('setup-state',JSON.stringify(value));
    window.setupCalls=[];
    window.agentCopies=[];
    window.agentGuides=[];
    window.setupHealthStatus=200;
    window.setupHealthDelay=0;
    window.setupResult=(phase,paired=false)=>{set({...get(),phase});if(paired)localStorage.setItem('paired','yes');window.BibimerResume();};
    window.Bibimer={
      environment:()=>JSON.stringify({language:localStorage.getItem('language')||'en',paired:localStorage.getItem('paired')==='yes',
        termuxInstalled:localStorage.getItem('termux')==='yes',quickSetup:get(),version:'0.9.0'}),
      setLanguage:value=>{localStorage.setItem('language',value);return true;},setEnterBehavior:()=>true,setAgentOptions:()=>true,
      startQuickSetup:()=>{window.setupCalls.push('start');set({phase:'running',id:'controlled-job',permitted:true});},
      openAppPermissions:()=>window.setupCalls.push('permissions'),openTermux:()=>window.setupCalls.push('termux'),
      openGuide:name=>window.agentGuides.push(name),copyText:text=>window.agentCopies.push(text),
      exportInstaller:()=>{},copyCommand:name=>window.setupCalls.push(name),cancelPoll:()=>{},
      forget:()=>{localStorage.removeItem('paired');set({phase:'idle',id:''});},
      request:(id,method,route)=>{
        if(route==='/v1/health') {
          const status=window.setupHealthStatus;
          setTimeout(()=>window.BibimerNativeReply(id,{ok:status===200,status,data:status===200?{protocol:1,instance:'controlled-instance',
            features:[],agents:[{id:'shell',installed:true}],project:null,session:null}:{code:'error_connection_failed'}}),window.setupHealthDelay);
        }
        else throw new Error('Unexpected request '+route);
      }
    };
  });
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.locator('#go-setup').click();
  assert.equal(await page.locator('#quick-connect').isDisabled(),true);
  assert.match(await page.locator('#quick-status').innerText(),/Install Termux/);
  await page.evaluate(()=>{localStorage.setItem('termux','yes');window.BibimerResume();});
  assert.equal(await page.locator('#quick-connect').isDisabled(),false);
  await page.evaluate(()=>window.setupResult('quick_permission'));
  assert.equal(await page.locator('#quick-permissions').getAttribute('open'),'');
  await page.locator('#quick-app-permissions').click();
  await page.locator('[data-command=external-apps]').click();
  await page.locator('#quick-open-termux').click();
  assert.deepEqual(await page.evaluate(()=>window.setupCalls),['permissions','external-apps','termux']);
  await page.evaluate(()=>window.setupResult('quick_external'));
  assert.match(await page.locator('#quick-status').innerText(),/Enable external apps/);
  await page.locator('#quick-connect').click();
  await page.waitForFunction(()=>document.querySelector('#quick-status').textContent.includes('Preparing Termux'));
  assert.equal(await page.locator('#quick-connect').isDisabled(),true);
  assert.equal(await page.evaluate(()=>window.setupCalls.filter(item=>item==='start').length),1);
  await page.reload();await page.locator('#tab-setup').click();
  assert.equal(await page.locator('#quick-connect').isDisabled(),true);
  assert.match(await page.locator('#quick-status').innerText(),/Preparing Termux/);
  for(const phase of ['quick_python_failed','quick_install_failed','quick_bridge_failed','quick_pair_failed','quick_timeout','quick_busy']){
    await page.evaluate(value=>window.setupResult(value),phase);
    assert.equal(await page.locator('#quick-connect').isDisabled(),false);
    assert.ok((await page.locator('#quick-status').innerText()).length>20);
  }
  await page.locator('#manual-setup > summary').click();
  assert.equal(await page.locator('#pair-code').isVisible(),true);
  await page.locator('#manual-setup > summary').click();
  await page.locator('#tab-settings').click();
  await page.locator('#language-trigger').click();await page.locator('#select-options [data-value=ko]').click();
  await page.locator('#tab-setup').click();
  await page.evaluate(()=>window.setupResult('quick_external'));
  assert.match(await page.locator('#quick-status').innerText(),/외부 앱 연동/);
  for(const width of [320,360]){
    await page.setViewportSize({width,height:640});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.locator('#quick-connect').scrollIntoViewIfNeeded();
    fs.mkdirSync(path.join(root,'dist/screenshots'),{recursive:true});
    await page.screenshot({path:path.join(root,`dist/screenshots/quick-setup-${width}-ko.png`)});
  }
  await page.locator('#quick-connect').click();
  await page.evaluate(()=>window.setupResult('connected',true));
  await page.waitForFunction(()=>!document.querySelector('#workspace').hidden && document.querySelector('#setup').hidden);
  assert.equal(await page.locator('#pair-code').inputValue(),'');
  await page.reload();await page.waitForFunction(()=>!document.querySelector('#workspace').hidden);
  if(await page.locator('#sidebar').evaluate(node=>node.open))await page.locator('#sidebar-close').click();
  await page.locator('#tab-setup').click();
  assert.match(await page.locator('#quick-status').innerText(),/연결 정보를 저장/);
  assert.equal(await page.locator('#setup').isVisible(),true);
  // Reconnecting a paired app must bypass RUN_COMMAND even after an earlier
  // Termux integration error. A stopped bridge / rejected token still needs setup.
  await page.evaluate(()=>window.setupResult('quick_external'));
  await page.locator('#tab-setup').click();
  await page.locator('#quick-connect').click();
  await page.waitForFunction(()=>!document.querySelector('#workspace').hidden && document.querySelector('#setup').hidden);
  assert.equal(await page.evaluate(()=>window.setupCalls.filter(item=>item==='start').length),0);
  await page.waitForFunction(()=>!document.querySelector('#quick-connect').disabled);
  for(const status of [0,401]) {
    await page.evaluate(value=>{window.setupHealthStatus=value;},status);
    await page.locator('#tab-setup').click();
    const before=await page.evaluate(()=>window.setupCalls.filter(item=>item==='start').length);
    await page.locator('#quick-connect').click();
    await page.waitForFunction(count=>window.setupCalls.filter(item=>item==='start').length===count+1,before);
    assert.equal(await page.locator('#quick-connect').isDisabled(),true);
    await page.evaluate(()=>{window.setupHealthStatus=200;window.setupResult('connected',true);});
    await page.waitForFunction(()=>!document.querySelector('#quick-connect').disabled);
  }
  await page.locator('#tab-setup').click();
  await page.evaluate(()=>{window.setupHealthStatus=0;window.setupHealthDelay=300;window.setupCalls=[];});
  await page.locator('#quick-connect').click();
  await page.evaluate(()=>{document.querySelector('#quick-connect').click();window.BibimerPause();});
  await page.waitForTimeout(900);
  assert.deepEqual(await page.evaluate(()=>window.setupCalls),[]);
  await page.evaluate(()=>{window.setupHealthStatus=200;window.setupHealthDelay=0;window.BibimerResume();});
  await page.locator('#tab-setup').click();
  // Viewing/copying installation guidance must never start a setup job or agent.
  const setupBeforeGuides=await page.evaluate(()=>window.setupCalls.slice());
  for(const id of ['codex-install','claude-install','opencode-install','gemini-install']) {
    assert.equal(await page.locator(`#${id}`).evaluate(node=>node.open),false);
    await page.locator(`#${id} > summary`).click();
  }
  const commands=await page.locator('[data-agent-copy]').count();
  assert.equal(commands,11);
  for(let index=0;index<commands;index++) {
    const button=page.locator('[data-agent-copy]').nth(index);
    const command=await button.evaluate(node=>document.getElementById(node.dataset.agentCopy).textContent);
    await button.click();
    assert.equal(await page.evaluate(()=>window.agentCopies.at(-1)),command);
  }
  for(const guide of ['codex-termux','claude-termux','opencode-termux','opencode-source','codex','claude','opencode','gemini-termux','gemini']) {
    await page.locator(`[data-guide="${guide}"]`).click();
    assert.equal(await page.evaluate(()=>window.agentGuides.at(-1)),guide);
  }
  assert.deepEqual(await page.evaluate(()=>window.setupCalls),setupBeforeGuides);
  for(const locale of ['en','ko','pt-BR','es','id','zh-Hans','ja','zh-Hant','fr','de']) {
    await page.evaluate(value=>{localStorage.setItem('language',value);window.BibimerRefreshLanguage();},locale);
    await page.setViewportSize({width:320,height:640});
    assert.equal(await page.locator('html').getAttribute('lang'),locale);
    for(const key of ['agent_termux_basis','agent_codex_termux','agent_claude_termux','agent_opencode_termux','agent_gemini_termux']) {
      assert.equal(await page.locator(`[data-i18n="${key}"]`).textContent(),await page.evaluate(k=>window.BibimerI18n.t(k),key));
    }
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    assert.deepEqual(await page.evaluate(()=>[...document.querySelectorAll('[data-agent-copy]')].map(node=>document.getElementById(node.dataset.agentCopy).textContent)),await page.evaluate(()=>window.agentCopies));
    if(['en','ko'].includes(locale)) {
      await page.locator('#codex-install').scrollIntoViewIfNeeded();
      await page.screenshot({path:path.join(root,`dist/screenshots/agent-setup-320-${locale}.png`)});
    }
  }
  for(const id of ['codex-install','claude-install','opencode-install','gemini-install']) assert.equal(await page.locator(`#${id}`).evaluate(node=>node.open),true);
  assert.deepEqual(await page.evaluate(()=>window.setupCalls),setupBeforeGuides);
  await page.locator('#forget').click();
  assert.equal(await page.evaluate(()=>JSON.parse(window.Bibimer.environment()).paired),false);
  assert.equal(await page.evaluate(()=>JSON.parse(window.Bibimer.environment()).quickSetup.phase),'idle');
  assert.deepEqual(errors,[]);
  console.log('PASS: quick setup regression; Termux agent guides, eleven exact command copies, guide routing, no implicit setup, ten locales at 320px with unchanged commands/open panels; native APIs mocked');
}
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();if(server)await new Promise(resolve=>server.close(resolve));});
