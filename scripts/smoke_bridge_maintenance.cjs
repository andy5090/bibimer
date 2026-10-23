/* Settings maintenance UI. Native commands and health are controlled; no phone sessions are touched. */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
if(process.platform==='android')Object.defineProperty(process,'platform',{value:'linux'});
const {chromium}=require('../.tools/ui/node_modules/playwright-core');
const assets=path.resolve(__dirname,'../android/app/src/main/assets');
let server,browser;
(async()=>{
 server=http.createServer((req,res)=>{try{const file=req.url==='/'?'index.html':req.url.slice(1);if(!/^[\w./-]+$/.test(file)||file.includes('..'))throw Error();res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.svg')?'image/svg+xml':file.endsWith('.woff2')?'font/woff2':'text/html');res.end(fs.readFileSync(path.join(assets,file)));}catch(_){res.writeHead(404).end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 browser=await chromium.launch({executablePath:process.env.BIBIMER_CHROMIUM||path.join(process.env.PREFIX,'bin/headless_shell'),headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:320,height:640}}),errors=[];
 page.setDefaultTimeout(15000);
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  window.calls=[];window.stops=[];window.sessions=[];window.phase='';window.version='0.15.0';window.instance='old';window.healthReads=0;window.demo=false;window.lang='en';window.failHealth=false;
  window.project={id:'archived-project',name:'Background project',path:'/mock/project',agent:'shell'};
  window.row=(id,mode='chat',turn_state='ready')=>({id:id.repeat(8)+'-aaaa-aaaa-aaaa-'+id.repeat(12),project:window.project,state:'running',archived:true,agent:mode==='chat'?'codex':'shell',mode,turn_state,title:'Session <b>'+id+'</b>',queued_count:turn_state==='waiting'?2:0});
  window.Bibimer={environment:()=>JSON.stringify({paired:true,demo:window.demo,language:window.lang,bundledBridgeVersion:'0.16.0',version:'0.21.0'}),
   bridgeMaintenanceStatus:()=>window.phase,maintainBridge:action=>{window.calls.push(action);window.phase='bridge_maintenance_running';},cancelPoll:()=>{},setEnterBehavior:()=>true,setAgentOptions:()=>true,
   request:(id,method,route,body)=>{
    const reply=(ok,data)=>setTimeout(()=>window.BibimerNativeReply(id,{ok,status:ok?200:503,data}),0);
    if(method==='POST'&&route.endsWith('/stop')){
      const sessionId=route.split('/')[3];window.stops.push(sessionId);
      if(window.failStop){reply(false,{code:'error_request_failed'});return;}
      const finish=()=>{if(window.ackWithoutExit)window.sessions.find(row=>row.id===sessionId).state='stopping';else window.sessions=window.sessions.filter(row=>row.id!==sessionId);if(window.injectOnStop){window.sessions.push(window.row('f'));window.injectOnStop=false;}reply(true,{ok:true});};
      if(window.holdStop){window.holdStop=false;window.releaseStop=finish;}else finish();return;
    }
    if(route==='/v1/maintenance/recovery'){
      if(method==='POST'){
        window.recoveryCalls=(window.recoveryCalls || 0)+1;window.recoveryRequest=JSON.parse(body);
        if(window.failRecovery){reply(false,{code:'error_maintenance_recovery'});return;}
        window.recovery={...window.recovery,restored:2,failed:0,retryable:0,rows:window.recovery.rows.map(row=>row.state==='failed'?{...row,state:'restored',error:null}:row)};
      }
      reply(true,{recovery:window.recovery});return;
    }
    if(route!=='/v1/health')throw Error('Unexpected mutation/request '+route);window.healthReads++;
    if(window.failHealth){reply(false,{code:'error_connection_failed'});return;}
    const finish=()=>reply(true,{protocol:1,instance:window.instance,version:window.version,features:['multiple_projects','session_library',...(window.recovery===undefined?[]:['maintenance_recovery'])],maintenance_recovery:window.recovery,agents:[{id:'shell',installed:true}],
      project:window.project,session:null,active_sessions:window.sessions.length,projects:[{...window.project,session:null,sessions:window.sessions}]});
    if(window.holdNextHealth){window.holdNextHealth=false;window.releaseHealth=finish;}else finish();
   }
  };
 });
 await page.goto(`http://127.0.0.1:${server.address().port}`);
 await page.locator('#tab-settings').click();
 await page.waitForFunction(()=>!document.querySelector('#bridge-update-install').disabled);
 assert.equal(await page.locator('#bridge-restart').isDisabled(),false);
 assert.equal(await page.locator('#bridge-update-guide').isHidden(),true);
 await page.locator('#bridge-update-install').click();
 await page.waitForFunction(()=>document.querySelector('#bridge-maintenance-status').textContent.includes('Updating'));
 assert.equal(await page.locator('#bridge-restart').isDisabled(),true);
 assert.deepEqual(await page.evaluate(()=>window.calls),['update']);
 await page.evaluate(()=>{window.version='0.16.0';window.instance='updated';window.phase='bridge_maintenance_done';});
 await page.waitForFunction(()=>document.querySelector('#bridge-update-version').textContent.includes('Connected: 0.16.0'));
 assert.equal(await page.locator('#bridge-update-install').isDisabled(),true);
 await page.waitForFunction(()=>!document.querySelector('#bridge-restart').disabled);
 await page.locator('#bridge-restart').click();
 await page.waitForFunction(()=>window.calls.length===2);assert.deepEqual(await page.evaluate(()=>window.calls),['update','restart']);
 await page.evaluate(()=>{window.phase='bridge_maintenance_busy';});
 await page.waitForFunction(()=>document.querySelector('#bridge-maintenance-status').textContent.includes('still running'));
 await page.evaluate(()=>{window.phase='';window.version='0.15.0';window.sessions=[window.row('a'),window.row('b','chat','running'),window.row('c','chat','waiting'),window.row('d','terminal')];window.BibimerResume();});
 await page.waitForFunction(()=>document.querySelector('#bridge-maintenance-status').textContent.includes('Connected sessions: 4'));
 await page.waitForFunction(()=>!document.querySelector('#bridge-update-install').disabled);
 assert.equal(await page.locator('#bridge-restart').isDisabled(),false);
 const open=async()=>{await page.waitForFunction(()=>!document.querySelector('#bridge-update-install').disabled);await page.locator('#bridge-update-install').click();await page.waitForFunction(()=>!document.querySelector('#bridge-maintenance-confirm').disabled);};
 const cancel=async()=>{await page.locator('#bridge-maintenance-cancel').click();await page.locator('#bridge-maintenance-dialog').waitFor({state:'hidden'});};
 await page.evaluate(()=>{window.holdNextHealth=true;document.querySelector('#bridge-update-install').click();});
 await page.waitForFunction(()=>!!window.releaseHealth);assert.equal(await page.evaluate(()=>window.BibimerBack()),true);
 await page.locator('#bridge-maintenance-dialog').waitFor({state:'hidden'});await page.evaluate(()=>window.releaseHealth());await page.waitForTimeout(50);
 assert.deepEqual(await page.evaluate(()=>window.stops),[]);assert.equal(await page.evaluate(()=>window.calls.length),2);
 await open();assert.equal(await page.locator('#bridge-maintenance-sessions li').count(),4);assert.equal(await page.locator('#bridge-maintenance-sessions b').count(),0);
 assert.match(await page.locator('#bridge-maintenance-sessions').textContent(),/Ready for your message/);
 assert.match(await page.locator('#bridge-maintenance-sessions').textContent(),/Responding/);
 assert.match(await page.locator('#bridge-maintenance-sessions').textContent(),/Queued/);
 await cancel();assert.deepEqual(await page.evaluate(()=>window.stops),[]);
 assert.deepEqual(await page.evaluate(()=>window.calls),['update','restart']);
 await open();await page.evaluate(()=>window.sessions.push(window.row('e')));await page.locator('#bridge-maintenance-confirm').click();
 await page.waitForFunction(()=>document.querySelector('#bridge-maintenance-progress').textContent.includes('changed'));
 assert.equal(await page.locator('#bridge-maintenance-sessions li').count(),5);assert.deepEqual(await page.evaluate(()=>window.stops),[]);
 await page.evaluate(()=>window.failStop=true);await page.locator('#bridge-maintenance-confirm').click();
 await page.waitForFunction(()=>!document.querySelector('#bridge-maintenance-confirm').disabled);
 assert.match(await page.locator('#bridge-maintenance-progress').textContent(),/maintenance was not started/);
 assert.equal(await page.locator('#bridge-maintenance-dialog').isVisible(),true);assert.equal(await page.evaluate(()=>window.calls.length),2);
 await page.evaluate(()=>{window.failStop=false;window.holdStop=true;});await page.locator('#bridge-maintenance-confirm').click();
 await page.waitForFunction(()=>!!window.releaseStop);assert.equal(await page.locator('#bridge-maintenance-confirm').isDisabled(),true);
 const duringStop=await page.evaluate(()=>window.stops.length);await page.locator('#bridge-maintenance-confirm').evaluate(node=>node.dispatchEvent(new Event('click')));assert.equal(await page.evaluate(()=>window.stops.length),duringStop);
 await page.keyboard.press('Escape');assert.equal(await page.locator('#bridge-maintenance-dialog').isVisible(),true);
 assert.equal(await page.evaluate(()=>window.BibimerBack()),true);assert.equal(await page.locator('#bridge-maintenance-dialog').isVisible(),true);
 assert.equal(await page.evaluate(()=>window.calls.length),2);await page.evaluate(()=>window.releaseStop());
 await page.waitForFunction(()=>window.calls.length===3);assert.equal(await page.evaluate(()=>window.sessions.length),0);
 assert.equal(await page.locator('#bridge-maintenance-dialog').isVisible(),false);
 assert.deepEqual(await page.evaluate(()=>window.calls),['update','restart','update']);
 console.log('PASS: idle/responding/waiting/archived/terminal review; cancel and literal titles; changed targets re-confirmed; stop failure keeps maintenance idle; duplicate/Back blocked while stopping');
 await page.evaluate(()=>{window.phase='';window.sessions=[window.row('a')];window.BibimerResume();});
 await open();await page.evaluate(()=>window.injectOnStop=true);await page.locator('#bridge-maintenance-confirm').click();
 await page.waitForFunction(()=>document.querySelector('#bridge-maintenance-progress').textContent.includes('changed'));
 assert.equal(await page.evaluate(()=>window.sessions.length),1);assert.equal(await page.evaluate(()=>window.calls.length),3);await cancel();
 await page.evaluate(()=>window.ackWithoutExit=true);await open();await page.locator('#bridge-maintenance-confirm').click();
 await page.waitForFunction(()=>window.sessions[0].state==='stopping');await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>window.calls.length),3);
 await page.evaluate(()=>{window.realNow=Date.now;Date.now=()=>window.realNow()+21000;});
 await page.waitForFunction(()=>document.querySelector('#bridge-maintenance-progress').textContent.includes('maintenance was not started'));
 assert.equal(await page.evaluate(()=>window.calls.length),3);await page.evaluate(()=>{Date.now=window.realNow;window.ackWithoutExit=false;});await cancel();
 await open();const beforeStale=await page.evaluate(()=>window.stops.length);await page.evaluate(()=>window.instance='changed');await page.locator('#bridge-maintenance-confirm').click();
 await page.waitForFunction(()=>!document.querySelector('#bridge-maintenance-confirm').disabled);
 assert.equal(await page.evaluate(()=>window.stops.length),beforeStale);assert.equal(await page.evaluate(()=>window.calls.length),3);await cancel();
 // A dead bridge may leave stale active rows. Only Termux can establish whether the state lock is still held.
 await page.evaluate(()=>{window.failHealth=true;window.BibimerResume();});
 await page.waitForFunction(()=>!document.querySelector('#bridge-restart').disabled);
 assert.equal(await page.locator('#bridge-update-install').isDisabled(),false);
 await page.evaluate(()=>{window.failHealth=false;window.sessions=[];window.BibimerResume();});
 await page.waitForFunction(()=>!document.querySelector('#bridge-restart').disabled);
 await page.evaluate(()=>{window.Bibimer.maintainBridgeWithRecovery=()=>{throw Error('Unconfirmed maintenance');};});
 for(const lang of ['en','ko','pt-BR','es','id','zh-Hans','ja','zh-Hant','fr','de']){
  await page.evaluate(lang=>{window.lang=lang;window.BibimerResume();},lang);
  await page.waitForTimeout(100);
  const layout=await page.locator('#bridge-update-card').evaluate(el=>({w:el.getBoundingClientRect().width,scroll:el.scrollWidth,client:el.clientWidth,text:el.textContent}));
  assert.ok(layout.w<=320&&layout.scroll<=layout.client+1,lang+' overflow');
  assert.ok(!layout.text.includes('bridge_maintenance_'),lang+' untranslated');
  await page.evaluate(()=>{window.sessions=[window.row('a'),window.row('b','chat','running'),window.row('c','terminal')];});
  await open();assert.equal(await page.locator('#bridge-maintenance-reopen').isChecked(),true);assert.equal(await page.locator('#bridge-maintenance-reopen-option').isVisible(),true);const modal=await page.locator('#bridge-maintenance-dialog').evaluate(el=>({scroll:el.scrollWidth,client:el.clientWidth,text:el.textContent}));
  assert.ok(modal.scroll<=modal.client+1,lang+' modal overflow');assert.ok(!modal.text.includes('bridge_maintenance_'),lang+' modal untranslated');
  fs.mkdirSync(path.resolve(__dirname,'../dist/screenshots'),{recursive:true});if(['en','ko'].includes(lang))await page.screenshot({path:path.resolve(__dirname,'../dist/screenshots/bridge-maintenance-end-320-'+lang+'.png')});
  await cancel();await page.evaluate(()=>window.sessions=[]);
 }
 await page.evaluate(()=>{
   window.lang='en';window.recovery={id:'01234567-0123-4123-8123-012345678901',state:'partial',restored:1,total:4,failed:1,skipped:1,uncertain:1,retryable:1,
     rows:[{id:window.row('a').id,state:'failed',error:'maintenance_recovery_failed'},
           {id:window.row('b').id,state:'skipped',error:'maintenance_recovery_no_history'},
           {id:window.row('c').id,state:'uncertain',error:'maintenance_recovery_uncertain'}]};window.BibimerResume();
 });
 await page.waitForFunction(()=>document.querySelector('#bridge-recovery-status').textContent.includes('1/4'));
 assert.equal(await page.locator('#bridge-recovery-rows li').count(),3);
 const stopCount=await page.evaluate(()=>window.stops.length);
 await page.evaluate(()=>window.failRecovery=true);await page.locator('#bridge-recovery-retry').click();
 await page.waitForFunction(()=>document.querySelector('#bridge-recovery-status').textContent.includes('Could not reopen these sessions'));
 assert.equal(await page.evaluate(()=>window.recoveryCalls),1);
 await page.evaluate(()=>window.failRecovery=false);await page.locator('#bridge-recovery-retry').click();
 await page.waitForFunction(()=>document.querySelector('#bridge-recovery-status').textContent.includes('2/4'));
 assert.equal(await page.locator('#bridge-recovery-retry').isVisible(),false);
 assert.equal(await page.locator('#bridge-recovery-rows li').count(),2);
 assert.equal(await page.evaluate(()=>window.stops.length),stopCount);
 assert.deepEqual(await page.evaluate(()=>window.recoveryRequest),{id:'01234567-0123-4123-8123-012345678901'});
 console.log('PASS: reopening defaults on in 10 locales at 320px; partial results separate skipped/uncertain rows; retry errors and success never stop sessions');
 assert.deepEqual(errors,[]);
 console.log('PASS: new session during stop and stale bridge never terminated; update/restart completion reconnect; offline recovery; 10 locales and confirmation at 320px');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();if(server)await new Promise(r=>server.close(r));});
