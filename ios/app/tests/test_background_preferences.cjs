"use strict";
const fs=require("node:fs"),vm=require("node:vm"),assert=require("node:assert/strict");
const source=fs.readFileSync("ios/app/Resources/ui-hooks.js","utf8");
const start=source.indexOf("  // Background settings only report native state;");
const hook=source.slice(start,source.indexOf("  if (!permissionModes.codex",start));
const controls=new Map(),calls=[],state={enabled:true,supported:true,state:"ready"};
const $=id=>{if(!controls.has(id))controls.set(id,{dataset:{},addEventListener(name,fn){this[name]=fn;}});return controls.get(id);};
const window={};
vm.runInNewContext(hook,{$,window,environment:()=>({backgroundWork:state}),t:key=>key,native:{setBackgroundWork:value=>calls.push(value)}});
assert.deepEqual(calls,[],"Displaying background status never requests background execution");
assert.equal($("ios-background-enabled").checked,true);assert.equal($("ios-background-enabled").disabled,false);
for(const value of ["off","unsupported","ready","pending","running","completed","waiting","ended","expired","unavailable","failed"]){
 state.state=value;window.BibimerBackgroundChanged();assert.equal($("ios-background-status").textContent,"ios_background_"+value);
 assert.equal($("ios-background-status").dataset.i18n,"ios_background_"+value);
}
state.state="unknown";state.supported=false;window.BibimerBackgroundChanged();
assert.equal($("ios-background-enabled").disabled,true);assert.equal($("ios-background-status").textContent,"ios_background_unsupported");
state.supported=true;window.BibimerBackgroundChanged();$("ios-background-enabled").checked=false;$("ios-background-enabled").change();assert.deepEqual(calls,[false]);
console.log("PASS background settings: read-only status, all system states, explicit boolean changes, disabled unsupported devices");
