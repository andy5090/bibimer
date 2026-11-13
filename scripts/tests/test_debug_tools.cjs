"use strict";
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const code=fs.readFileSync('android/app/src/main/assets/debug-tools.js','utf8');
class Element {
 constructor(){this.handlers={};this.hidden=false;this.open=false;this.value='';this.checked=false;this.disabled=false;}
 addEventListener(name,fn){this.handlers[name]=fn;}
 showModal(){this.open=true;}
 close(){this.open=false;this.handlers.close?.();}
}
const nodes=new Map(),$=id=>{id=id.replace(/^#/,"");if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id);};
const classes=new Set(),listeners={},docListeners={},env={debugMode:false},calls=[];let fail=false,cleared=0,seq=0;
const native={setDebugMode(value){if(fail)return false;env.debugMode=value;return true;},requestDebugDiagnostics(id){calls.push(['read',id]);},copyDebugDiagnostics(){calls.push(['copy']);},clearDebugDiagnostics(){calls.push(['clear']);},recordDebugEvent(...args){calls.push(args);}};
const window={addEventListener(name,fn){listeners[name]=fn;},getSelection:()=>({removeAllRanges(){cleared++;}})};
const document={getElementById:$,body:{classList:{toggle(name,on){if(on)classes.add(name);else classes.delete(name);}}},addEventListener(name,fn){docListeners[name]=fn;}};
vm.runInNewContext(code,{window,document,crypto:{randomUUID:()=>String(++seq).padStart(36,'0')}});
const tools=new window.BibimerDebugTools(k=>k,native,()=>env);
assert.equal($('#debug-tools').hidden,true);assert.equal(classes.has('debug-mode'),false);
tools.open();$('#debug-logs-copy').handlers.click();listeners.error({message:'SECRET'});assert.deepEqual(calls,[],'off means no read, copy or UI event collection');
$('#debug-mode').checked=true;$('#debug-mode').handlers.change();assert.equal(env.debugMode,true);assert.equal(classes.has('debug-mode'),true);assert.equal($('#debug-tools').hidden,false);
tools.open();const first=calls.at(-1)[1];window.BibimerDebugDiagnostics(first,'safe snapshot');assert.equal($('#debug-logs-text').value,'safe snapshot');
listeners.error({message:'PRIVATE',filename:'/secret'});listeners.unhandledrejection({reason:'TOKEN'});assert.deepEqual(calls.slice(-2),[['ui_error',0],['ui_rejection',0]],'errors collect fixed codes only');
$('#debug-logs-copy').handlers.click();assert.deepEqual(calls.at(-1),['copy']);window.BibimerDebugCopied();assert.equal($('#debug-logs-status').textContent,'copied');
$('#debug-logs-clear').handlers.click();assert.deepEqual(calls.at(-2),['clear']);assert.equal($('#debug-logs-text').value,'');
window.BibimerDebugDiagnostics(first,'old data');assert.equal($('#debug-logs-text').value,'','older refresh replies are ignored');
const latest=calls.at(-1)[1];window.BibimerDebugDiagnostics(latest,'new safe data');assert.equal($('#debug-logs-text').value,'new safe data');
document.hidden=true;docListeners.visibilitychange();assert.equal($('#debug-logs-text').value,'');assert.equal($('#debug-logs-dialog').open,false);
tools.open();const oldRequest=calls.at(-1)[1];$('#debug-mode').checked=false;$('#debug-mode').handlers.change();assert.equal(classes.has('debug-mode'),false);assert.equal($('#debug-tools').hidden,true);assert.equal($('#debug-logs-dialog').open,false);assert.ok(cleared>0);
$('#debug-mode').checked=true;$('#debug-mode').handlers.change();tools.open();window.BibimerDebugDiagnostics(oldRequest,'stale prior collection');assert.equal($('#debug-logs-text').value,'','off/on cannot restore the previous snapshot');
fail=true;$('#debug-mode').checked=false;$('#debug-mode').handlers.change();assert.equal($('#debug-mode').checked,true);assert.equal($('#debug-status').textContent,'debug_save_failed');
window.BibimerDebugDiagnostics(calls.at(-1)[1],'x'.repeat(65537));assert.equal($('#debug-logs-text').value,'','oversized snapshots are rejected');
const html=fs.readFileSync('android/app/src/main/assets/index.html','utf8'),css=fs.readFileSync('android/app/src/main/assets/app.css','utf8');
assert.ok(html.indexOf('id="developer-options"')>html.indexOf('id="response-notifications"'));assert.match(html,/<details id="developer-options"[^>]*>/);assert.doesNotMatch(html,/<details id="developer-options"[^>]*\bopen\b/);
assert.match(html,/id="debug-logs-text" readonly/);assert.match(css,/body\.debug-mode \*\{[^}]*user-select:text!important/);assert.match(css,/input\[type="password"\]\{-webkit-text-security:disc/);assert.doesNotMatch(code,/contentEditable|readClipboard|localStorage|fetch\(/);
console.log('PASS debug tools: opt-in gating, fixed-code collection, view/copy/clear, background cleanup, stale read/off-on races, failed save, quiet bottom entry and selection boundaries');
