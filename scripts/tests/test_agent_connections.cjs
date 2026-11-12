"use strict";
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const assets=path.resolve(__dirname,'../../android/app/src/main/assets');
const source=fs.readFileSync(path.join(assets,'agent-connections.js'),'utf8');
const html=fs.readFileSync(path.join(assets,'index.html'),'utf8');
const native=fs.readFileSync(path.resolve(assets,'../java/app/bibimer/MainActivity.java'),'utf8');
assert.ok(native.includes('"agent-connections.js"'));
assert.ok(html.indexOf('src="agent-connections.js"')<html.indexOf('src="app.js"'));
assert.ok(/id="agent-connection-key"[^>]*type="password"[^>]*autocomplete="off"/.test(html));
assert.ok(/id="agent-connection-code"[^>]*type="password"[^>]*autocomplete="off"/.test(html));
const nodes=new Map();let ctx={online:true,supported:true,paused:false,demo:false,instance:'bridge-one',project:'project-one'};
const calls=[],terminals=[],links=[],sessions=[],updateCalls=[];let pendingResolve=null,sequence=0,slow=false;
class E{
 constructor(){this.value='';this.children=[];this.handlers={};this.open=false;this.hidden=false;this.disabled=false;this.dataset={};}
 addEventListener(name,f){this.handlers[name]=f;}
 replaceChildren(...items){this.children=items;this.value=items.find(n=>!n.disabled)?.value||'';}
 get options(){return this.children;}
 showModal(){this.open=true;}
 close(){this.open=false;this.handlers.close?.();}
}
const node=id=>{if(!nodes.has(id))nodes.set(id,new E());return nodes.get(id);};
const sandbox={window:{},document:{getElementById:node},URL,setTimeout:()=>1,clearTimeout(){},Option:class{constructor(name,value){this.textContent=name;this.value=value;this.disabled=false;}}};
vm.runInNewContext(source,sandbox);
const report=agent=>({agent,installed:true,state:'configured',login_methods:agent==='claude'?[{id:'claudeai',type:'oauth',name:'Claude',supported:true},{id:'console',type:'oauth',name:'Console',supported:true}]:agent==='gemini'?[{id:'google',type:'oauth',name:'Google',supported:true}]:[],providers:agent==='opencode'?[{id:'test',name:'Test <b>literal</b>',connected:true,methods:[{id:'0',type:'api',name:'API key',supported:true},{id:'1',type:'oauth',name:'Native form',supported:false}]}]:[]});
const request=async body=>{
 calls.push(JSON.parse(JSON.stringify(body)));
 if(slow)return new Promise(resolve=>pendingResolve=resolve);
 if(body.action==='terminal')return {session:{id:'login-session',project:{id:body.project_id},agent:'shell',mode:'terminal'}};
 if(body.action==='version')return {version:'1.2.3'};
 if(body.action==='start')return {job:{id:body.request_id,status:'saved'}};
 if(body.action==='poll')return {job:{id:body.id,status:'saved'}};
 if(body.action==='cancel')return {job:{id:body.id,status:'cancelled'}};
 return report(body.agent);
};
const controller=new sandbox.window.BibimerAgentConnections(k=>k,()=>ctx,request,{sync(){},uuid:()=>String(++sequence),link:url=>links.push(url),terminal:agent=>terminals.push(agent),session:async value=>sessions.push(value),updates:async body=>{
 updateCalls.push({...body});
 if(body.action==='check')return {plan:{id:'checked-plan',supported:true,available:true,blocked:false,current_version:'1.0.0',latest_version:'1.1.0'}};
 if(body.action==='start')return {job:{id:body.request_id,agent:body.agent,status:'installing',target_version:'1.1.0'}};
 if(body.action==='poll')return {job:{id:body.id,agent:body.agent,status:'succeeded',installed_version:'1.1.0'}};
 return {job:null};
}});
const el=id=>node('agent-connection-'+id);
(async()=>{
 await controller.open('opencode');assert.equal(terminals.length,0);assert.equal(calls.at(-1).action,'status');assert.equal(el('provider').value,'test');assert.equal(el('method').options[1].disabled,true);
 el('key').value='fictional-private-key';await controller.start();assert.equal(el('key').value,'');assert.equal(calls.at(-1).key,'fictional-private-key');assert.equal(controller.state.job.status,'saved');assert.equal(terminals.length,0);
 await controller.load('version');assert.equal(el('version').textContent,'connection_version');
 slow=true;const loading=controller.load();assert.equal(controller.state.busy,true);el('key').value='draft-private-key';ctx={...ctx,project:'project-two'};controller.update();assert.equal(controller.dialog.open,false);assert.equal(el('key').value,'');pendingResolve({agent:'opencode',installed:false,state:'signed_out',providers:[]});await loading;assert.equal(controller.state.report.installed,true,'late response must not replace prior context');slow=false;
 ctx={...ctx,path:'/worktree-one'};await controller.open('opencode');assert.equal(calls.at(-1).worktree_path,'/worktree-one');el('key').value='worktree-private-key';ctx={...ctx,path:'/worktree-two'};controller.update();assert.equal(el('key').value,'');assert.equal(controller.dialog.open,false);
 ctx={...ctx,supported:false};const before=calls.length;await controller.open('claude');assert.equal(calls.length,before);assert.equal(el('form').hidden,true);assert.equal(el('status').textContent,'connection_update_bridge');assert.equal(terminals.length,0);await controller.openTerminal();assert.deepEqual(terminals,[]);assert.equal(controller.state.error,'connection_update_bridge');
 ctx={...ctx,supported:true,loginUI:true,loginTerminal:true};
 for(const agent of ['codex','claude','opencode','gemini']){
  await controller.open(agent);assert.equal(el('form').hidden,false,agent+' has a primary account form');
  assert.ok(controller.choice()?.supported,agent+' offers a native login method');
  if(agent==='claude'){assert.deepEqual([...el('method').options].map(x=>x.value),['claudeai','console']);el('method').value='console';}
  if(agent==='gemini'){assert.equal(controller.choice().id,'google');assert.equal(el('terminal').hidden,true);}
  const before=terminals.length;await controller.start();assert.equal(calls.at(-1).action,'start');assert.equal(calls.at(-1).agent,agent);assert.equal(terminals.length,before,'account form never opens Termux');
 }
 await controller.open('gemini');controller.state.report.login_methods[0].supported=false;controller.methods();
 assert.equal(el('method').options[0].disabled,true);assert.equal(el('submit').disabled,true);assert.equal(el('terminal').hidden,true);assert.equal(el('fallback-hint').textContent,'connection_native_unavailable');
 ctx={...ctx,supported:true,loginTerminal:true};await controller.open('claude');
 assert.equal(el('terminal').textContent,'connection_terminal_in_app');assert.equal(el('terminal').disabled,false);
 await controller.openTerminal();assert.equal(calls.at(-1).action,'terminal');assert.equal(calls.at(-1).agent,'claude');assert.equal(calls.at(-1).worktree_path,'/worktree-two');assert.equal(sessions.length,1);assert.equal(controller.dialog.open,false);assert.equal(terminals.length,0);
 await controller.open('claude');slow=true;const opening=controller.openTerminal();const terminalId=calls.at(-1).request_id;
 await controller.openTerminal();assert.equal(calls.at(-1).request_id,terminalId,'busy double tap cannot launch twice');
 ctx={...ctx,project:'different-project'};controller.update();pendingResolve({session:{id:'stale-login'}});await opening;slow=false;assert.equal(sessions.length,1,'stale login result cannot switch project or session');
 ctx={...ctx,supported:true};await controller.open('codex');el('method').value='apiKey';el('key').value='clear-on-pause';controller.pause();assert.equal(el('key').value,'');
 controller.state.job={id:'one',status:'pending',url:'https://auth.example.test/login?private=state',instructions:'<b>literal</b>',code_required:true};controller.render();assert.equal(el('site').textContent,'https://auth.example.test');assert.equal(el('instructions').textContent,'<b>literal</b>');assert.equal(links.length,0);el('browser').handlers.click();assert.equal(links.length,1);
 controller.state.job.code_submitted=true;controller.render();assert.equal(el('code-form').hidden,true);await controller.poll();assert.equal(controller.state.job.status,'saved');assert.equal(el('site').textContent,'');
 ctx={...ctx,updates:true};await controller.open('claude');await controller.updates('check');
 assert.equal(el('updates').hidden,false);assert.equal(el('update-start').disabled,false);assert.equal(controller.state.version,'1.0.0');
 const beforeUpdate=updateCalls.length;controller.state.updatePlan.blocked=true;await controller.updates('start');assert.equal(updateCalls.length,beforeUpdate);controller.state.updatePlan.blocked=false;
 await controller.updates('start');assert.equal(updateCalls.at(-1).plan_id,'checked-plan');assert.ok(updateCalls.at(-1).request_id);assert.equal(el('submit').disabled,true);assert.equal(el('terminal').disabled,true);
 const requestsDuringUpdate=calls.length;await controller.start();assert.equal(calls.length,requestsDuringUpdate,'login cannot start during update');
 controller.pause();assert.equal(controller.state.updateJob.status,'installing','closing the UI does not cancel installation');
 await controller.updates('poll');assert.equal(controller.state.version,'1.1.0');assert.equal(controller.state.updatePlan,null);assert.equal(el('update-start').disabled,true);
 const updateRequest=controller.actions.updates;let updateResolve;
 controller.actions.updates=()=>new Promise(resolve=>updateResolve=resolve);
 const checking=controller.updates('check');ctx={...ctx,project:'changed-while-checking'};controller.update();updateResolve({plan:{id:'stale',available:true}});await checking;
 assert.equal(controller.state.updatePlan,null,'late update check cannot replace another project context');controller.actions.updates=updateRequest;
 ctx={...ctx,updates:false};
 ctx={...ctx,demo:true};const demoCalls=calls.length;await controller.open('opencode');el('terminal').handlers.click();assert.equal(calls.length,demoCalls);assert.deepEqual(terminals,[]);
 console.log('Agent connections: in-app status/key flow, explicit native/browser actions, masked and cleared secrets, unsupported forms/old bridge, pending completion and stale context guards passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
