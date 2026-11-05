"use strict";
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
class Node {
 constructor(tag='div',text='',className=''){Object.assign(this,{tag,textContent:text,className,children:[],dataset:{},attributes:{},hidden:false,scrollHeight:0,scrollTop:0,clientHeight:0});}
 append(...nodes){for(const n of nodes){n.parent=this;this.children.push(n);}}
 insertBefore(node,before){node.parent=this;const i=this.children.indexOf(before);if(i<0)this.children.push(node);else this.children.splice(i,0,node);}
 remove(){if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this);}
 replaceChildren(...nodes){this.children=[];this.append(...nodes);}
 querySelectorAll(selector){const out=[];for(const n of this.children){if(selector.startsWith('.')?n.className.split(' ').includes(selector.slice(1)):n.tag===selector)out.push(n);out.push(...n.querySelectorAll(selector));}return out;}
 querySelector(s){return this.querySelectorAll(s)[0]||null;}
 setAttribute(k,v){this.attributes[k]=v;}
 addEventListener(){}getBoundingClientRect(){return {top:0,bottom:0};}
}
const make=(tag,text,classes)=>new Node(tag,text,classes);
const ctx=vm.createContext({window:{BibimerRichText:{make,markdown:text=>make('div',text),copyButton:text=>make('button',text,'copy-button')}},document:{getElementById:()=>new Node()}});
vm.runInContext(fs.readFileSync('android/app/src/main/assets/conversation.js','utf8'),ctx);
const conversation=new ctx.window.BibimerConversation(new Node(),new Node(),k=>k,()=>{}),calls=[];
const toggle=id=>calls.push(id),row=(id,kind='assistant',status='completed',text='answer')=>({id,kind,status,text});
conversation.setSpeechControls({enabled:true,readingId:''},toggle);
for(const item of [row('a'),row('b'),row('stream','assistant','inProgress'),row('user','user'),row('empty','assistant','completed',' ')]){conversation.items.set(item.id,item);conversation.renderItem(item);}
const button=id=>conversation.cards.get(id).querySelector('.message-speech');
assert.ok(button('a'));assert.ok(button('b'));for(const id of ['stream','user','empty'])assert.equal(button(id),null);
assert.equal(button('a').attributes['aria-label'],'tts_read_answer');button('a').onclick();assert.deepEqual(calls,['a']);
const card=conversation.cards.get('a'),body=card.children[1],control=button('a');
conversation.setSpeechControls({enabled:true,readingId:'a'},toggle);
assert.equal(button('a'),control);assert.equal(card.children[1],body,'Playback updates preserve answer DOM and selection');
assert.equal(button('a').attributes['aria-label'],'tts_stop');assert.equal(button('a').attributes['aria-pressed'],'true');assert.ok(button('a').innerHTML.includes('<rect'));
assert.equal(button('b').attributes['aria-label'],'tts_read_answer');button('a').onclick();assert.deepEqual(calls,['a','a']);
conversation.setSpeechControls({enabled:true,readingId:'b'},toggle);assert.equal(button('a').attributes['aria-pressed'],'false');assert.equal(button('b').attributes['aria-pressed'],'true');
conversation.setSpeechControls({enabled:true,readingId:''},toggle);assert.equal(button('b').attributes['aria-label'],'tts_read_answer');
conversation.setSpeechControls({enabled:false,readingId:''},toggle);assert.equal(button('a'),null);assert.equal(button('b'),null);
conversation.setSpeechControls({enabled:true,readingId:''},toggle);assert.ok(button('a'));assert.equal(conversation.cards.get('a').querySelectorAll('.message-speech').length,1);
const html=fs.readFileSync('android/app/src/main/assets/index.html','utf8');for(const id of ['tts-read-latest','tts-stop','tts-stop-settings'])assert.ok(!html.includes('id="'+id+'"'));
console.log('PASS per-answer speech buttons: completed assistant only, replay/stop/replace/reset, labels, no duplicate controls, preserved answer DOM');
