"use strict";
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
class E{constructor(){this.handlers={};this.value='';this.open=false;}addEventListener(n,f){this.handlers[n]=f;}showModal(){this.open=true;}close(){this.open=false;this.handlers.close?.();}focus(){}}
const nodes=new Map(),$=id=>{if(!nodes.has(id))nodes.set(id,new E());return nodes.get(id);};
const ctx={instance:'bridge',project:'project',session:'one',launch:'launch',supported:true,online:true,paused:false,work:true,running:true};
const calls=[],notices=[],accepted=[];let sequence=0,deny=false,held=null,slow=false;
const entry={id:'entry',text:'server text',state:'queued',edit_revision:0},native={id:'one',queue_paused:true};
const window={};vm.runInNewContext(fs.readFileSync('android/app/src/main/assets/queue-editor.js','utf8'),{window,document:{getElementById:$},TextEncoder});
const request=async(id,body)=>{
 calls.push({id,...body});if(slow)return new Promise(resolve=>held=resolve);if(deny)throw {key:'error_queue_changed'};
 if(body.action==='edit')Object.assign(entry,{text:body.text,edit_revision:entry.edit_revision+1});
 return {session:{...native},queue:[{...entry}]};
};
const editor=new window.BibimerQueueEditor(k=>k,()=>ctx,request,{uuid:()=>String(++sequence),changed(){},accept:r=>accepted.push(r),error:k=>notices.push(k),invocation:async text=>text.startsWith('/')?{command_id:'native-command'}:{}});
const n=id=>$('queue-edit-'+id);
(async()=>{
 ctx.supported=false;await editor.open(entry);assert.equal(calls.length,0);ctx.supported=true;
 await editor.open(entry);assert.equal(calls.at(-1).action,'edit_begin');assert.equal(n('dialog').open,true);assert.equal(n('text').value,'server text');assert.equal(editor.state.revision,0);assert.equal(editor.editing('one'),true);
 n('text').value='updated 😀';n('text').handlers.input();await editor.save();
 assert.equal(calls.at(-1).action,'edit');assert.equal(calls.at(-1).expected_revision,0);assert.equal(calls.at(-1).entry_id,'entry');assert.equal(calls.at(-1).text,'updated 😀');assert.equal(n('dialog').open,false);assert.equal(notices.at(-1),'queue_edit_saved');assert.equal(calls.some(row=>row.action==='resume'),false,'saving never sends');assert.equal(editor.drafts.size,0);
 await editor.open(entry);n('text').value='local unsaved';n('text').handlers.input();n('cancel').handlers.click();assert.equal(entry.text,'updated 😀');assert.equal(n('text').value,'');assert.equal(calls.at(-1).action,'edit_begin');
 await editor.open(entry);assert.equal(n('text').value,'local unsaved','unsaved edits remain isolated from the normal composer');
 deny=true;await editor.save();assert.equal(n('text').value,'local unsaved');assert.equal(n('status').textContent,'error_queue_changed');assert.equal(n('dialog').open,true);deny=false;
 entry.text='changed on another screen';entry.edit_revision=2;n('cancel').handlers.click();await editor.open(entry);
 assert.equal(n('current').hidden,false);assert.equal(n('original').textContent,'changed on another screen');assert.equal(n('text').value,'local unsaved','conflicts show current server text beside the retained edit');
 n('text').value=' ';const before=calls.length;await editor.save();assert.equal(calls.length,before);assert.equal(n('status').textContent,'error_input_size');
 n('text').value='😀'.repeat(5000);await editor.save();assert.equal(calls.length,before,'UTF-8 limit, not character count');
 n('text').value='/status';n('text').handlers.input();await editor.save();assert.equal(calls.at(-1).command_id,'native-command');assert.equal(calls.at(-1).expected_revision,2);
 await editor.open(entry);n('text').value='draft before switch';slow=true;const saving=editor.save();await new Promise(setImmediate);
 ctx.session='other';editor.update();assert.equal(n('dialog').open,false);assert.equal(n('text').value,'');held({session:native,queue:[entry]});await saving;slow=false;
 ctx.session='one';await editor.open(entry);assert.equal(n('text').value,'draft before switch');const previousState=editor.state;
 slow=true;const oldSave=editor.save();await new Promise(setImmediate);editor.pause();slow=false;await editor.open(entry);
 assert.notEqual(editor.state,previousState);held({session:native,queue:[entry]});await oldSave;assert.equal(n('dialog').open,true,'late success after closing cannot close a newer editor');
 ctx.launch='new-launch';editor.update();assert.equal(n('dialog').open,false);
 ctx.launch='launch';slow=true;const opening=editor.open(entry);ctx.instance='new-bridge';editor.update();held({session:native,queue:[entry]});await opening;slow=false;assert.equal(n('dialog').open,false,'late pause reply cannot open the wrong session');
 ctx.instance='bridge';slow=true;const reopening=editor.open(entry);const preparing=editor.state;n('dialog').handlers.close();assert.equal(editor.state,preparing,'a late close event cannot cancel a newer preparation');held({session:native,queue:[entry]});await reopening;slow=false;assert.equal(n('dialog').open,true);n('dialog').handlers.close();assert.equal(n('dialog').open,true,'a late close event cannot clear an open editor');editor.pause();
 const beforeInvalid=calls.length;ctx.instance='bridge';await editor.open({...entry,state:'sending'});await editor.open({...entry,state:'uncertain'});assert.equal(calls.length,beforeInvalid);
 console.log('PASS queue editor: server pause first, save without sending, revision/native commands, UTF-8 bounds, cancel/draft preservation, errors and session/launch/background/late reply boundaries');
})().catch(error=>{console.error(error);process.exitCode=1;});
