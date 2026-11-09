'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('android/app/src/main/assets/app.js','utf8');
const nodes=new Map();
for(const id of ['app','terminal-fullscreen-toggle']) nodes.set(id,{hidden:false,attributes:{},classes:new Set(),listeners:{},classList:{toggle(name,on){on?nodes.get(id).classes.add(name):nodes.get(id).classes.delete(name);}},setAttribute(k,v){this.attributes[k]=v;},addEventListener(k,v){this.listeners[k]=v;}});
const ctx=vm.createContext({$:id=>nodes.get(id),online:true,currentTab:'work',session:{id:'one',mode:'terminal',kind:'terminal',state:'running'},instance:'a',project:'p',projectKey:()=>ctx.project,isChat:()=>ctx.session?.mode==='chat',terminalFullscreen:false,terminalFullscreenContext:'',t:k=>k,backUpdates:0,updateBackState:()=>ctx.backUpdates++,resizes:0,resize:()=>ctx.resizes++,setTimeout:fn=>fn()});
vm.runInContext(source.slice(source.indexOf('  function updateTerminalFullscreen()'),source.indexOf('  const keys = {escape:')),ctx);
ctx.updateTerminalFullscreen();
const toggle=nodes.get('terminal-fullscreen-toggle');
assert.equal(toggle.hidden,false);toggle.listeners.click();
assert.equal(ctx.terminalFullscreen,true);assert.equal(toggle.attributes['aria-label'],'terminal_fullscreen_exit');
assert.equal(nodes.get('app').classes.has('terminal-fullscreen'),true);
assert.equal(ctx.resizes,1);const session=ctx.session;
toggle.listeners.click();assert.equal(ctx.terminalFullscreen,false);assert.equal(ctx.session,session);
toggle.listeners.click();ctx.online=false;ctx.updateTerminalFullscreen();
assert.equal(ctx.terminalFullscreen,false,'Connection loss must reveal navigation');
assert.equal(nodes.get('app').classes.has('terminal-fullscreen'),false);
assert.equal(toggle.hidden,true,'Offline output cannot hide navigation again');
ctx.online=true;ctx.updateTerminalFullscreen();
for(const change of [()=>ctx.currentTab='settings',()=>ctx.session={id:'two',mode:'terminal'},()=>ctx.project='other',()=>ctx.instance='b',()=>ctx.session={id:'one',mode:'chat'},()=>ctx.session={id:'one',kind:'browser'}]){
 ctx.currentTab='work';ctx.session={id:'one',mode:'terminal',kind:'terminal'};ctx.project='p';ctx.instance='a';ctx.updateTerminalFullscreen();toggle.listeners.click();assert.equal(ctx.terminalFullscreen,true);
 change();ctx.updateTerminalFullscreen();assert.equal(ctx.terminalFullscreen,false);
}
ctx.currentTab='work';ctx.session={id:'one',mode:'terminal',state:'exited'};ctx.updateTerminalFullscreen();toggle.listeners.click();assert.equal(ctx.terminalFullscreen,true,'Ended terminal output can still be expanded');
assert.equal(toggle.attributes['data-i18n-aria-label'],'terminal_fullscreen_exit');
const back=source.slice(source.indexOf('  window.BibimerBack = () => {'),source.indexOf('  const backObserver ='));
ctx.window={};ctx.document={querySelectorAll:()=>[],querySelector:()=>null};ctx.commands={dismiss(){}};nodes.set('commands',{hidden:true});ctx.native={setBackHandling:value=>ctx.backEnabled=value};
vm.runInContext(back,ctx);ctx.updateBackState();assert.equal(ctx.backEnabled,true);
for(let i=0;i<2;i++) { assert.equal(ctx.window.BibimerBack(),true);assert.equal(ctx.terminalFullscreen,true);assert.equal(ctx.backEnabled,true); }
let closed=false;ctx.document.querySelectorAll=()=>[{id:'test-dialog',close(){closed=true;}}];
assert.equal(ctx.window.BibimerBack(),true);assert.equal(closed,true);assert.equal(ctx.terminalFullscreen,true);
ctx.document.querySelectorAll=()=>[];
nodes.get('commands').hidden=false;ctx.commands.dismiss=()=>{nodes.get('commands').hidden=true;};
assert.equal(ctx.window.BibimerBack(),true);assert.equal(nodes.get('commands').hidden,true);assert.equal(ctx.terminalFullscreen,true);
toggle.listeners.click();assert.equal(ctx.terminalFullscreen,false);assert.equal(ctx.backEnabled,false);assert.equal(ctx.window.BibimerBack(),false);
console.log('PASS fullscreen toggle/restore, resize, ended output, context reset, Android Back preserves fullscreen while dismissing overlays, and session preservation');
