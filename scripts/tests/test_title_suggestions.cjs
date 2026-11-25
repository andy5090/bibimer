"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const source=fs.readFileSync(path.join(__dirname,"../../android/app/src/main/assets/app.js"),"utf8");
const code=source.slice(source.indexOf("  function cancelTitleSuggestion()"),source.indexOf('  $("session-archive").addEventListener'));
function harness(){
  const elements=new Map(),calls=[];
  const $=id=>{
    if(!elements.has(id))elements.set(id,{open:true,value:"Manual name",listeners:{},addEventListener(kind,callback){this.listeners[kind]=callback;}});
    return elements.get(id);
  };
  const ctx={$,canTitleSuggestions:true,online:true,libraryBusy:false,titleSuggestion:null,instance:"bridge",actionTarget:"session",
    findSession:()=>({id:"session",mode:"chat"}),uuid:()=>"request",i18n:{language:()=>"ko"},t:key=>key,
    renderSessionActions(){},setTimeout:resolve=>resolve(),
    api:async(method,route,body)=>{calls.push(body);return {job:{status:"succeeded",title:"Generated title"}};}};
  vm.createContext(ctx);vm.runInContext(code,ctx);
  return {ctx,$,calls,click:()=>$("session-title-generate").listeners.click()};
}
(async()=>{
  let h=harness();await h.click();
  assert.equal(h.$("session-name").value,"Generated title");
  assert.equal(h.$("session-title-hint").textContent,"session_title_suggested");
  assert.deepEqual(h.calls.map(row=>row.action),["start"]);
  assert.equal(h.calls[0].language,"ko");
  assert.ok(!h.calls.some(row=>row.action==="rename"),"Suggestions need an explicit save");
  h=harness();let complete;
  h.ctx.api=async(method,route,body)=>{
    h.calls.push(body);
    if(body.action==="start")return await new Promise(resolve=>{complete=resolve;});
    return {job:{status:"cancelled"}};
  };
  const pending=h.click();h.$("session-dialog").open=false;h.$("session-dialog").listeners.close();
  complete({job:{status:"succeeded",title:"Late title"}});await pending;
  assert.equal(h.$("session-name").value,"Manual name");
  assert.deepEqual(h.calls.map(row=>row.action),["start","cancel"]);
  h=harness();h.ctx.canTitleSuggestions=false;await h.click();assert.equal(h.calls.length,0);
  h=harness();h.ctx.api=async()=>({job:{status:"failed",error:"error_handoff_empty"}});await h.click();
  assert.equal(h.$("session-name").value,"Manual name");
  assert.equal(h.$("session-title-hint").textContent,"error_handoff_empty");
  console.log("PASS title suggestions: explicit request/save, draft preservation, cancelled/stale replies, unsupported bridge and errors");
})().catch(error=>{console.error(error);process.exitCode=1;});
