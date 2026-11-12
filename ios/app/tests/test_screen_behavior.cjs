"use strict";
const fs=require("node:fs"),vm=require("node:vm"),assert=require("node:assert/strict");
const posts=[],defaults={};
const window={__bibimerEnvironment:defaults,webkit:{messageHandlers:{bibimer:{postMessage:value=>posts.push(value)}}},addEventListener(){}};
vm.runInNewContext(fs.readFileSync("ios/app/Resources/native.js","utf8"),{window,crypto:require("node:crypto").webcrypto});
assert.equal(posts.length,0,"Loading never changes screen or system gesture settings");
for(const [key,value] of [["keepAwake",true],["deferHomeGesture",true],["keepAwake",false]]){
 assert.equal(window.Bibimer.setScreenBehavior(key,value),true);
 assert.equal(defaults.screenBehavior[key],value);
 assert.deepEqual({...posts.at(-1)},{action:"screenPreference",key,value});
}
const count=posts.length;
for(const [key,value] of [["unexpected",true],["keepAwake",1],["keepAwake","true"],["deferHomeGesture",null]])assert.equal(window.Bibimer.setScreenBehavior(key,value),false);
assert.equal(posts.length,count);
const source=fs.readFileSync("ios/app/Resources/ui-hooks.js","utf8");
const hook=source.slice(source.indexOf('  for (const [id,key] of [["ios-keep-awake"'),source.indexOf('  permissionModes.gemini'));
for(const supported of [true,false]){
 const controls=new Map(),changes=[];
 const $=id=>{if(!controls.has(id))controls.set(id,{addEventListener(name,fn){this[name]=fn;}});return controls.get(id);};
 vm.runInNewContext(hook,{$,environment:()=>({screenBehavior:{keepAwake:true,deferHomeGesture:false,supported}}),native:{setScreenBehavior:(...args)=>changes.push(args)}});
 assert.equal($("ios-keep-awake").checked,true);assert.equal($("ios-defer-home").checked,false);
 assert.equal($("ios-keep-awake").disabled,!supported);assert.equal($("ios-defer-home").disabled,!supported);
 $("ios-defer-home").checked=true;$("ios-defer-home").change();assert.deepEqual(changes,[["deferHomeGesture",true]]);
}
const locales=JSON.parse(fs.readFileSync("ios/app/Resources/ios-locales.json","utf8"));
assert.equal(Object.keys(locales).length,10);
for(const strings of Object.values(locales)){assert.equal(strings.length,39);assert.ok(strings.every(value=>typeof value==="string" && value.trim()));}
console.log("PASS iOS screen preferences: explicit boolean actions, independent settings, restored switches, desktop disabled, ten locales");
