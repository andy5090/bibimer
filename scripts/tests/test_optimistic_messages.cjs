"use strict";
const fs=require("node:fs"),vm=require("node:vm"),assert=require("node:assert/strict");
const window={BibimerRichText:{}};
const source=fs.readFileSync("android/app/src/main/assets/conversation.js","utf8");
vm.runInNewContext(source,{window});
const Pending=window.BibimerPendingMessages;
const native=(id,text,revision)=>({id,kind:"user",text,revision});
const out=new Pending();
out.add("session-a","one","same",10);
out.reconcile("session-a",[native("old","same",9)]);
assert.equal(out.list("session-a").length,1,"Old history cannot acknowledge a new message");
out.reconcile("session-b",[native("other","same",11)]);
assert.equal(out.list("session-a").length,1,"Sessions cannot acknowledge each other's messages");
out.add("session-a","two","same",10);
assert.equal(out.reconcile("session-a",[native("new","same",11)]).length,1);
assert.equal(out.list("session-a")[0].id,"two");
out.reconcile("session-a",[native("new","same",12)]);
assert.equal(out.list("session-a").length,1,"One native echo cannot consume two repeated messages");
out.reconcile("session-a",[native("newer","same",13)]);
assert.equal(out.list("session-a").length,0);
out.add("draft","first","first input");out.settle("first","uncertain");out.move("draft","created");
assert.equal(out.list("draft").length,0);assert.equal(out.list("created")[0].state,"uncertain");
out.reconcile("created",[native("confirmed","first input",1)]);
assert.equal(out.list("created").length,0,"A late native echo resolves uncertain delivery without resending");
out.add("queue","q1","one",20);out.add("queue","q2","two",20);
out.settle("q1","queued");out.settle("q2","queued");
out.reconcile("queue",[native("batch","one\n\ntwo",30)]);
assert.equal(out.list("queue").length,0,"A native queue batch replaces its individual previews");
const long="🙂".repeat(12000);
out.add("unicode","u1",long);out.add("unicode","u2",long);out.add("unicode","u3",long);
out.reconcile("unicode",[native("unicode-batch",[...(long+"\n\n"+long+"\n\n"+long)].slice(0,32768).join("")+"\n[…]",31)]);
assert.equal(out.list("unicode").length,0,"Truncated batches use native Unicode code-point limits");
out.add("failed","f","not sent");out.settle("f","failed");
out.reconcile("failed",[native("unrelated","not sent",40)]);
assert.equal(out.list("failed")[0].state,"failed","Rejected inputs are not promoted to success");
out.remove("f");assert.equal(out.list("failed").length,0);
for(let i=0;i<140;i++)out.add("bounded","b"+i,"text");
assert.equal(out.rows.size,128,"Pending text is bounded and held only in memory");
class Element {
 constructor(tag="div",text="",className=""){Object.assign(this,{tag,textContent:text,className,children:[],dataset:{},scrollTop:0,scrollHeight:100,clientHeight:100});}
 append(...nodes){for(const node of nodes){node.remove();node.parent=this;this.children.push(node);}}
 remove(){if(this.parent)this.parent.children=this.parent.children.filter(node=>node!==this);this.parent=null;}
 insertBefore(node,before){node.remove();const index=this.children.indexOf(before);node.parent=this;this.children.splice(index<0?this.children.length:index,0,node);}
 replaceChildren(...nodes){for(const node of this.children)node.parent=null;this.children=[];this.append(...nodes);}
 querySelectorAll(selector){return this.children.flatMap(node=>[...(selector.startsWith(".")?node.className.split(" ").includes(selector.slice(1)):node.tag===selector)?[node]:[],...node.querySelectorAll(selector)]);}
 querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
 addEventListener(name,handler){this.handlers ||= {};this.handlers[name]=handler;}getBoundingClientRect(){return {top:0,bottom:0};}
}
const make=(...args)=>new Element(...args);
const renderer={window:{BibimerRichText:{make,markdown:text=>make("div",text),copyButton:text=>make("button",text,"copy-button")}},document:{getElementById:()=>make()}};
const frames=[];renderer.requestAnimationFrame=callback=>frames.push(callback);
vm.runInNewContext(source,renderer);
const root=make(),conversation=new renderer.window.BibimerConversation(root,make(),key=>key,()=>{}),preview=new Pending();
root.scrollHeight=1000;root.clientHeight=100;root.scrollTop=0;
preview.add("screen","question","<b>Literal input</b>");conversation.setOptimistic(preview.list("screen"));
assert.equal(root.scrollTop,1000,"An explicit new question scrolls to its immediate bubble");
root.scrollHeight=1500;frames.shift()();
assert.equal(root.scrollTop,1500,"The first frame follows the bottom after composer and message layout changes");
assert.equal(conversation.latest.hidden,true);
assert.equal(root.children.length,1);
assert.equal(root.children[0].querySelector(".plain-message").textContent,"<b>Literal input</b>");
assert.equal(root.children[0].querySelector(".item-status").textContent,"queue_sending");
conversation.update({items:[{id:"answer",kind:"assistant",text:"answer",revision:3}]});
conversation.update({items:[native("question","<b>Literal input</b>",2)]});
conversation.reconcileOptimistic(preview.reconcile("screen",conversation.items.values()));conversation.setOptimistic(preview.list("screen"));
assert.equal(root.children.length,2,"Native confirmation removes the temporary bubble");
assert.equal(root.children[0],conversation.cards.get("question"),"The question stays before an answer that arrived first");
preview.add("screen","next","next question",3);conversation.setOptimistic(preview.list("screen"));
root.scrollTop=123;root.handlers.wheel();root.scrollHeight=2000;frames.shift()();
assert.equal(root.scrollTop,123,"Manual scrolling cancels the scheduled bottom adjustment");
preview.add("screen","another","another question",3);conversation.setOptimistic(preview.list("screen"));
conversation.clear();root.scrollTop=45;frames.shift()();
assert.equal(root.scrollTop,45,"Switching sessions cancels the old view's deferred scroll");
console.log("PASS optimistic messages: history/session isolation, repeated text, batching, uncertain delivery, failures, bounded memory");
