"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const elements=new Map();
function el(){return {value:"",hidden:false,disabled:false,options:[],textContent:"",listeners:{},
 addEventListener(k,fn){this.listeners[k]=fn;},replaceChildren(...rows){this.options=rows;}};}
const document={getElementById(id){if(!elements.has(id))elements.set(id,el());return elements.get(id);},createElement:()=>el()};
const ctx=vm.createContext({document});
vm.runInContext(fs.readFileSync("android/app/src/main/assets/voice-input.js","utf8")+";globalThis.Settings=BibimerVoiceSettings;",ctx);
let state={voiceInput:{provider:"device",language:"",devices:[{id:"device:pkg/Activity",label:"Local speech"}],openaiKey:true,elevenlabsKey:false}},accept=true;
const calls=[],native={configureVoiceInput(provider,language){calls.push([provider,language]);if(accept){state.voiceInput.provider=provider;state.voiceInput.language=language;}return accept;},voiceKeyAction(...args){calls.push(args);}};
let syncs=0;const settings=new ctx.Settings(k=>"translated "+k,native,()=>state,()=>syncs++);
const $=id=>document.getElementById(id);
settings.render();assert.equal($("voice-preference").hidden,false);assert.equal($("voice-api-controls").hidden,true);
assert.deepEqual(Array.from($("voice-provider").options,x=>x.value),["device","device:pkg/Activity","openai","elevenlabs"]);
$("voice-provider").value="openai";$("voice-provider").listeners.change();
assert.equal(state.voiceInput.provider,"openai");assert.equal($("voice-api-controls").hidden,false);assert.equal($("voice-key-state").textContent,"translated voice_key_saved");
$("voice-language").value="ko";$("voice-language").listeners.change();assert.equal(state.voiceInput.language,"ko");
accept=false;$("voice-provider").value="elevenlabs";$("voice-provider").listeners.change();
assert.equal($("voice-provider").value,"openai");assert.equal($("voice-settings-status").textContent,"translated voice_failed");
$("voice-key-edit").listeners.click();let last=calls.at(-1);assert.equal(last[0],"openai");assert.equal(last[1],"edit");
const labels=JSON.parse(last[2]);assert.equal(labels.voice_key_hint,"translated voice_key_hint");assert.ok(!Object.hasOwn(labels,"apiKey"));
$("voice-check").listeners.click();assert.equal($("voice-provider").disabled,true);assert.equal($("voice-check").disabled,true);
const before=calls.length;$("voice-check").listeners.click();assert.equal(calls.length,before);
settings.changed("voice_auth");assert.equal($("voice-provider").disabled,false);assert.equal($("voice-settings-status").textContent,"translated voice_auth");
state.voiceInput.provider="elevenlabs";settings.render();assert.equal($("voice-check").disabled,true);assert.equal($("voice-key-remove").disabled,true);
state.voiceInput.provider="device:missing/App";settings.render();assert.equal($("voice-provider").value,"device:missing/App");assert.equal($("voice-provider").options.at(-1).disabled,true);
state.demo=true;settings.render();assert.equal($("voice-preference").hidden,true);
assert.ok(syncs>0);
console.log("PASS voice settings: provider/language persistence and failure, native-only key actions, connection check locking, missing-app visibility, demo isolation and localization");
