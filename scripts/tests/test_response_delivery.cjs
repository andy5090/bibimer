'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('android/app/src/main/assets/app.js','utf8');
const nodes=new Map();
for(const id of ['input','input-form','send','steer','mode','launch','response-delivery']) nodes.set(id,{value:'',disabled:false,hidden:false,dataset:{},listeners:{},addEventListener(k,fn){this.listeners[k]=fn;}});
nodes.get('input').setRangeText=function(text,start,end){this.value=this.value.slice(0,start)+text+this.value.slice(end);};
nodes.get('input').dispatchEvent=()=>{};
nodes.get('mode').value='chat';
const ctx=vm.createContext({Event,$:id=>nodes.get(id),responseDelivery:'queue',enterBehavior:'send',isChat:()=>ctx.session?.mode==='chat',supportsChat:()=>true,canSteer:true,canClaudeSteer:true,canQueue:true,canInitialMessage:true,settingsBusy:false,sending:new Set(),session:null,demo:false,views:new Map(),calls:[],noticeData:null,notices:[],t:k=>k,uuid:()=>String(ctx.calls.length),viewKey:()=>ctx.session?.id,rememberView(){ctx.views.set(ctx.viewKey(),{text:nodes.get('input').value});},renderSession:()=>ctx.renderSendAction(),resizeInput(){},commands:{invocation:async text=>text.startsWith('/')?{command_id:'native-command'}:{},keydown:()=>false},updateQueue(){},setSession:s=>ctx.session=s,notice:(...args)=>ctx.notices.push(args),launchSession:async()=>ctx.launches++,launches:0,sendRaw:async()=>{throw Error('Chat should not use PTY');}});
require('./optimistic_fixture.cjs')(ctx);
ctx.api=async (method,path,body)=>{ctx.calls.push({method,path,body});if(ctx.reject)throw {key:'error_steer_rejected'};return {session:ctx.session};};
const support=source.slice(source.indexOf('  function supportsSteer()'),source.indexOf('  function renderQueue()'));
vm.runInContext(support,ctx);
vm.runInContext(source.slice(source.indexOf('  function preferredInputSteer()'),source.indexOf('  function resizeInput()')),ctx);
vm.runInContext(source.slice(source.indexOf('  let composing = false;'),source.indexOf('  $("delivery-help").addEventListener')),ctx);
nodes.get('input-form').requestSubmit=()=>nodes.get('input-form').listeners.submit({preventDefault(){}});
function reset({agent='codex',delivery='queue',turn='running',can=true,active='turn-one',text='Follow-up instruction'}={}){
 ctx.session={id:'one',agent,mode:'chat',ready:true,state:'running',turn_state:turn,active_turn_id:active,can_steer:can,queued_count:0};ctx.responseDelivery=delivery;ctx.calls=[];ctx.notices=[];ctx.reject=false;ctx.sending.clear();nodes.get('input').value=text;nodes.get('input').disabled=false;ctx.renderSendAction();
}
const settle=()=>new Promise(r=>setImmediate(r));
async function submit(){nodes.get('input-form').requestSubmit();await settle();}
function key(changes={}){let prevented=false;nodes.get('input').listeners.keydown({key:'Enter',ctrlKey:false,shiftKey:false,altKey:false,metaKey:false,repeat:false,isComposing:false,keyCode:13,preventDefault(){prevented=true;},...changes});return prevented;}
(async()=>{
 reset();assert.equal(nodes.get('send').textContent,'queue_send');await submit();assert.match(ctx.calls[0].path,/\/queue$/);assert.equal(ctx.calls[0].body.action,'add');assert.equal(nodes.get('input').value,'');
 for(const agent of ['codex','claude']){
  reset({agent,delivery:'steer'});assert.equal(nodes.get('send').textContent,'steer');assert.equal(nodes.get('steer').textContent,'queue_send');await submit();assert.equal(ctx.calls.length,1);assert.match(ctx.calls[0].path,/\/steer$/);assert.equal(ctx.calls[0].body.turn_id,'turn-one');assert.equal(ctx.calls[0].body.action,undefined);
  reset({agent,delivery:'steer'});nodes.get('steer').listeners.click();await settle();assert.match(ctx.calls[0].path,/\/queue$/,'Secondary action overrides default');
 }
 reset();nodes.get('steer').listeners.click();await settle();assert.match(ctx.calls[0].path,/\/steer$/,'Explicit Steer still overrides queue default');
 for(const options of [{agent:'opencode'},{agent:'gemini'},{can:false},{active:null},{turn:'ready'},{text:'/status'}]){
  reset({delivery:'steer',...options});await submit();assert.match(ctx.calls[0].path,/\/queue$/);if(options.text)assert.equal(ctx.calls[0].body.command_id,'native-command');
 }
 reset({delivery:'steer'});ctx.reject=true;await submit();assert.equal(ctx.calls.length,1);assert.match(ctx.calls[0].path,/\/steer$/);assert.equal(nodes.get('input').value,'Follow-up instruction');assert.equal(ctx.views.get('one').text,'Follow-up instruction');assert.equal(ctx.notices[0][0],'error_steer_rejected');
 reset({delivery:'steer'});ctx.canQueue=false;ctx.renderSendAction();assert.equal(nodes.get('send').disabled,false);assert.equal(nodes.get('steer').disabled,true);ctx.canQueue=true;
 reset({delivery:'steer'});ctx.enterBehavior='send';key();await settle();assert.match(ctx.calls[0].path,/\/steer$/,'Enter uses configured delivery');
 reset({delivery:'steer'});ctx.enterBehavior='newline';key({ctrlKey:true});await settle();assert.match(ctx.calls[0].path,/\/steer$/,'Ctrl+Enter uses configured delivery');
 for(const change of [{isComposing:true},{keyCode:229},{repeat:true}]){reset({delivery:'steer'});ctx.enterBehavior='send';key(change);await settle();assert.equal(ctx.calls.length,0,'IME and repeat must not send');}
 reset({delivery:'steer'});nodes.get('input').selectionStart=nodes.get('input').selectionEnd=nodes.get('input').value.length;key({shiftKey:true});await settle();assert.equal(ctx.calls.length,0);assert.ok(nodes.get('input').value.endsWith('\n'));
 // A pending request cannot duplicate or clear the draft of a newly selected session.
 reset({delivery:'steer'});let finish;const immediateApi=ctx.api;
 ctx.api=async(method,path,body)=>{ctx.calls.push({method,path,body});await new Promise(r=>finish=r);return {session:{id:'one',mode:'chat'}};};
 nodes.get('input-form').requestSubmit();await settle();nodes.get('input-form').requestSubmit();assert.equal(ctx.calls.length,1);
 ctx.session={id:'two',agent:'claude',mode:'chat',turn_state:'running',active_turn_id:'other',can_steer:true};nodes.get('input').value='Other session draft';
 finish();await settle();assert.equal(ctx.session.id,'two');assert.equal(nodes.get('input').value,'Other session draft');assert.equal(ctx.calls[0].body.turn_id,'turn-one');ctx.api=immediateApi;
 // Failed settings writes retain the active choice; successful changes affect the next submit.
 ctx.native={setResponseDelivery:()=>false};ctx.renderInputPreferences=()=>nodes.get('response-delivery').value=ctx.responseDelivery;
 const start=source.indexOf('  $("response-delivery").addEventListener');
 vm.runInContext(source.slice(start,source.indexOf('  $("context-display").addEventListener',start)),ctx);
 reset();nodes.get('response-delivery').value='steer';nodes.get('response-delivery').listeners.change();assert.equal(ctx.responseDelivery,'queue');assert.equal(nodes.get('response-delivery').value,'queue');
 ctx.native.setResponseDelivery=()=>true;nodes.get('response-delivery').value='steer';nodes.get('response-delivery').listeners.change();assert.equal(ctx.responseDelivery,'steer');await submit();assert.match(ctx.calls[0].path,/\/steer$/);
 console.log('PASS response delivery: queue/Steer defaults and overrides, Codex/Claude, unsupported/idle/slash fallback, turn IDs, preserved drafts on rejection, Enter/Ctrl+Enter/IME, failed saves');
})().catch(e=>{console.error(e);process.exitCode=1;});
