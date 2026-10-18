/* Settings maintenance UI. Native commands and health are controlled; no phone sessions are touched. */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
if(process.platform==='android')Object.defineProperty(process,'platform',{value:'linux'});
const {chromium}=require('../.tools/ui/node_modules/playwright-core');
const assets=path.resolve(__dirname,'../android/app/src/main/assets');
let server,browser;
(async()=>{
 server=http.createServer((req,res)=>{try{const file=req.url==='/'?'index.html':req.url.slice(1);if(!/^[\w./-]+$/.test(file)||file.includes('..'))throw Error();res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(path.join(assets,file)));}catch(_){res.writeHead(404).end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 browser=await chromium.launch({executablePath:process.env.BIBIMER_CHROMIUM||path.join(process.env.PREFIX,'bin/headless_shell'),headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:320,height:640}}),errors=[];
 page.setDefaultTimeout(15000);
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  window.calls=[];window.phase='';window.active=false;window.version='0.15.0';window.instance='old';window.healthReads=0;window.demo=false;window.lang='en';window.failHealth=false;
  window.Bibimer={environment:()=>JSON.stringify({paired:true,demo:window.demo,language:window.lang,bundledBridgeVersion:'0.16.0',version:'0.21.0'}),
   bridgeMaintenanceStatus:()=>window.phase,maintainBridge:action=>{window.calls.push(action);window.phase='bridge_maintenance_running';},cancelPoll:()=>{},setEnterBehavior:()=>true,setAgentOptions:()=>true,
   request:(id,method,route)=>{if(route!=='/v1/health')throw Error('Unexpected mutation/request '+route);window.healthReads++;if(window.failHealth){setTimeout(()=>window.BibimerNativeReply(id,{ok:false,status:0,data:{code:'error_connection_failed'}}),0);return;}setTimeout(()=>window.BibimerNativeReply(id,{ok:true,status:200,data:{protocol:1,instance:window.instance,version:window.version,features:['multiple_projects','session_library'],agents:[{id:'shell',installed:true}],project:{id:'archived-project',name:'Background project',path:'/mock/project',agent:'shell'},session:null,projects:[{id:'archived-project',name:'Background project',path:'/mock/project',agent:'shell',session:null,sessions:window.active?[{id:'background-session',project:{id:'archived-project',name:'Background project',path:'/mock/project'},state:'running',archived:true,agent:'shell',mode:'terminal'}]:[]}]}}),0);}
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
 assert.deepEqual(await page.evaluate(()=>window.calls),['update','restart']);
 await page.evaluate(()=>{window.phase='bridge_maintenance_busy';});
 await page.waitForFunction(()=>document.querySelector('#bridge-maintenance-status').textContent.includes('still running'));
 await page.evaluate(()=>{window.phase='';window.active=true;window.BibimerResume();});
 await page.waitForFunction(()=>document.querySelector('#bridge-maintenance-status').textContent.includes('Running sessions: 1'));
 assert.equal(await page.locator('#bridge-restart').isDisabled(),true);
 assert.equal(await page.locator('#bridge-update-install').isDisabled(),true);
 // A dead bridge may leave stale active rows. Only Termux can establish whether the state lock is still held.
 await page.evaluate(()=>{window.failHealth=true;window.BibimerResume();});
 await page.waitForFunction(()=>!document.querySelector('#bridge-restart').disabled);
 assert.equal(await page.locator('#bridge-update-install').isDisabled(),false);
 await page.evaluate(()=>{window.failHealth=false;window.active=false;window.BibimerResume();});
 await page.waitForFunction(()=>!document.querySelector('#bridge-restart').disabled);
 for(const lang of ['en','ko','pt-BR','es','id','zh-Hans','ja','zh-Hant','fr','de']){
  await page.evaluate(lang=>{window.lang=lang;window.BibimerResume();},lang);
  await page.waitForTimeout(100);
  const layout=await page.locator('#bridge-update-card').evaluate(el=>({w:el.getBoundingClientRect().width,scroll:el.scrollWidth,client:el.clientWidth,text:el.textContent}));
  assert.ok(layout.w<=320&&layout.scroll<=layout.client+1,lang+' overflow');
  assert.ok(!layout.text.includes('bridge_maintenance_'),lang+' untranslated');
 }
 assert.deepEqual(errors,[]);
 console.log('Bridge maintenance UI: explicit update/restart, completion reconnect/version, duplicate prevention, archived active session blocking and 10 locales at 320px passed');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();if(server)await new Promise(r=>server.close(r));});
