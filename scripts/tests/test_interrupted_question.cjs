'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const box=vm.createContext({window:{BibimerRichText:{}},TextEncoder});
vm.runInContext(fs.readFileSync('android/app/src/main/assets/conversation.js','utf8'),box);
const Conversation=box.window.BibimerConversation;
const user=(turn,text='Original 한글 question')=>({id:turn+':user',kind:'user',status:'completed',text});
const turn=(id,status='interrupted')=>({id:'turn-'+id,kind:'turn',status});
const rows=[user('old'),turn('old','completed'),user('recent'),{id:'recent:answer',kind:'assistant',text:'partial'},turn('recent')];
assert.equal(Conversation.interruptedQuestion(rows).id,'recent:user');
for(const bad of [[],[user('a')],[user('a'),turn('a','completed')],[user('a'),turn('a','failed')],[user('b'),turn('a')],[user('a',''),turn('a')],[user('a','한'.repeat(6000)),turn('a')],[...rows,user('next')],[...rows,user('next'),turn('next','completed')]])assert.equal(Conversation.interruptedQuestion(bad),null);
const source=fs.readFileSync('android/app/src/main/assets/app.js','utf8');
const functions=['canEditInterruptedQuestion','editInterruptedQuestion'].map(name=>source.match(new RegExp('  function '+name+'\\([^\\n]*\\) \\{[\\s\\S]*?\\n  \\}'))[0]).join('\n');
function fixture(){
 const input={value:'',disabled:false,events:[],setSelectionRange(a,b){this.start=a;this.end=b;},dispatchEvent(e){this.events.push(e.type);},focus(){this.focused=true;}};
 const context=vm.createContext({BibimerConversation:Conversation,conversation:{items:new Map(rows.map(row=>[row.id,row]))},session:{id:'s',state:'running',ready:true,turn_state:'ready',active_turn_id:null},
  online:true,paused:false,busy:false,settingsBusy:false,switchingProject:false,currentTab:'work',sending:new Set(),$:()=>input,isChat:()=>true,Event:class{constructor(type){this.type=type;}},notice:key=>context.lastNotice=key});
 vm.runInContext(functions,context);return {context,input};
}
let {context,input}=fixture();context.editInterruptedQuestion(rows[2]);assert.equal(input.value,rows[2].text);assert.deepEqual(input.events,['input']);assert.equal(input.focused,true);assert.equal(input.start,input.value.length);assert.equal(context.lastNotice,'chat_edit_interrupted_loaded');
({context,input}=fixture());input.value='Unsent other draft';context.editInterruptedQuestion(rows[2]);assert.equal(input.value,'Unsent other draft');assert.equal(context.lastNotice,'chat_edit_draft_busy');assert.deepEqual(input.events,[]);
for(const change of [c=>c.online=false,c=>c.paused=true,c=>c.busy=true,c=>c.settingsBusy=true,c=>c.switchingProject=true,c=>c.currentTab='settings',c=>c.session.state='exited',c=>c.session.ready=false,c=>c.session.turn_state='running',c=>c.session.active_turn_id='next',c=>c.sending.add('s')]){
 ({context,input}=fixture());change(context);context.editInterruptedQuestion(rows[2]);assert.equal(input.value,'');assert.deepEqual(input.events,[]);
}
({context,input}=fixture());context.conversation.items=new Map([[user('other').id,user('other')],[turn('other').id,turn('other')]]);context.editInterruptedQuestion(rows[2]);assert.equal(input.value,'','A stale click cannot load a question from another session');
console.log('PASS interrupted question: exact latest interrupted turn, no inferred failure/history, new-turn and size guards, preserved draft, stale session, explicit edit only (no send/API invocation)');
