"use strict";
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('android/app/src/main/assets/app.js','utf8');
const names = ['renderAppUpdates','compareBridgeVersions','renderBridgeUpdate'];
const functions = names.map(name => {
  const match = source.match(new RegExp('  function '+name+'\\([^]*?\\n  \\}'));
  assert.ok(match,name); return match[0];
}).join('\n');
const nodes = new Map(), handlers = new Map();
let env = {version:'0.19.1',appUpdate:{state:'available',showNotice:true},bundledBridgeVersion:'0.16.0'};
let checks=0,stores=0,dismisses=0,tab;
const context = vm.createContext({window:{},online:true,bridgeVersion:'0.15.0',demo:false,
  environment:()=>env,t:(key,values)=>key+(values?JSON.stringify(values):''),tab:value=>{tab=value;},
  native:{checkAppUpdate:()=>checks++,dismissAppUpdate:()=>dismisses++,openAppStore:()=>stores++},
  $:id=>{if(!nodes.has(id))nodes.set(id,{addEventListener:(type,callback)=>handlers.set(id+'/'+type,callback)});return nodes.get(id);}
});
vm.runInContext(functions,context);
vm.runInContext(source.slice(source.indexOf('  $("app-update-check").addEventListener'),source.indexOf('  window.BibimerAppUpdateStatus = renderAppUpdates;')+'  window.BibimerAppUpdateStatus = renderAppUpdates;'.length),context);
const node=id=>nodes.get(id);
context.renderAppUpdates();
assert.equal(stores,0,'rendering never opens Play');
assert.equal(node('app-update-banner').hidden,false);
assert.equal(node('app-update-card').hidden,false);
assert.match(node('app-update-version').textContent,/0.19.1/);
handlers.get('app-update-later/click')();assert.equal(dismisses,1);
env.appUpdate.showNotice=false;context.renderAppUpdates();assert.equal(node('app-update-banner').hidden,true);
for(const state of ['current','failed','store_failed','unavailable','idle','checking']){
 env.appUpdate={state,showNotice:true};context.renderAppUpdates();
 assert.equal(node('app-update-banner').hidden,true,state+' never pretends update available');
 assert.equal(node('app-update-check').disabled,state==='checking');
 if(state==='failed')assert.equal(node('app-update-status').textContent,'app_update_failed');
}
handlers.get('app-update-check/click')();assert.equal(checks,1);
handlers.get('app-update-open/click')();handlers.get('app-update-store/click')();assert.equal(stores,2,'only explicit actions open Play');
context.demo=true;context.renderAppUpdates();context.renderBridgeUpdate();
assert.equal(node('app-update-card').hidden,true);assert.equal(node('bridge-update-card').hidden,true);
for(const id of ['app-update-open','app-update-store','app-update-check','app-update-later','bridge-update-guide'])handlers.get(id+'/click')();
assert.equal(stores,2);assert.equal(checks,1);assert.equal(dismisses,1);assert.equal(tab,undefined);
context.demo=false;context.renderBridgeUpdate();
assert.equal(node('bridge-update-status').textContent,'bridge_update_available');
assert.equal(node('bridge-update-guide').hidden,false);
handlers.get('bridge-update-guide/click')();assert.equal(tab,'setup');
for(const [version,expected] of [['0.16.0','bridge_update_current'],['0.17.0','bridge_update_current'],['0.9.0','bridge_update_available'],['custom','bridge_update_unknown']]){
 context.bridgeVersion=version;context.renderBridgeUpdate();assert.equal(node('bridge-update-status').textContent,expected);
}
context.online=false;context.renderBridgeUpdate();assert.equal(node('bridge-update-status').textContent,'bridge_update_unknown');
assert.equal(node('bridge-update-guide').hidden,true);
context.native={};context.renderAppUpdates();assert.equal(node('app-update-card').hidden,true,'old host safely hidden');
const native=fs.readFileSync('android/app/src/main/java/app/bibimer/MainActivity.java','utf8');
assert.ok(native.includes('market://details?id=app.bibimer')&&native.includes('https://play.google.com/store/apps/details?id=app.bibimer'));
assert.ok(native.includes('.setPackage("com.android.vending")'));
console.log('Updates UI: explicit store actions only, state/error separation, later/demo/old host guards, installed version, numeric bridge requirement and setup guide passed');
