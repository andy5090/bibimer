"use strict";
const fs=require("node:fs"),vm=require("node:vm"),assert=require("node:assert/strict");
const posts=[],defaults={localRuntime:{state:"connected"}};
const context=vm.createContext({crypto:require("node:crypto").webcrypto,
 window:{__bibimerEnvironment:defaults,webkit:{messageHandlers:{bibimer:{postMessage:value=>posts.push(value)}}},addEventListener(){}}});
vm.runInContext(fs.readFileSync("ios/app/Resources/native.js","utf8"),context);
assert.equal(posts.length,0);
context.window.Bibimer.reconnect();assert.equal(posts.at(-1).action,"reconnect");
context.window.Bibimer.startQuickSetup();assert.equal(posts.at(-1).action,"reconnect");
assert.equal(posts.length,2,"Retry actions ask native code; they never pretend to start Linux in JavaScript");
const session={id:"same-session"},draft={text:"keep this draft",queue:["keep this queue"]};
const events=[];
Object.assign(context,{generation:7,retryTimer:13,session,draft,environment:()=>defaults,
 native:{cancelPoll:()=>events.push("cancel")},clearTimeout:()=>events.push("clear"),
 connected:value=>events.push(["connected",value]),notice:key=>events.push(["notice",key]),
 connect:async()=>events.push("health")});
const hook=fs.readFileSync("ios/app/Resources/ui-hooks.js","utf8").split('  permissionModes.gemini')[0];
vm.runInContext(hook,context);
(async()=>{
 for(const [state,error] of [["stopped","error_ios_runtime_stopped"],["restart-required","error_ios_runtime_start"]]){
  events.length=0;defaults.localRuntime.state=state;await context.connect();
  assert.equal(events.includes("health"),false);assert.deepEqual(events.at(-1),["notice",error]);
  assert.equal(context.session,session);assert.equal(context.draft,draft);
 }
 defaults.localRuntime.state="connecting";events.length=0;
 context.window.BibimerIOSRuntimeChanged();assert.deepEqual(events,[["connected",false],["notice","connection_initial"]]);
 defaults.localRuntime.state="connected";await context.connect();assert.equal(events.at(-1),"health");
 assert.equal(context.session,session);assert.equal(context.draft,draft);
 console.log("PASS iOS reconnect: native retry, terminal runtime guard, retained session/draft/queue and live health retry");
})().catch(error=>{console.error(error);process.exitCode=1;});
