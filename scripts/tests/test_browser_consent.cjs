'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const elements=new Map();
for(const id of ['browser-consent','browser-consent-allow','browser-consent-view','browser-consent-error']) elements.set(id,{hidden:true,disabled:false,textContent:'',listeners:{},addEventListener(k,fn){this.listeners[k]=fn;}});
const box=vm.createContext({document:{getElementById:id=>elements.get(id)}});
vm.runInContext(fs.readFileSync('android/app/src/main/assets/browser-consent.js','utf8')+'\nglobalThis.Controller=BibimerBrowserConsent;',box);
let ctx,calls,opens,changed,pending;
function browser(id='b1',project='p1',launch='launch-one'){return {id,project:{id:project},launch_id:launch,browser_tag:'bibimer-'+id,kind:'browser',state:'running',browser_manual:true};}
function setup(){ctx={instance:'bridge-one',project:'p1',path:'/project',tab:'work',online:true,enabled:true,paused:false,switching:false,sessions:[browser()]};calls=[];opens=[];changed=[];pending=null;
 return new box.Controller(k=>k,()=>ctx,async data=>{calls.push(data);if(pending)return pending;return {session:{...ctx.sessions[0],browser_manual:false}};},row=>{changed.push(row);ctx.sessions=ctx.sessions.map(old=>old.id===row.id?row:old);},tag=>opens.push(tag));}
(async()=>{
 let ui=setup();ui.render();assert.equal(elements.get('browser-consent').hidden,false);assert.equal(calls.length,0,'Showing a request never grants consent');
 await ui.act('unknown');assert.equal(calls.length,0);
 await ui.act('view');assert.equal(opens.length,1);assert.equal(calls.length,0);assert.equal(ctx.sessions[0].browser_manual,true);
 await ui.act('allow');assert.equal(calls.length,1);assert.equal(calls[0].project_id,'p1');assert.equal(calls[0].session_id,'b1');assert.equal(calls[0].launch_id,'launch-one');assert.equal(calls[0].worktree_path,'/project');assert.equal(ctx.sessions[0].browser_manual,false);assert.equal(elements.get('browser-consent').hidden,true);
 for(const change of [()=>ctx.enabled=false,()=>ctx.online=false,()=>ctx.paused=true,()=>ctx.switching=true,()=>ctx.tab='settings',()=>ctx.sessions[0].browser_manual=false,()=>ctx.sessions[0].state='exited',()=>ctx.sessions[0].project.id='p2',()=>ctx.sessions[0].launch_id=null]){ui=setup();change();ui.render();assert.equal(elements.get('browser-consent').hidden,true);await ui.act('allow');assert.equal(calls.length,0);}
 ui=setup();ui.render();ctx.project='p2';ctx.sessions=[browser('b2','p2')];await ui.act('allow');assert.equal(calls.length,0,'An old card cannot approve a new project');
 ui=setup();ui.render();ctx.sessions=[browser('b1','p1','new-launch')];await ui.act('allow');assert.equal(calls.length,0,'Old consent cannot apply to a reopened browser');
 ui=setup();ui.render();let finish;pending=new Promise(resolve=>finish=resolve);const one=ui.act('allow');assert.equal(elements.get('browser-consent-allow').disabled,true);await ui.act('allow');assert.equal(calls.length,1);const old=ctx.sessions[0];ctx.project='p2';ctx.sessions=[browser('b2','p2')];ui.render();finish({session:{...old,browser_manual:false}});await one;assert.equal(ctx.sessions[0].id,'b2');assert.equal(ctx.sessions[0].browser_manual,true);assert.equal(elements.get('browser-consent').hidden,false);
 ui=setup();ui.render();pending=Promise.reject({key:'error_browser_start'});await ui.act('allow');assert.equal(calls.length,1);assert.equal(ctx.sessions[0].browser_manual,true);assert.equal(elements.get('browser-consent-error').textContent,'error_browser_start');assert.equal(elements.get('browser-consent-allow').disabled,false);
 ui=setup();ui.render();pending=Promise.resolve({session:{...browser(),launch_id:'other',browser_manual:false}});await ui.act('allow');assert.equal(changed.length,0,'Mismatched response must not mark current browser allowed');assert.equal(elements.get('browser-consent').hidden,false);
 ui=setup();ui.render();pending=Promise.resolve({session:{...browser(),browser_manual:false}});ctx.instance='new-bridge';await ui.act('allow');assert.equal(calls.length,0,'Stale bridge card requires a new click');
 console.log('PASS browser consent: explicit-only grant, view-only action, project/run/bridge guards, duplicate suppression, failure retention and no cross-project approval');
})().catch(e=>{console.error(e);process.exitCode=1;});
