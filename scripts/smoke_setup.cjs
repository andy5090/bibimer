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
    window.setupRequests=[];
    window.agentCopies=[];
    window.agentGuides=[];
    window.claudeCopies=[];
    window.agentActions=[];
    window.setupHealthStatus=200;
    window.setupHealthDelay=0;
    window.setupResult=(phase,paired=false)=>{set({...get(),phase});if(paired)localStorage.setItem('paired','yes');window.BibimerResume();};
    window.Bibimer={
      environment:()=>JSON.stringify({language:localStorage.getItem('language')||'en',paired:localStorage.getItem('paired')==='yes',
        termuxInstalled:localStorage.getItem('termux')==='yes',quickSetup:get(),version:'0.9.0'}),
      setLanguage:value=>{localStorage.setItem('language',value);return true;},setEnterBehavior:()=>true,setAgentOptions:()=>true,
      startAgentAction:(agent,action)=>{window.agentActions.push([agent,action]);window.BibimerAgentActionStatus(agent,"agent_action_sent");},
      startQuickSetup:()=>{window.setupCalls.push('start');set({phase:'running',id:'controlled-job',permitted:true});},
      openAppPermissions:()=>window.setupCalls.push('permissions'),openTermux:()=>window.setupCalls.push('termux'),
      openGuide:name=>window.agentGuides.push(name),copyText:text=>window.agentCopies.push(text),
      exportInstaller:()=>window.setupCalls.push('export'),copyCommand:name=>name.startsWith('claude-')?window.claudeCopies.push(name):window.setupCalls.push(name),cancelPoll:()=>{},
      forget:()=>{localStorage.removeItem('paired');set({phase:'idle',id:''});},
      request:(id,method,route)=>{
        window.setupRequests.push([method,route]);
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
  assert.equal(await page.locator('#setup-connection-complete').isVisible(),true);
  assert.equal(await page.locator('#setup-connection-steps').isVisible(),false);
  assert.match(await page.locator('#setup-connected-heading').innerText(),/Termux 연결 완료/);
  for(const selector of ['#quick-connect','#export-installer','#pair','#pair-code','[data-command="install"]','[data-command="external-apps"]']) {
    assert.equal(await page.locator(selector).isDisabled(),true);
  }
  assert.equal(await page.locator('#setup').isVisible(),true);
  // A saved setup error cannot reactivate initial setup while health is good.
  await page.evaluate(()=>window.setupResult('quick_external'));
  await page.locator('#tab-setup').click();
  assert.equal(await page.locator('#setup-connection-complete').isVisible(),true);
  assert.equal(await page.locator('#quick-permissions').evaluate(node=>node.open),false);
  await page.evaluate(()=>{
    document.querySelector('#quick-connect').click();
    document.querySelector('#export-installer').click();
    document.querySelector('[data-command="install"]').click();
    document.querySelector('#pair-code').value='12345678';
    document.querySelector('#pair-form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
  });
  assert.equal(await page.evaluate(()=>window.setupCalls.filter(item=>item==='start').length),0);
  assert.equal(await page.evaluate(()=>window.setupCalls.some(item=>['export','install'].includes(item))),false);
  assert.equal(await page.evaluate(()=>window.setupRequests.some(([method,route])=>method==='POST'&&route==='/v1/pair')),false);
  assert.equal(await page.locator('#pair-code').inputValue(),'12345678');
  await page.locator('#setup-open-work').click();
  assert.equal(await page.locator('#work').isVisible(),true);
  await page.locator('#tab-setup').click();
  await page.locator('#setup-open-termux').click();
  assert.equal(await page.evaluate(()=>window.setupCalls.at(-1)),'termux');
  // A cached offline status can recover using the saved token, without setup.
  await page.evaluate(()=>{window.setupHealthStatus=0;window.BibimerResume();});
  await page.waitForFunction(()=>!document.querySelector('#setup-connection-steps').hidden && !document.querySelector('#quick-connect').disabled);
  await page.evaluate(()=>{window.setupHealthStatus=200;document.querySelector('#quick-connect').click();});
  await page.waitForFunction(()=>!document.querySelector('#workspace').hidden && document.querySelector('#setup').hidden);
  assert.equal(await page.evaluate(()=>window.setupCalls.filter(item=>item==='start').length),0);
  await page.waitForFunction(()=>!document.querySelector('#quick-connect').getAttribute('aria-busy')||document.querySelector('#quick-connect').getAttribute('aria-busy')==='false');
  // A stopped bridge / rejected token restores the manual and automatic paths.
  for(const status of [0,401]) {
    await page.evaluate(value=>{window.setupHealthStatus=value;window.BibimerResume();},status);
    await page.waitForFunction(()=>!document.querySelector('#setup-connection-steps').hidden && !document.querySelector('#quick-connect').disabled);
    await page.locator('#tab-setup').click();
    assert.equal(await page.locator('#setup-connection-complete').isVisible(),false);
    assert.equal(await page.locator('#pair-code').isDisabled(),false);
    const before=await page.evaluate(()=>window.setupCalls.filter(item=>item==='start').length);
    await page.locator('#quick-connect').click();
    await page.waitForFunction(count=>window.setupCalls.filter(item=>item==='start').length===count+1,before);
    assert.equal(await page.locator('#quick-connect').isDisabled(),true);
    await page.evaluate(()=>{window.setupHealthStatus=200;window.setupResult('connected',true);});
    await page.waitForFunction(()=>!document.querySelector('#setup-connection-complete').hidden);
    assert.equal(await page.locator('#quick-connect').isDisabled(),true);
  }
  await page.locator('#tab-setup').click();
  await page.evaluate(()=>{window.setupHealthStatus=0;window.setupHealthDelay=300;window.setupCalls=[];window.BibimerResume();});
  await page.waitForFunction(()=>!document.querySelector('#setup-connection-steps').hidden && !document.querySelector('#quick-connect').disabled);
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
  for(const name of ['claude-repair','claude-adapter']) await page.locator(`[data-command="${name}"]`).click();
  assert.deepEqual(await page.evaluate(()=>window.claudeCopies),['claude-repair','claude-adapter']);
  assert.equal(commands,12);
  assert.deepEqual(await page.evaluate(()=>window.agentActions),[]);
  for(const action of ['repair','adapter','login','status','version']) {
    await page.locator(`#claude-install [data-agent-action="${action}"]`).click();
    assert.deepEqual(await page.evaluate(()=>window.agentActions.at(-1)),["claude",action]);
    assert.match(await page.locator('#agent-action-status-claude').innerText(),/설치·로그인 완료를 뜻하지/);
  }
  await page.evaluate(()=>window.BibimerAgentActionStatus("claude",'quick_permission'));
  assert.match(await page.locator('#agent-action-status-claude').innerText(),/Termux 환경에서 명령 실행/);
  const actionStatus=await page.locator('#agent-action-status-claude').innerText();
  await page.evaluate(()=>window.BibimerAgentActionStatus("claude",'unsafe arbitrary output'));
  assert.equal(await page.locator('#agent-action-status-claude').innerText(),actionStatus);
  await page.evaluate(()=>{window.BibimerPause();document.querySelector('#claude-install [data-agent-action="login"]').click();});
  assert.equal(await page.evaluate(()=>window.agentActions.length),5);
  await page.evaluate(()=>window.BibimerResume());
  const claudeStatus=await page.locator('#agent-action-status-claude').innerText();
  const expectedActions=['repair','adapter','login','status','version'].map(action=>['claude',action]);
  for(const agent of ['codex','opencode','gemini']) {
    for(const action of agent==='gemini'?['login','version']:['login','status','version']) {
      await page.locator(`#${agent}-install [data-agent-action="${action}"]`).click();
      expectedActions.push([agent,action]);
      assert.deepEqual(await page.evaluate(()=>window.agentActions.at(-1)),[agent,action]);
      assert.match(await page.locator(`#agent-action-status-${agent}`).innerText(),agent==='opencode'?/제공자 설정·명령 결과/:/설치·로그인 완료를 뜻하지/);
    }
  }
  assert.equal(await page.locator('#agent-action-status-claude').innerText(),claudeStatus);
  await page.evaluate(()=>window.BibimerAgentActionStatus('shell','quick_permission'));
  assert.equal(await page.locator('[data-agent-action]').count(),13);
  assert.equal(await page.locator('#gemini-install [data-agent-action="status"]').count(),0);
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
    assert.equal(await page.locator('#setup-connection-complete').isVisible(),true);
    assert.equal(await page.locator('#setup-connected-heading').textContent(),await page.evaluate(()=>window.BibimerI18n.t('setup_connected')));
    assert.equal(await page.locator('[data-i18n="setup_connected_body"]').textContent(),await page.evaluate(()=>window.BibimerI18n.t('setup_connected_body')));
    assert.equal(await page.locator('#setup-connection-steps').isVisible(),false);
    for(const key of ['agent_termux_basis','agent_codex_termux','agent_claude_termux','agent_claude_auth_hint','agent_opencode_termux','agent_gemini_termux','agent_action_hint','agent_action_login','claude_action_repair','claude_action_adapter','agent_action_status','agent_action_version','agent_action_providers','agent_gemini_login_hint','agent_action_connect_provider','agent_opencode_provider_hint']) {
      assert.equal(await page.locator(`[data-i18n="${key}"]`).first().textContent(),await page.evaluate(k=>window.BibimerI18n.t(k),key));
    }
    for(const agent of ['codex','claude','opencode','gemini']) {
      const key=agent==='claude'?'quick_permission':agent==='opencode'?'agent_opencode_action_sent':'agent_action_sent';
      assert.equal(await page.locator(`#agent-action-status-${agent}`).textContent(),await page.evaluate(value=>window.BibimerI18n.t(value),key));
    }
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    assert.deepEqual(await page.evaluate(()=>[...document.querySelectorAll('[data-agent-copy]')].map(node=>document.getElementById(node.dataset.agentCopy).textContent)),await page.evaluate(()=>window.agentCopies));
    if(['en','ko'].includes(locale)) {
      await page.locator('#setup-connection-complete').scrollIntoViewIfNeeded();
      await page.screenshot({path:path.join(root,`dist/screenshots/setup-connected-320-${locale}.png`)});
      await page.locator('#codex-install').scrollIntoViewIfNeeded();
      await page.screenshot({path:path.join(root,`dist/screenshots/agent-setup-320-${locale}.png`)});
      await page.locator('#claude-install').scrollIntoViewIfNeeded();
      await page.screenshot({path:path.join(root,`dist/screenshots/claude-actions-320-${locale}.png`)});
      for(const agent of ['opencode','gemini']) {
        await page.locator(`#${agent}-install`).scrollIntoViewIfNeeded();
        await page.screenshot({path:path.join(root,`dist/screenshots/${agent}-actions-320-${locale}.png`)});
      }
    }
  }
  assert.deepEqual(await page.evaluate(()=>window.agentActions),expectedActions);
  for(const id of ['codex-install','claude-install','opencode-install','gemini-install']) assert.equal(await page.locator(`#${id}`).evaluate(node=>node.open),true);
  assert.deepEqual(await page.evaluate(()=>window.setupCalls),setupBeforeGuides);
  await page.locator('#forget').click();
  assert.equal(await page.evaluate(()=>JSON.parse(window.Bibimer.environment()).paired),false);
  assert.equal(await page.evaluate(()=>JSON.parse(window.Bibimer.environment()).quickSetup.phase),'idle');
  await page.locator('#tab-setup').click();
  assert.equal(await page.locator('#setup-connection-complete').isVisible(),false);
  assert.equal(await page.locator('#setup-connection-steps').isVisible(),true);
  assert.equal(await page.locator('#quick-connect').isDisabled(),false);
  // Older native clients keep manual recovery, but also reflect a live bridge.
  await page.evaluate(()=>{localStorage.setItem('paired','yes');delete window.Bibimer.startQuickSetup;window.setupHealthStatus=200;window.BibimerResume();});
  await page.waitForFunction(()=>!document.querySelector('#setup-connection-complete').hidden);
  assert.equal(await page.locator('#setup-connection-steps').isVisible(),false);
  assert.equal(await page.locator('#quick-setup').isVisible(),false);
  await page.evaluate(()=>{window.setupHealthStatus=0;window.BibimerResume();});
  await page.waitForFunction(()=>!document.querySelector('#setup-connection-steps').hidden);
  assert.equal(await page.locator('#manual-setup').evaluate(node=>node.open),true);
  assert.equal(await page.locator('#pair-code').isVisible(),true);
  assert.equal(await page.locator('#pair-code').isDisabled(),false);
  assert.deepEqual(errors,[]);
  console.log('PASS: connected Termux setup completion, disabled install/pairing paths, offline/401/forget recovery, quick setup regression; Termux agent guides, thirteen explicit agent actions and per-agent status isolation, permission status and pause guards, twelve exact command copies, guide routing, no implicit setup, ten locales at 320px with unchanged commands/open panels; native APIs mocked');
}
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();if(server)await new Promise(resolve=>server.close(resolve));});
