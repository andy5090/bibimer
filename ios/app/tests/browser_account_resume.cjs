"use strict";
// Packaged iOS UI, synthetic authentication job and clipboard-free browser fixture.
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),os=require("node:os"),http=require("node:http"),{spawnSync}=require("node:child_process");
const repo=path.resolve(__dirname,"../../.."),{chromium}=require(path.join(repo,".tools/ui/node_modules/playwright-core"));
const web=fs.mkdtempSync(path.join(os.tmpdir(),"bibimer-account-resume-"));
const packed=spawnSync("python3",["-c","import importlib.util,sys;from pathlib import Path;s=importlib.util.spec_from_file_location('build','ios/app/build.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m);m.package_web(Path(sys.argv[1]))",web],{cwd:repo,encoding:"utf8"});
assert.equal(packed.status,0,packed.stderr);
const fixture=()=>{
  const project={id:"fixture-project",name:"Account fixture",path:"/fixture",agent:"shell"};
  const session={id:"00000000-0000-4000-8000-000000000001",agent:"shell",mode:"terminal",state:"running",project,options:{permission:"inherit"},output_end:0};
  window.__bibimerEnvironment={paired:true,selfTest:true,platform:"ios",language:"ko",systemLanguage:"ko",languagePreference:"ko",agentOptions:{},enterBehavior:"newline",localRuntime:{state:"connected",foreground:true}};
  const job={id:"00000000-0000-4000-8000-000000000099",agent:"codex",status:"pending",url:"https://example.invalid/auth"};
  window.authFixture={calls:[],opened:[],closed:[],saved:false,noSession:false,job:null};
  window.webkit={messageHandlers:{bibimer:{postMessage(message){
    const fixture=window.authFixture;
    if(message.action==="accountBrowser"){fixture.opened.push(message.job);return;}
    if(message.action==="closeAccountBrowser"){fixture.closed.push(message.job);return;}
    if(message.action!=="request")return;
    const reply=data=>window.BibimerNativeReply(message.id,{ok:true,status:200,data:JSON.parse(JSON.stringify(data))});
    if(message.path==="/v1/health")setTimeout(()=>reply({protocol:1,version:"fixture",instance:"fixture-instance",home:"/fixture",features:["multiple_projects","agent_sessions","session_library","agent_options","agent_connections","agent_login_terminal","agent_login_ui"],project,session:fixture.noSession?null:session,projects:[{...project,session:fixture.noSession?null:session,sessions:fixture.noSession?[]:[session]}],agents:[{id:"shell",installed:true,modes:["terminal"]},{id:"codex",installed:true,modes:["terminal","chat"]}]}),0);
    else if(message.path.includes("/events?"))setTimeout(()=>reply({session,cursor:0,data:""}),100);
    else if(message.path==="/v1/agent-connections"){
      const data=JSON.parse(message.body);fixture.calls.push(data);
      if(data.action==="status")setTimeout(()=>reply({agent:"codex",installed:true,state:fixture.saved?"configured":"signed_out",providers:[],...(fixture.job?{job:fixture.job}:{})}),0);
      else{
        if(data.action==="start")fixture.job={...job};
        if(data.action==="poll"&&fixture.saved)fixture.job={...job,status:"saved",url:null};
        setTimeout(()=>reply({job:fixture.job}),0);
      }
    }else setTimeout(()=>reply({}),0);
  }}}};
};
(async()=>{
  const server=http.createServer((request,response)=>{
    const relative=decodeURIComponent(new URL(request.url,"http://localhost").pathname).replace(/^\//,"")||"index.html",file=path.resolve(web,relative);
    if(!file.startsWith(web+path.sep)||!fs.existsSync(file)){response.writeHead(404);response.end();return;}
    response.setHeader("Content-Type",{".js":"text/javascript",".css":"text/css",".html":"text/html"}[path.extname(file)]||"application/octet-stream");response.end(fs.readFileSync(file));
  });await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
  const browser=await chromium.launch({executablePath:path.join(repo,".tools/mac-ui/bin/headless_shell"),headless:true});
  try{
    for(const noSession of [false,true]){
      const page=await browser.newPage();const errors=[];page.on("pageerror",error=>errors.push(error.message));
      await page.addInitScript({content:"("+fixture.toString()+")();window.authFixture.noSession="+noSession+";\n"+fs.readFileSync(path.join(repo,"ios/app/Resources/native.js"),"utf8")});
      await page.goto("http://127.0.0.1:"+server.address().port);
      await page.waitForFunction(()=>document.getElementById("connection").classList.contains("connected"));
      await page.evaluate(()=>document.getElementById("agent-connections-open").click());
      await page.waitForFunction(()=>!document.getElementById("agent-connection-submit").disabled);
      await page.locator("#agent-connection-submit").click();
      await page.waitForFunction(()=>window.authFixture.calls.some(call=>call.action==="poll"));
      const before=await page.evaluate(()=>window.authFixture.calls.filter(call=>call.action==="poll").length);
      await page.evaluate(()=>{window.BibimerPause();window.authFixture.saved=true;window.BibimerResume();});
      await page.waitForFunction(()=>document.getElementById("connection").classList.contains("connected"));
      // With an active terminal there is no 3-second health loop to mask a missing resume.
      await page.waitForFunction(before=>window.authFixture.calls.filter(call=>call.action==="poll").length>before,before,{timeout:1500});
      await page.waitForFunction(()=>document.getElementById("agent-connection-status").textContent==="설정됨");
      const result=await page.evaluate(()=>({calls:window.authFixture.calls,opened:window.authFixture.opened,closed:window.authFixture.closed}));
      assert.equal(result.calls.filter(call=>call.action==="start").length,1,"Resuming must never resend login start");
      assert.equal(result.calls.filter(call=>call.action==="poll").length,before+1,"Resume polls the existing job once; completed jobs stop polling");
      assert.equal(result.calls.filter(call=>call.action==="poll").at(-1).id,"00000000-0000-4000-8000-000000000099");
      assert.equal(result.opened.length,1,"Foreground return must not reopen the auth browser");assert.ok(result.closed.includes(result.opened[0]));
      assert.deepEqual(errors,[]);await page.close();
    }
    console.log("PASS packaged iOS account resume: same pending job completes after foreground return, with/without active terminal, no login resend or browser reopen");
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve));fs.rmSync(web,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
