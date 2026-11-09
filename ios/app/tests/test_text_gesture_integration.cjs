"use strict";
const fs=require("node:fs"),vm=require("node:vm"),assert=require("node:assert/strict");
const source=fs.readFileSync("ios/app/Resources/ui-hooks.js","utf8"),panels=new Map(),attachments=[];
const panel=id=>{if(!panels.has(id))panels.set(id,{id,scrollHeight:100,scrollTop:80,clientHeight:20,style:{setProperty(name,value){this[name]=value;}}});return panels.get(id);};
const term={options:{fontSize:13}},context=vm.createContext({$:panel,term,currentTab:"work",session:{id:"s",mode:"chat"},
 window:{BibimerTextGestures:{attach:(element,options)=>{attachments.push({element,options});return{cancel(){}};}},addEventListener(){}},
 isChat:()=>context.session?.mode==="chat",resize:()=>context.resizes++,resizes:0,requestAnimationFrame:fn=>fn()});
vm.runInContext(source.slice(source.indexOf('  let iosChatFontSize'),source.indexOf('  const iosTerminalTools')),context);
assert.equal(attachments.length,2);const [chat,terminal]=attachments;
assert.equal(chat.element.id,"conversation");assert.equal(terminal.element.id,"terminal-area");
assert.equal(chat.options.enabled(),true);assert.equal(terminal.options.enabled(),false);
chat.options.setSize(21);assert.equal(chat.options.getSize(),21);assert.equal(panel("conversation").style["--ios-chat-text-scale"],"1.5");
assert.equal(term.options.fontSize,13);assert.equal(context.resizes,0,"Chat text sizing never changes terminal geometry");
context.session={id:"s",mode:"terminal"};panel("workspace").classList={contains:()=>false};
assert.equal(chat.options.enabled(),false);assert.equal(terminal.options.enabled(),true);
terminal.options.setSize(20);assert.equal(term.options.fontSize,20);assert.equal(context.resizes,1);
assert.equal(chat.options.getSize(),21,"Terminal sizing never changes Chat text size");
context.currentTab="settings";assert.equal(chat.options.enabled(),false);assert.equal(terminal.options.enabled(),false);
context.currentTab="work";context.session.kind="browser";assert.equal(terminal.options.enabled(),false);
console.log("PASS iOS text gesture integration: Chat body and xterm fonts only, independent sizes, terminal fit, disabled Settings/browser panels");
