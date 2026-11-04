"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const root = path.resolve(__dirname, "../..");
const source = fs.readFileSync(path.join(root, "android/app/src/main/assets/voice-input.js"), "utf8");
const sandbox = vm.createContext({Event:class {constructor(type) {this.type = type;}}});
vm.runInContext(source + ";globalThis.Voice = BibimerVoiceInput;", sandbox);
function element(value = "") {
  const listeners = {};
  return {value, disabled:false, hidden:false, selectionStart:value.length, selectionEnd:value.length,
    addEventListener(type, callback) { (listeners[type] ||= []).push(callback); },
    dispatchEvent(event) { for (const callback of listeners[event.type] || []) callback(event); },
    setAttribute(key, value) {this[key] = value;},
    setRangeText(text, start, end) {this.value = this.value.slice(0,start) + text + this.value.slice(end); this.selectionStart = this.selectionEnd = start + text.length;},
    focus() {this.focused = true;}};
}
function setup(native) {
  const input = element("기존 초안"), button = element(), status = element(), calls = [];
  let context = "bridge/project/session/agent/chat";
  const voice = new sandbox.Voice(input, button, status, key=>key, ()=>context,
    native === undefined ? {startVoiceInput:id=>calls.push(id)} : native);
  return {input, button, status, calls, voice, context:value=>{context=value;}};
}
let x = setup();
x.input.selectionStart = 3; x.input.selectionEnd = 5;
x.voice.start(); x.voice.start(); assert.equal(x.calls.length,1, "Double click opens once");
x.voice.result("wrong-id","ok","stale"); assert.ok(x.voice.pending);
x.voice.result(x.calls[0],"ok","음성 결과"); assert.equal(x.input.value,"기존 음성 결과");
assert.equal(x.input.selectionStart,8); assert.ok(x.input.focused); assert.equal(x.voice.revision,1);
x.voice.result(x.calls[0],"ok","duplicate"); assert.equal(x.input.value,"기존 음성 결과");
for (const state of ["cancelled","failed","unavailable","empty"]) {
 x=setup(); x.voice.start(); x.voice.result(x.calls[0],state,"");
 assert.equal(x.input.value,"기존 초안"); assert.equal(x.voice.pending,null); assert.equal(x.button.disabled,false);
 assert.equal(x.status.hidden,state==="cancelled");
}
for (const mutate of [
 x=>x.context("bridge/project/another-session/agent/chat"),
 x=>{x.context("other-project"); x.voice.update(); x.context("bridge/project/session/agent/chat");},
 x=>{x.input.value="편집한 초안";x.input.dispatchEvent({type:"input"});},
 x=>{x.input.dispatchEvent({type:"input"});},
 x=>{x.input.disabled=true;}
]) {
 x=setup(); x.voice.start(); mutate(x); const previous=x.input.value;
 x.voice.result(x.calls[0],"ok","다른 세션에 들어가면 안 됨");
 assert.equal(x.input.value,previous); assert.equal(x.status.textContent,"voice_changed");
}
x=setup({}); assert.ok(x.button.hidden); x.voice.start(); assert.equal(x.voice.pending,null);
x=setup({startVoiceInput:()=>{throw Error("No native method");}});x.voice.start();
assert.equal(x.status.textContent,"voice_failed"); assert.equal(x.voice.pending,null);
x=setup();x.input.disabled=true;x.voice.start();assert.equal(x.calls.length,0);
x=setup();x.voice.start();x.voice.result(x.calls[0],"ok","a".repeat(65537));assert.equal(x.input.value,"기존 초안");
x=setup();x.input.value="";x.input.selectionStart=x.input.selectionEnd=0;x.voice.start();x.voice.result(x.calls[0],"ok","<script>literal text</script>");
assert.equal(x.input.value,"<script>literal text</script>", "Transcript stays literal textarea text");
const html=fs.readFileSync(path.join(root,"android/app/src/main/assets/index.html"),"utf8");
assert.ok(html.indexOf('id="voice-input"')<html.indexOf('id="input"'));
assert.ok(html.includes('id="voice-input" class="voice-input" type="button"'));
assert.ok(html.indexOf('src="voice-input.js"')<html.indexOf('src="app.js"'));
console.log("PASS voice input: insertion/selection, draft isolation, edit-and-revert, duplicate callbacks, cancellation, unavailable provider, native failure, disabled input, literal text and composer integration");
