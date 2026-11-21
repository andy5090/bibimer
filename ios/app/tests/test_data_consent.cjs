"use strict";
const fs=require("node:fs"),vm=require("node:vm"),assert=require("node:assert/strict"),crypto=require("node:crypto");
const resources="ios/app/Resources/";
class Element {
  constructor(){this.dataset={};this.listeners={};this.open=false;this.textContent="";this.children=[];}
  append(...children){this.children.push(...children);}
  addEventListener(name,fn){this.listeners[name]=fn;}
  click(){this.listeners.click?.({preventDefault(){}});}
  focus(){}
  showModal(){this.open=true;}
  close(){this.open=false;setImmediate(()=>this.listeners.close?.());}
}
function fixture(alpineNotices,runtimeNotices){
 const nodes=new Map(),events=new Map();
 const document={createElement:()=>new Element(),getElementById:id=>{if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id);},querySelectorAll:()=>[],addEventListener:(n,f)=>events.set(n,f),activeElement:new Element(),hidden:false};
 const posts=[],results=[];
 const window={BibimerIOSDataLocales:JSON.parse(fs.readFileSync(resources+"data-consent-locales.json","utf8")),BibimerI18n:{language:()=>"en"},addEventListener:(n,f)=>events.set(n,f),__bibimerEnvironment:{voiceInput:{provider:"openai"},speechOutput:{provider:"elevenlabs",mode:"full"}},webkit:{messageHandlers:{bibimer:{postMessage:x=>posts.push(x)}}},BibimerVoiceResult:(...r)=>results.push(r)};
 const box=vm.createContext({window,document,crypto:crypto.webcrypto,setTimeout,clearTimeout,console});
 window.BibimerAlpineNotices=alpineNotices;
 window.BibimerRuntimeNotices=runtimeNotices;
 vm.runInContext(fs.readFileSync(resources+"data-consent.js","utf8"),box);
 let context="project-one";window.BibimerDataConsent.configure(()=>context);
 return {box,window,document,nodes,posts,results,events,setContext:v=>context=v,allow:()=>nodes.get("ios-data-allow").click(),cancel:()=>nodes.get("ios-data-cancel").click()};
}
(async()=>{
 const ownNotices=JSON.parse(fs.readFileSync(resources+"runtime-notices.json","utf8"));
 const f=fixture({components:[{name:"musl",license:"MIT",notice:"Copyright <script>literal license text</script>",limitations:["Component limitation"]}],limitations:["Inventory limitation"]},ownNotices),consent=f.window.BibimerDataConsent;
 assert.equal(f.nodes.get("ios-bibimer-license").textContent,fs.readFileSync("ios/LICENSE.md","utf8"));
 assert.equal(f.nodes.get("ios-bibimer-exception").textContent,fs.readFileSync("ios/LICENSE.IOS","utf8"));
 const rendered=f.nodes.get("ios-alpine-notices").children;
 assert.equal(rendered[0].children[0].textContent,"musl · MIT");
 assert.equal(rendered[0].children[1].textContent,"Copyright <script>literal license text</script>","License text must be preserved as text, never interpreted as HTML");
 assert.equal(rendered[0].children[2].textContent,"Component limitation");assert.equal(rendered[1].textContent,"Inventory limitation");
 const req={purpose:"chat",recipient:"OpenAI",scope:"account-one",remember:false};
 let pending=consent.ensure(req);assert.equal(f.posts.length,0);f.cancel();assert.equal(await pending,false);
 pending=consent.ensure(req);f.allow();assert.equal(await pending,true);
 pending=consent.ensure({...req,purpose:"voiceOutput"});await new Promise(setImmediate);assert.equal(f.nodes.get("ios-data-consent").open,true,"An earlier asynchronous close event cannot consume a new consent request");f.cancel();assert.equal(await pending,false);

 pending=consent.ensure(req);assert.equal(f.nodes.get("ios-data-consent").open,true,"Unconfirmed/custom CLI destinations ask for every operation");f.cancel();assert.equal(await pending,false);
 pending=consent.ensure({...req,purpose:"voiceInput",remember:true});f.allow();assert.equal(await pending,true);assert.equal(await consent.ensure({...req,purpose:"voiceInput",remember:true}),true);
 pending=consent.ensure({...req,purpose:"voiceOutput",remember:true});f.setContext("project-two");f.allow();assert.equal(await pending,false,"A changed target cannot accept a stale question");
 pending=consent.ensure(req);consent.invalidate();assert.equal(await pending,false);
 pending=consent.ensure(req);f.events.get("pagehide")();assert.equal(await pending,false);
 pending=consent.ensure(req);f.document.hidden=true;f.events.get("visibilitychange")();assert.equal(await pending,false);f.document.hidden=false;
 pending=consent.ensure(req);const other=consent.ensure({...req,recipient:"Google"});assert.equal(await other,false,"A second request cannot replace visible recipient");f.cancel();await pending;
 f.nodes.get("ios-data-revoke").click();assert.match(f.nodes.get("ios-data-revoke-status").textContent,/future requests/);
 const locales=f.window.BibimerIOSDataLocales,keys=Object.keys(locales.en).sort();assert.equal(Object.keys(locales).length,10);for(const row of Object.values(locales)){assert.deepEqual(Object.keys(row).sort(),keys);for(const value of Object.values(row))assert.ok(value.trim());}
 assert.match(consent.recipient("codex"),/by default.*configured/);assert.match(consent.recipient("opencode"),/check/);

 // Execute the real iOS app API integration against a held fake local bridge.
 const g=fixture();let scope="one";const calls=[];
 Object.assign(g.box,{instance:"bridge-one",projectKey:()=>scope,viewKey:()=>"session-one",currentTab:"work",paused:false,online:true,
 findSession:()=>({agent:"claude",project:{id:scope},options:{model:"claude"}}),appError:key=>Object.assign(new Error(key),{key}),api:async(...args)=>{calls.push(args);return {ok:true};}});
 vm.runInContext(fs.readFileSync(resources+"data-consent-hooks.js","utf8"),g.box);
 let action=g.box.api("POST","/v1/sessions/session-one/message",{text:"private prompt"});assert.equal(calls.length,0);g.cancel();await assert.rejects(action,e=>e.status===409);assert.equal(calls.length,0);
 action=g.box.api("POST","/v1/sessions/session-one/message",{text:"private prompt"});g.allow();await action;assert.equal(calls.length,1);
 action=g.box.api("POST","/v1/sessions/session-one/respond",{answers:{question:"answer"}});scope="two";g.allow();await assert.rejects(action,e=>e.status===409);assert.equal(calls.length,1);
 await g.box.api("GET","/v1/health");assert.equal(calls.length,2,"Local reads do not require data sharing");
 g.box.worktreeCreator={state:{job:{id:"job-one",agent:"opencode",options:{model:"anthropic/claude"},project_id:scope,path:"/new-worktree"}}};
 action=g.box.api("POST","/v1/worktrees/manage",{action:"launch",project_id:scope,request_id:"job-one"});
 assert.match(g.nodes.get("ios-data-recipient").textContent,/Anthropic/);g.cancel();await assert.rejects(action,e=>e.status===409);assert.equal(calls.length,2,"Restored worktree cannot bypass consent");
 action=g.box.api("POST","/v1/agent-connections",{action:"start",agent:"claude",reopen:true});g.cancel();await assert.rejects(action,e=>e.status===409);assert.equal(calls.length,2,"Account changes cannot reopen Chat without permission");
 for(const setup of ["install","version","login"]){action=g.box.api("POST","/v1/ios/agents",{agent:"gemini",action:setup,project_id:scope});assert.match(g.nodes.get("ios-data-description").textContent,/terminal/);g.cancel();await assert.rejects(action,e=>e.status===409);assert.equal(calls.length,2,"iOS setup PTYs require explicit terminal permission: "+setup);}


 action=g.box.api("POST","/v1/sessions",{agent:"shell",project_id:scope});g.cancel();await assert.rejects(action,e=>e.status===409);assert.equal(calls.length,2,"Declining terminal disclosure does not start a process");
 g.box.findSession=()=>({agent:"codex",mode:"terminal",project:{id:scope},options:{}});
 action=g.box.api("POST","/v1/sessions",{agent:"codex",mode:"terminal",project_id:scope});assert.match(g.nodes.get("ios-data-description").textContent,/terminal/);g.allow();await action;
 for(const data of ["p","w","d","\r"]){await g.box.api("POST","/v1/sessions/session-one/input",{data});assert.equal(g.nodes.get("ios-data-consent").open,false,"Raw terminal characters reuse the exact current terminal grant");}
 assert.equal(calls.length,7);


 // Native voice wrappers do not record/upload/read aloud before explicit grant.
 const n=fixture();for(const file of ["speech-text.js","native.js"])vm.runInContext(fs.readFileSync(resources+file,"utf8"),n.box);
 const native=n.window.Bibimer;native.startVoiceInput("voice-one","{}");assert.equal(n.posts.length,0);n.cancel();await new Promise(setImmediate);assert.equal(n.posts.length,0);assert.equal(n.results[0][1],"cancelled");
 native.startVoiceInput("voice-two","{}");native.cancelVoiceInput("voice-two");await new Promise(setImmediate);assert.ok(!n.posts.some(p=>p.action==="voiceStart"));
 native.startVoiceInput("voice-three","{}");n.allow();await new Promise(setImmediate);assert.equal(n.posts.at(-1).action,"voiceStart");
 native.setSpeechContext("context-one");native.readSpeechOutput("context-one","private answer");assert.notEqual(n.posts.at(-1).action,"speechRead");n.cancel();await new Promise(setImmediate);assert.ok(!n.posts.some(p=>p.action==="speechRead"));
 native.readSpeechOutput("context-one","private answer");native.stopSpeechOutput();await new Promise(setImmediate);assert.ok(!n.posts.some(p=>p.action==="speechRead"));
 native.readSpeechOutput("context-one","private answer");n.allow();await new Promise(setImmediate);assert.equal(n.posts.at(-1).action,"speechRead");
 n.nodes.get("ios-data-revoke").click();assert.equal(n.posts.at(-1).action,"speechStop");assert.ok(n.posts.some(p=>p.action==="voiceCancel"&&p.id==="voice-three"),"Revocation cancels active speech/audio transfer without stopping agent sessions");
 native.speechKeyAction("elevenlabs","edit","{}");native.readSpeechOutput("context-one","another answer");assert.equal(n.nodes.get("ios-data-consent").open,true,"Changing a provider key invalidates existing grants");n.cancel();await new Promise(setImmediate);
 console.log("PASS iOS data consent: ten locales; explicit grant; cancellation sends nothing; stale target/account revocation; uncertain CLI recipients; terminal disclosure; voice/TTS cancellation and key rotation");
})().catch(e=>{console.error(e);process.exitCode=1;});
