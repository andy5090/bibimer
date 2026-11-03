'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('android/app/src/main/assets/inspector.js','utf8');
const elements=new Map();
for(const id of ['git-actions','git-action-form','git-message','git-all','git-action-status','git-action-cancel','git-state-refresh','git-action-target','git-action-explanation','git-action-confirm','git-commit-fields', 'commit','push','pull','sync']) elements.set(id,{hidden:false,disabled:false,value:'',checked:false,textContent:'',dataset:{},listeners:{},addEventListener(k,fn){this.listeners[k]=fn;},focus(){this.focused=true;}});
const buttons=['commit','push','pull','sync'].map(id=>elements.get(id));buttons.forEach((b,i)=>b.dataset.gitAction=['commit','push','pull','sync'][i]);
elements.get('git-actions').querySelectorAll=()=>buttons;
const timers=[];let ctx,calls,refreshes,behavior,finish;
const env=vm.createContext({document:{getElementById:id=>elements.get(id)},crypto:{randomUUID:()=> 'same-request'},setTimeout:fn=>timers.push(fn)});
vm.runInContext(source.slice(source.indexOf('class BibimerGitActions'))+'\nglobalThis.Controller=BibimerGitActions;',env);
const flush=async()=>{for(let i=0;i<10;i++)await Promise.resolve();};
const state={branch:'main',head:'head',upstream:'origin/main',busy:false};
function setup(){ctx={instance:'bridge',project:'p',path:'/p',online:true,gitSupported:true,demo:false};calls=[];refreshes=0;timers.length=0;behavior=null;
 const ui=new env.Controller(k=>k,()=>ctx,async data=>{calls.push(data);if(behavior)return behavior(data);return data.action==='state'?state:{state:'succeeded',action:data.action};},()=>refreshes++);
 ui.update(true);return ui;
}
(async()=>{
 let ui=setup();await flush();assert.equal(calls.length,1,'Viewing only reads state');
 assert.equal(buttons[0].disabled,false);buttons[0].listeners.click();assert.equal(calls.length,1,'Selecting Commit does not mutate');
 elements.get('git-message').value='My commit';elements.get('git-message').listeners.input();
 await ui.start();await flush();const submitted=calls.find(x=>x.action==='commit');
 assert.equal(submitted.message,'My commit');assert.equal(submitted.all_changes,false);assert.equal(submitted.expected_branch,'main');assert.equal(submitted.expected_head,'head');
 assert.equal(ui.entry.message,'');assert.equal(refreshes,1);
 ui=setup();await flush();buttons[1].listeners.click();
 behavior=data=>data.action==='push'?new Promise(resolve=>finish=resolve):state;const pending=ui.start();await ui.start();assert.equal(calls.filter(x=>x.action==='push').length,1,'Duplicate clicks do not duplicate writes');
 const old=ui.entry;ctx={...ctx,project:'other',path:'/other'};ui.update(true);finish({state:'succeeded',action:'push'});await pending;assert.equal(ui.entry.message,'');assert.notEqual(ui.entry,old);assert.equal(refreshes,0,'Old result cannot refresh current workspace');
 ui=setup();await flush();buttons[2].listeners.click();ctx={...ctx,path:'/changed'};await ui.start();assert.equal(calls.length,1,'Stale target cannot execute');
 ui=setup();await flush();buttons[3].listeners.click();
 behavior=async data=>{if(data.action==='sync')throw {};if(data.action==='job')return {state:'running',phase:'pull',action:'sync'};return state;};
 await ui.start();assert.equal(calls.filter(x=>x.action==='sync').length,1);assert.equal(calls.at(-1).action,'job');assert.equal(ui.entry.busy,true);assert.equal(timers.length,1);
 behavior=async data=>data.action==='job'?{state:'failed',phase:'pull',action:'sync',error:'git_failed'}:state;
 await timers.shift()();await flush();assert.equal(ui.entry.busy,false);assert.equal(ui.entry.error,'git_failed','Operation failure remains visible after refreshing state');
 ui=setup();await flush();buttons[0].listeners.click();ui.entry.message='draft';behavior=async()=>{throw {};};await ui.start();assert.equal(ui.entry.error,'git_unknown');assert.equal(ui.entry.busy,true);assert.equal(ui.entry.message,'draft');assert.equal(calls.filter(x=>x.action==='commit').length,1,'Uncertain writes are never resubmitted');
 for(const change of [()=>ctx.gitSupported=false,()=>ctx.demo=true,()=>ctx.online=false]){ui=setup();await flush();change();ui.update(true);buttons[1].listeners.click();await ui.start();assert.equal(calls.filter(x=>x.action==='push').length,0);assert.equal(buttons[1].disabled,true);}
 console.log('PASS Git actions: explicit confirmation, staged-only default, stable target, duplicate guard, project isolation, uncertain-result lookup, preserved drafts and feature gating');
})().catch(error=>{console.error(error);process.exitCode=1;});
