"use strict";
const fs=require("node:fs"),vm=require("node:vm"),assert=require("node:assert/strict");
const posts=[],defaults={localRuntime:{state:"connected",foreground:true,busy:false}};
const context=vm.createContext({crypto:require("node:crypto").webcrypto,
 window:{__bibimerEnvironment:defaults,webkit:{messageHandlers:{bibimer:{postMessage:value=>posts.push(value)}}},addEventListener(){}}});
vm.runInContext(fs.readFileSync("ios/app/Resources/native.js","utf8"),context);
assert.equal(posts.length,0);
context.window.Bibimer.reconnect();assert.equal(posts.at(-1).action,"reconnect");
context.window.Bibimer.startQuickSetup();assert.equal(posts.at(-1).action,"reconnect");
assert.equal(posts.length,2,"Retry actions ask native code; they never pretend to start Linux in JavaScript");
context.window.Bibimer.copyConnectionDiagnostics();
assert.deepEqual({...posts.at(-1)},{action:"connectionDiagnostics"},"Diagnostics need no backend request, credentials or session data");
const session={id:"same-session"},draft={text:"keep this draft",queue:["keep this queue"]};
const events=[];
const controls=new Map(),timers=new Map();let timerSerial=0;
const $=id=>{
 if(!controls.has(id))controls.set(id,{dataset:{},attributes:{},textContent:"",disabled:false,
  addEventListener(){},querySelector(){return null;},setAttribute(key,value){this.attributes[key]=value;}});
 return controls.get(id);
};
Object.assign(context,{generation:7,retryTimer:13,online:false,paused:true,session,draft,environment:()=>defaults,
 native:{cancelPoll:()=>events.push("cancel")},clearTimeout:()=>events.push("clear"),
 setTimeout:fn=>{const id=++timerSerial;timers.set(id,fn);return id;},t:key=>key,$,
 connected:value=>events.push(["connected",value]),notice:key=>events.push(["notice",key]),
 connect:async()=>events.push("health")});
context.window.BibimerPause=()=>events.push("pause");
context.window.BibimerResume=()=>events.push("resume");
const hook=fs.readFileSync("ios/app/Resources/ui-hooks.js","utf8").split('  permissionModes.gemini')[0];
vm.runInContext(hook,context);
(async()=>{
 context.window.BibimerPause();
 assert.deepEqual(events,["pause","cancel",["connected",false]],"Backgrounding pauses JavaScript, cancels the old native event poll, and disables stale online controls");
 assert.equal(context.session,session);assert.equal(context.draft,draft);
 defaults.localRuntime.foreground=false;context.paused=true;
 context.window.BibimerIOSRuntimeChanged();
 assert.equal(context.paused,true,"A background runtime event must not reactivate the UI");
 defaults.localRuntime.foreground=true;
 for(const [state,error] of [["stopped","error_ios_runtime_stopped"],["restart-required","error_ios_runtime_start"],["recovery-failed","error_ios_runtime_recovery"],["restarting","ios_runtime_restarting"]]){
  events.length=0;defaults.localRuntime.state=state;await context.connect();
  assert.equal(events.includes("health"),false);assert.deepEqual(events.at(-1),["notice",error]);
  assert.equal(context.paused,false,"Failed recovery must keep foreground reconnect controls usable");
  assert.equal(context.session,session);assert.equal(context.draft,draft);
 }
 defaults.localRuntime.state="connecting";events.length=0;
 const beforeReconnect=context.generation;
 context.window.BibimerIOSRuntimeChanged();assert.deepEqual(events,["clear","cancel",["connected",false],["notice","connection_initial"]]);
 assert.equal(context.generation,beforeReconnect+1,"A new native recovery invalidates replies and timers from the prior connection");
 defaults.localRuntime.state="connected";await context.connect();assert.equal(events.at(-1),"health");
 assert.equal(context.session,session);assert.equal(context.draft,draft);
 // The actual native shim acknowledges synchronously, before any native event.
 context.window.Bibimer.reconnect();
 assert.equal($("ios-reconnect-status").textContent,"ios_connection_checking");
 assert.equal($("ios-recovery-progress").hidden,false,"Progress is visible outside the Settings page");
 assert.equal($("ios-recovery-title").textContent,"ios_connection_checking");
 for(const id of ["reconnect","reconnect-welcome","reconnect-settings"]){
  assert.equal($(id).disabled,true);assert.equal($(id).attributes["aria-busy"],"true");
 }
 defaults.localRuntime={state:"connecting",foreground:true,busy:true};
 context.window.BibimerIOSRuntimeChanged();
 assert.equal($("ios-reconnect-status").textContent,"ios_connection_checking");
 defaults.localRuntime={state:"restarting",foreground:true,busy:true};
 context.window.BibimerIOSRuntimeChanged();
 assert.equal($("ios-reconnect-status").textContent,"ios_runtime_restarting");
 assert.equal($("reconnect-settings").textContent,"ios_connection_restarting");
 assert.equal($("ios-recovery-title").textContent,"ios_recovery_active");
 assert.equal($("ios-recovery-spinner").hidden,false);
 for(const [phase,key] of [["stopping","ios_recovery_stopping"],["starting","ios_recovery_starting"]]){
  defaults.localRuntime.phase=phase;
  context.window.BibimerIOSRuntimeChanged();
  assert.equal($("ios-recovery-detail").textContent,key);
  assert.equal($("ios-reconnect-status").textContent,key);
  assert.equal($("ios-recovery-progress").hidden,false);
  assert.equal($("ios-recovery-progress").attributes["aria-busy"],"true");
 }
 defaults.localRuntime={state:"recovery-failed",foreground:true,busy:false};
 context.window.BibimerIOSRuntimeChanged();
 assert.equal($("ios-reconnect-status").textContent,"error_ios_runtime_recovery");
 assert.equal($("reconnect-settings").disabled,false,"Failure allows a new manual attempt");
 assert.equal($("ios-recovery-title").textContent,"ios_recovery_failed");
 assert.equal($("ios-recovery-progress").hidden,false);
 assert.equal($("ios-recovery-spinner").hidden,true,"A failed operation must not keep spinning");
 defaults.localRuntime={state:"connected",foreground:true,busy:false};
 context.window.BibimerResume();
 assert.equal($("ios-reconnect-status").textContent,"ios_connection_restored");
 assert.equal($("reconnect-settings").disabled,false);
 assert.equal($("reconnect-settings").attributes["aria-busy"],"false");
 assert.equal($("ios-recovery-progress").hidden,true,"Completed recovery releases the workspace banner");
 // Even a rejected/lost native message leaves visible feedback and a retry.
 defaults.localRuntime={state:"connecting",foreground:true,busy:true};
 context.window.Bibimer.reconnect();timers.get(timerSerial)();
 assert.equal($("ios-reconnect-status").textContent,"ios_reconnect_unconfirmed");
 assert.equal($("reconnect-settings").disabled,false);
 assert.equal(context.session,session);assert.equal(context.draft,draft);
 console.log("PASS iOS reconnect: native retry, terminal runtime guard, retained session/draft/queue and live health retry");
})().catch(error=>{console.error(error);process.exitCode=1;});
