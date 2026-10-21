"use strict";
const assert = require("node:assert/strict"), fs = require("node:fs"), vm = require("node:vm");
global.self = global;
const {Terminal} = require("../../../android/app/src/main/assets/vendor/xterm.js");
const source = fs.readFileSync(__dirname + "/../Resources/terminal-tools.js","utf8");
class Node extends EventTarget {
  constructor(tag,document) { super(); this.tagName=tag;this.document=document;this.children=[];this.value="";this.selectionStart=0;this.selectionEnd=0;this.selectionDirection="none";this.isConnected=true;this.disabled=false; }
  append(node) { this.children.push(node);node.parent=this;if(node.id)this.document.nodes.set(node.id,node); }
  before(node) { this.document.nodes.set(node.id,node); }
  setAttribute(name,value) { this[name]=value; }
  focus() { this.document.activeElement=this; }
  setSelectionRange(start,end,direction="none") { this.selectionStart=start;this.selectionEnd=end;this.selectionDirection=direction;this.dispatchEvent(new Event("select")); }
  setRangeText(value,start,end) { this.value=this.value.slice(0,start)+value+this.value.slice(end);this.setSelectionRange(start+value.length,start+value.length); }
  click() { this.dispatchEvent(new Event("click")); }
  showModal() { this.open=true; }
  close() { this.open=false;this.dispatchEvent(new Event("close")); }
}
class Document extends EventTarget {
  constructor() { super();this.nodes=new Map();this.body=new Node("body",this);this.activeElement=null; }
  createElement(tag) { return new Node(tag,this); }
  getElementById(id) { return this.nodes.get(id); }
}
function load() {const window={};vm.runInNewContext(source,{window,TextEncoder,Event});return window.BibimerTerminalTools;}
const tools = load(), flush = ()=>new Promise(setImmediate);
async function terminal(text,cols=8) { const term=new Terminal({cols,rows:8,scrollback:20});await new Promise(resolve=>term.write(text,resolve));return term; }
function fixture(term) {
  const document=new Document(), area=document.createElement("div");area.id="terminal-area";document.body.append(area);
  const input=document.createElement("textarea");input.value="draft";input.setSelectionRange(1,3);document.body.append(input);input.focus();
  const state={generation:1,instance:"bridge1",project:"project1",session:"session1",tab:"work",terminal:true,paste:true};
  const copies=[],reads=[];let sent=0;
  input.addEventListener("submit",()=>sent++);
  const native={copyText:value=>copies.push(value),readClipboard:()=>new Promise((resolve,reject)=>reads.push({resolve,reject}))};
  const controller=tools.create({terminal:term,input,native,context:()=>({...state}),language:()=>"ko",document});
  const $=id=>document.getElementById("ios-terminal-"+id);
  return {document,input,state,copies,reads,controller,$,sent:()=>sent};
}
(async()=>{
  const term=await terminal("\x1b[31m1234567한\x1b[0m\r\n한글 😀  \r\n   \r\n\r\nhttps://example.invalid/long?q=가😀\r\n\r\n");
  assert.equal(term.buffer.active.getLine(0).getCell(7).getChars(),"","CJK wide-character wrap uses a null padding cell");
  assert.equal(term.buffer.active.getLine(1).isWrapped,true);
  assert.equal(tools.snapshot(term),"1234567한\n한글 😀  \n   \n\nhttps://example.invalid/long?q=가😀\n\n","Join soft wraps without introducing padding; preserve real spaces, blank lines and trailing newlines");
  const scrolled=await terminal(Array.from({length:40},(_,i)=>"line"+i+"\r\n").join(""),20);
  assert.equal(tools.snapshot(scrolled).startsWith("line0\n"),false);
  assert.equal(tools.snapshot(scrolled).endsWith("line39\n"),true);
  const f=fixture(term);
  assert.equal(f.reads.length,0);f.controller.update();assert.equal(f.reads.length,0);
  f.$("select").click(); assert.equal(f.$("text").readOnly,true);
  const start=f.$("text").value.indexOf("https://"),end=start+"https://example.invalid/long?q=가😀".length;
  f.$("text").setSelectionRange(start,end);
  f.$("copy-selection").dispatchEvent(new Event("pointerdown",{cancelable:true}));
  f.$("text").selectionStart=f.$("text").selectionEnd=0;
  f.$("copy-selection").click();assert.equal(f.copies[0],"https://example.invalid/long?q=가😀");
  f.$("copy-all").click();assert.equal(f.copies[1],tools.snapshot(term));
  f.$("close").click();assert.equal(f.$("text").value,"");assert.equal(f.document.activeElement,f.input);
  f.$("paste").click();assert.equal(f.reads.length,1);assert.equal(f.$("paste").disabled,true);
  f.reads[0].resolve("echo '한글'\nsecond line");await flush();
  assert.equal(f.input.value,"decho '한글'\nsecond lineft");assert.equal(f.sent(),0,"Paste never submits or sends raw PTY input");
  const old=f.input.value;
  f.$("paste").click();f.reads[1].resolve("");await flush();assert.equal(f.input.value,old);
  f.$("paste").click();f.reads[2].reject(new Error("denied"));await flush();assert.equal(f.input.value,old);
  for (const field of ["session","project","instance","generation"]) {
    const race=fixture(term);race.$("paste").click();const previous=race.state[field];race.state[field]="other";race.controller.update();race.state[field]=previous;race.controller.update();race.reads[0].resolve("wrong");await flush();assert.equal(race.input.value,"draft",field+" A→B→A must reject the delayed paste");
  }
  const edit=fixture(term);edit.$("paste").click();edit.input.value="changed";edit.input.dispatchEvent(new Event("input"));edit.input.value="draft";edit.input.dispatchEvent(new Event("input"));edit.reads[0].resolve("wrong");await flush();assert.equal(edit.input.value,"draft");
  const cursor=fixture(term);cursor.$("paste").click();cursor.input.setSelectionRange(0,0);cursor.input.setSelectionRange(1,3);cursor.reads[0].resolve("wrong");await flush();assert.equal(cursor.input.value,"draft");
  const large=fixture(term);large.$("paste").click();large.reads[0].resolve("한".repeat(6000));await flush();assert.equal(large.input.value,"draft");
  const total=fixture(term);total.input.value="a".repeat(16383);total.input.setSelectionRange(16383,16383);total.$("paste").click();total.reads[0].resolve("한");await flush();assert.equal(total.input.value.length,16383);
  const crlf=fixture(term);crlf.$("paste").click();crlf.reads[0].resolve("x\r\ny\rz");await flush();assert.equal(crlf.input.value,"dx\ny\nzft");assert.equal(crlf.input.selectionStart,6);
  const hidden=fixture(term);hidden.$("select").click();hidden.state.terminal=false;hidden.state.paste=false;hidden.controller.update();assert.equal(hidden.$("tools").hidden,true);assert.equal(hidden.$("text").value,"");
  for(const language of ["en","ko","pt-BR","es","id","zh-Hans","ja","zh-Hant","fr","de"]) for(const key of ["select","paste","title","hint","selection","all","close","copied","choose","empty","failed","changed","large","pasted"]) assert.equal(typeof tools.label(language,key),"string");
  term.dispose();scrolled.dispose();
  console.log("terminal tools: real ANSI/CJK/emoji/wrap/whitespace, partial copy/cleanup, explicit draft-only paste and all race/size/locale boundaries passed");
})().catch(error=>{console.error(error);process.exitCode=1;});
