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
const timers=new Map();let timerSerial=0;
const nodes=new Map();let ctx={online:true,supported:true,paused:false,demo:false,instance:'bridge-one',project:'project-one'};
const calls=[],terminals=[],links=[],sessions=[],updateCalls=[];let pendingResolve=null,sequence=0,slow=false,startJob=null,pollJob=null;
class E{
 constructor(){this.value='';this.children=[];this.handlers={};this.open=false;this.hidden=false;this.disabled=false;this.dataset={};}
 addEventListener(name,f){this.handlers[name]=f;}
 append(...items){this.children.push(...items);}
 replaceChildren(...items){this.children=items;this.value=items.find(n=>!n.disabled)?.value||'';}
 get options(){return this.children;}
 showModal(){this.open=true;}
 close(){this.open=false;this.handlers.close?.();}
}
const node=id=>{if(!nodes.has(id))nodes.set(id,new E());return nodes.get(id);};
const sandbox={window:{},document:{getElementById:node,createElement:()=>new E()},URL,setTimeout:fn=>{const id=++timerSerial;timers.set(id,fn);return id;},clearTimeout:id=>timers.delete(id),Option:class{constructor(name,value){this.textContent=name;this.value=value;this.disabled=false;}}};
vm.runInNewContext(source,sandbox);
const report=agent=>({agent,installed:true,state:'configured',login_methods:agent==='claude'?[{id:'claudeai',type:'oauth',name:'Claude',supported:true},{id:'console',type:'oauth',name:'Console',supported:true}]:agent==='gemini'?[{id:'google',type:'oauth',name:'Google',supported:true}]:[],providers:agent==='opencode'?[{id:'test',name:'Test <b>literal</b>',connected:true,methods:[{id:'0',type:'api',name:'API key',supported:true},{id:'1',type:'oauth',name:'Native form',supported:false}]}]:[]});
const request=async body=>{
 calls.push(JSON.parse(JSON.stringify(body)));
 if(slow)return new Promise(resolve=>pendingResolve=resolve);
 if(body.action==='terminal')return {session:{id:'login-session',project:{id:body.project_id},agent:'shell',mode:'terminal'}};
 if(body.action==='version')return {version:'1.2.3'};
 if(body.action==='start')return {job:startJob||{id:body.request_id,status:'saved'}};
 if(body.action==='poll')return {job:pollJob||{id:body.id,status:'saved'}};
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
 await controller.open('claude');const beforeAuto=links.length;
 startJob={id:'explicit-login',status:'pending'};
 pollJob={id:'explicit-login',status:'pending',url:'https://claude.ai/oauth/authorize?state=fake'};
 await controller.start();await Promise.resolve();await Promise.resolve();
 assert.equal(links.length,beforeAuto+1,'explicit login opens a delayed URL once');
 await controller.poll();controller.render();assert.equal(links.length,beforeAuto+1,'poll and rerender do not reopen the browser');
 controller.pause();controller.state.browserOpened=false;await controller.poll();assert.equal(links.length,beforeAuto+1,'closing or pausing disarms automatic opening');
 el('browser').handlers.click();assert.equal(links.length,beforeAuto+2,'manual retry remains available');
 controller.state.job=null;await controller.load();
 startJob={id:'closed-login',status:'pending'};pollJob={id:'closed-login',status:'pending'};
 await controller.start();await Promise.resolve();await Promise.resolve();
 controller.dialog.close();pollJob={id:'closed-login',status:'pending',url:'https://claude.ai/oauth/authorize?state=late'};
 await controller.open('claude');assert.equal(links.length,beforeAuto+2,'reopening an existing job never opens a browser automatically');
 controller.state.job=null;startJob=pollJob=null;
 ctx={...ctx,updates:true};await controller.open('claude');await controller.updates('check');
 assert.equal(el('updates').hidden,false);assert.equal(el('update-start').disabled,false);assert.equal(controller.state.version,'1.0.0');
 controller.state.updatePlan.blocked=true;controller.state.updatePlan.blocked_reason='sessions';controller.state.updatePlan.active_session_count=1;controller.render();
 assert.equal(el('update-start').disabled,true);assert.equal(el('update-status').textContent,'agent_update_blocked_sessions');
 const ordinaryUpdates=controller.actions.updates;
 controller.actions.updates=async body=>body.action==='status'?{job:null,plan:{...controller.state.updatePlan,blocked:false,blocked_reason:null,active_session_count:0}}:ordinaryUpdates(body);
 const refresh=timers.get(controller.updateTimer);assert.equal(typeof refresh,'function');refresh();await new Promise(setImmediate);
 assert.equal(el('update-start').disabled,false,'a lightweight status timer unblocks an ended session without another version check');
 controller.actions.updates=ordinaryUpdates;
 const beforeUpdate=updateCalls.length;controller.state.updatePlan.blocked=true;await controller.updates('start');assert.equal(updateCalls.length,beforeUpdate);controller.state.updatePlan.blocked=false;
 let finishStatus;
 controller.actions.updates=body=>body.action==='status'?new Promise(resolve=>finishStatus=resolve):ordinaryUpdates(body);
 const statusInFlight=controller.updates('status');assert.equal(el('update-start').disabled,false,'background status checks do not disable the action');
 await controller.updates('start');assert.equal(updateCalls.at(-1).plan_id,'checked-plan');assert.ok(updateCalls.at(-1).request_id);assert.equal(el('submit').disabled,true);assert.equal(el('terminal').disabled,true);
 finishStatus({job:null,plan:{id:'checked-plan',available:true,blocked:false,current_version:'1.0.0'}});await statusInFlight;
 assert.equal(controller.state.updateJob.status,'installing','an older status response cannot overwrite a started installation');controller.actions.updates=ordinaryUpdates;
 const requestsDuringUpdate=calls.length;await controller.start();assert.equal(calls.length,requestsDuringUpdate,'login cannot start during update');
 controller.pause();assert.equal(controller.state.updateJob.status,'installing','closing the UI does not cancel installation');
 await controller.updates('poll');assert.equal(controller.state.version,'1.1.0');assert.equal(controller.state.updatePlan,null);assert.equal(el('update-start').disabled,true);
 await controller.updates('check');controller.actions.updates=async()=>({job:null,plan:null,expired:true});await controller.updates('status');
 assert.equal(controller.state.updatePlan,null);assert.equal(el('update-start').disabled,true);assert.equal(el('update-status').textContent,'error_agent_update_expired');controller.actions.updates=ordinaryUpdates;
 const updateRequest=controller.actions.updates;let updateResolve;
 controller.actions.updates=()=>new Promise(resolve=>updateResolve=resolve);
 const checking=controller.updates('check');ctx={...ctx,project:'changed-while-checking'};controller.update();updateResolve({plan:{id:'stale',available:true}});await checking;
 assert.equal(controller.state.updatePlan,null,'late update check cannot replace another project context');controller.actions.updates=updateRequest;
 ctx={...ctx,maintenance:true,updates:true,project:'maintenance-project'};
 await controller.open('claude');await controller.updates('check');
 const maintenanceCalls=[],review={id:'review-one',instance:ctx.instance,targets:[{id:'session-one',agent:'claude',title:'Saved Claude',project:{name:'Project',path:'/work/project'},archived:true}]};
 const restoreUpdates=controller.actions.updates,restoreRequest=controller.request;
 controller.actions.updates=async body=>{maintenanceCalls.push({...body});
  if(body.action==='prepare')return {confirmation:review};
  if(body.action==='start')return {job:{id:body.request_id,status:'waiting',agent:'claude',recovery:{total:1,reopen:body.reopen,restored:0,rows:[]}}};
  return {job:null};
 };
 controller.state.updatePlan.blocked=true;controller.state.updatePlan.blocked_reason='sessions';controller.render();assert.equal(el('update-start').disabled,false,'reviewed maintenance is offered for live sessions');
 await controller.beginOperation('update');assert.equal(controller.operationDialog.open,true);assert.equal(maintenanceCalls.at(-1).action,'prepare');assert.equal(maintenanceCalls.some(body=>body.action==='start'),false,'preview never installs or ends sessions');
 controller.o('cancel').handlers.click();assert.equal(controller.state.operation,null);assert.equal(maintenanceCalls.some(body=>body.action==='start'),false);
 await controller.beginOperation('update');assert.equal(controller.o('reopen').checked,true,'reopen defaults on');
 controller.o('reopen').checked=false;controller.o('reopen').handlers.change();controller.render();assert.equal(controller.o('reopen').checked,false,'rerenders preserve the explicit reopen choice');
 await controller.confirmOperation();assert.equal(maintenanceCalls.at(-1).confirmation_id,'review-one');assert.equal(maintenanceCalls.at(-1).reopen,false);assert.equal(controller.state.updateJob.status,'waiting');assert.equal(controller.operationDialog.open,false);
 controller.pause();assert.equal(controller.state.updateJob.status,'waiting','other work does not cancel an accepted queued update');controller.actions.updates=restoreUpdates;
 controller.state.updateJob=null;controller.state.updatePlan=null;
 await controller.open('codex');el('method').value='apiKey';el('key').value='fictional-maintenance-key';
 controller.request=async body=>{maintenanceCalls.push({...body});
  if(body.action==='prepare')return {confirmation:{...review,targets:[{...review.targets[0],agent:'codex'}]}};
  if(body.action==='start')return {job:{id:body.request_id,status:'saved',recovery:{total:1,reopen:true,restored:1,rows:[]}}};
  return restoreRequest(body);
 };
 const beforeAuth=maintenanceCalls.length;await controller.start();assert.equal(controller.operationDialog.open,true);assert.equal(el('key').value,'fictional-maintenance-key','preview does not retain the secret in a request or clear it');
 assert.equal(maintenanceCalls.at(-1).action,'prepare');assert.equal(Object.hasOwn(maintenanceCalls.at(-1),'key'),false);
 await controller.confirmOperation();assert.equal(maintenanceCalls.at(-1).action,'start');assert.equal(maintenanceCalls.at(-1).confirmation_id,'review-one');assert.equal(maintenanceCalls.at(-1).reopen,true);assert.equal(el('key').value,'');assert.equal(controller.state.job.recovery.restored,1);
 assert.equal(maintenanceCalls.length,beforeAuth+2,'account confirmation makes one native start request');controller.request=restoreRequest;
 controller.state.job=null;await controller.open('claude');await controller.updates('check');
 let finishConfirmation;controller.actions.updates=async body=>body.action==='prepare'?{confirmation:review}:body.action==='start'?new Promise(resolve=>finishConfirmation=resolve):restoreUpdates(body);
 await controller.beginOperation('update');const oldState=controller.state,pendingConfirmation=controller.confirmOperation();
 assert.equal(oldState.confirming,true);ctx={...ctx,project:'changed-during-confirmation'};controller.update();
 assert.equal(controller.operationDialog.open,false,'context changes close the old confirmation even with a POST in flight');
 finishConfirmation({job:{id:'old-job',status:'waiting'}});await pendingConfirmation;
 assert.equal(oldState.confirming,false,'late confirmation cannot leave the old dialog locked');controller.actions.updates=restoreUpdates;
 ctx={...ctx,maintenance:false};
 ctx={...ctx,updates:false};
 ctx={...ctx,demo:true};const demoCalls=calls.length;await controller.open('opencode');el('terminal').handlers.click();assert.equal(calls.length,demoCalls);assert.deepEqual(terminals,[]);
 console.log('Agent connections: in-app status/key flow, explicit native/browser actions, masked and cleared secrets, unsupported forms/old bridge, pending completion and stale context guards passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
