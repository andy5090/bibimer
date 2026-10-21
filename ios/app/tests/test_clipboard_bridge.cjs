"use strict";
const assert = require("node:assert/strict"), fs = require("node:fs"), vm = require("node:vm"), crypto = require("node:crypto");
const source = fs.readFileSync(__dirname + "/../Resources/native.js","utf8");
function bridge() {
  const messages = [], timers = new Map(), events = new Map(); let timerId = 0;
  const window = {__bibimerEnvironment:{},webkit:{messageHandlers:{bibimer:{postMessage:message=>messages.push(message)}}},addEventListener:(name,fn)=>events.set(name,fn)};
  vm.runInNewContext(source,{window,crypto:crypto.webcrypto,Uint8Array,setTimeout:fn=>{timers.set(++timerId,fn);return timerId;},clearTimeout:id=>timers.delete(id)});
  return {window,messages,timers,events};
}
(async()=>{
  const b = bridge();
  assert.equal(b.messages.length,0,"Loading the native shim never reads the clipboard");
  const value = "quotes \" \\ newline\n한국어 😀 \u2028";
  const read = b.window.Bibimer.readClipboard();
  assert.equal(b.messages.length,1); assert.equal(b.messages[0].action,"readClipboard");
  const id = b.messages[0].id; assert.match(id,/^[a-f0-9]{32}:1$/);
  b.window.BibimerClipboardReply("another-document:1",{ok:true,text:"wrong"});
  assert.equal(b.timers.size,1);
  b.window.BibimerClipboardReply(id,{ok:true,text:value});
  assert.equal(await read,value); assert.equal(b.timers.size,0);
  b.window.BibimerClipboardReply(id,{ok:true,text:"duplicate"});
  const timeout = b.window.Bibimer.readClipboard();
  const rejected = assert.rejects(timeout,/clipboard_failed/);
  const staleId = b.messages.at(-1).id;
  const [timerId,timerCallback] = [...b.timers.entries()][0]; b.timers.delete(timerId); timerCallback();
  await rejected;
  b.window.BibimerClipboardReply(staleId,{ok:true,text:"late secret"});
  const pending = b.window.Bibimer.readClipboard(), pageRejected = assert.rejects(pending,/clipboard_changed/);
  b.events.get("pagehide")(); await pageRejected; assert.equal(b.timers.size,0);
  const next = bridge(), nextRead = next.window.Bibimer.readClipboard();
  assert.notEqual(next.messages[0].id,id,"A replacement document cannot reuse an old clipboard request ID");
  next.window.BibimerClipboardReply(next.messages[0].id,{ok:false,code:"clipboard_large"});
  await assert.rejects(nextRead,/clipboard_large/);
  console.log("clipboard RPC: explicit reads, special characters, stale/duplicate replies, timeout and page cleanup passed");
})().catch(error=>{console.error(error);process.exitCode=1;});
