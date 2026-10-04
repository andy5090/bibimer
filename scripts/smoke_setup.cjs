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
    window.setupResult=(phase,paired=false)=>{set({...get(),phase});if(paired)localStorage.setItem('paired','yes');window.BibimerResume();};
    window.Bibimer={
      environment:()=>JSON.stringify({language:localStorage.getItem('language')||'en',paired:localStorage.getItem('paired')==='yes',
        termuxInstalled:localStorage.getItem('termux')==='yes',quickSetup:get(),version:'0.9.0'}),
      setLanguage:value=>{localStorage.setItem('language',value);return true;},setEnterBehavior:()=>true,setAgentOptions:()=>true,
      startQuickSetup:()=>{window.setupCalls.push('start');set({phase:'running',id:'controlled-job',permitted:true});},
      openAppPermissions:()=>window.setupCalls.push('permissions'),openTermux:()=>window.setupCalls.push('termux'),
      openGuide:()=>{},exportInstaller:()=>{},copyCommand:name=>window.setupCalls.push(name),cancelPoll:()=>{},
      forget:()=>{localStorage.removeItem('paired');set({phase:'idle',id:''});},
      request:(id,method,route)=>{
        if(route==='/v1/health') queueMicrotask(()=>window.BibimerNativeReply(id,{ok:true,status:200,data:{protocol:1,instance:'controlled-instance',
          features:[],agents:[{id:'shell',installed:true}],project:null,session:null}}));
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
  await page.locator('#forget').click();
  assert.equal(await page.evaluate(()=>JSON.parse(window.Bibimer.environment()).paired),false);
  assert.equal(await page.evaluate(()=>JSON.parse(window.Bibimer.environment()).quickSetup.phase),'idle');
  assert.deepEqual(errors,[]);
  console.log('PASS: quick setup missing Termux, first-time permissions, copied enable command, progress/duplicate prevention, reload, failures/retry, manual fallback, automatic connection, forgetting, English/Korean and 320/360px layout; native APIs mocked');
}
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();if(server)await new Promise(resolve=>server.close(resolve));});
