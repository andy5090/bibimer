"use strict";
const fs=require("node:fs"),vm=require("node:vm"),assert=require("node:assert/strict"),path=require("node:path");
const context=vm.createContext({window:{},clearTimeout,crypto:require("node:crypto").webcrypto});
vm.runInContext(fs.readFileSync(path.join(__dirname,"../../android/app/src/main/assets/github.js"),"utf8"),context);
function fixture() {
  const nodes=new Map(),opened=[];
  context.document={getElementById(id){
    if(!nodes.has(id))nodes.set(id,{value:"fixture",disabled:false,open:true,events:{},
      addEventListener(type,handler){this.events[type]=handler;},close(){this.open=false;this.events.close?.();}});
    return nodes.get(id);
  }};
  const github=new context.window.BibimerGitHub(()=>"",()=>({online:true,supported:true}),async()=>({}),
    {refresh(){},rememberClone(){},open:async id=>{opened.push(id);return true;}});
  github.render=()=>{};github.schedule=()=>{};
  return {github,opened,dialog:github.$("dialog")};
}
(async()=>{
  let {github,opened,dialog}=fixture();
  // Direct completion in the initial reply uses the exact submitted request ID.
  github.request=async data=>({job:{id:data.request_id,state:"complete",project_id:"new-project"}});
  await github.clone();assert.deepEqual(opened,["new-project"]);assert.equal(dialog.open,false);
  dialog.open=true;await github.openCompletedClone();assert.equal(opened.length,1);
  // Historical jobs, including a completed job fetched on reopen, never switch projects.
  github.accept({jobs:[{id:"historical",state:"complete",project_id:"old-project"}]});
  await github.openCompletedClone();assert.equal(opened.length,1);
  ({github,opened,dialog}=fixture());
  github.request=async()=>{throw {status:0};};await github.clone();
  const id=github.pending.request_id;
  github.accept({jobs:[{id,state:"registering",project_id:"project"}]});
  await github.openCompletedClone();assert.equal(opened.length,0,"registration must finish first");
  github.request=async()=>({login:{state:"idle"},jobs:[{id,state:"complete",project_id:"project"}]});
  await github.poll();await github.poll();assert.deepEqual(opened,["project"],"lost reply recovered and opened once");
  for(const state of ["failed","cancelled"]){
    ({github,opened}=fixture());github.openIntent={id:"new"};
    github.state.jobs=[{id:"new",state,project_id:"never"}];
    await github.openCompletedClone();assert.equal(opened.length,0);assert.equal(github.openIntent,null);
  }
  ({github,opened,dialog}=fixture());github.openIntent={id:"new"};dialog.close();dialog.open=true;
  github.state.jobs=[{id:"new",state:"complete",project_id:"background"}];
  await github.openCompletedClone();assert.equal(opened.length,0,"dismissal does not cancel clone or steal focus later");
  github.openIntent={id:"new"};github.actions.open=async id=>{opened.push(id);return false;};
  await github.openCompletedClone();await github.openCompletedClone();
  assert.deepEqual(opened,["background"]);assert.equal(dialog.open,true,"failed open leaves manual retry available");
  ({github,opened,dialog}=fixture());github.openIntent={id:"new"};
  github.state.jobs=[{id:"new",state:"complete",project_id:"project"}];
  let release;github.actions.open=()=>new Promise(resolve=>{release=resolve;});
  const opening=github.openCompletedClone();await github.openCompletedClone();
  github.reset();dialog.open=true;release(true);await opening;
  assert.equal(dialog.open,true,"stale opening cannot close another dialog after reset");
  ({github}=fixture());
  let requests=0;github.request=async()=>{requests++;return {};};
  const crypto=context.crypto;
  context.crypto={randomUUID(){throw new Error("Controlled client failure");}};
  await github.clone();context.crypto=crypto;
  assert.equal(github.error,"error_request_failed","client failures become visible feedback instead of an unhandled rejection");
  assert.equal(github.pending,null);assert.equal(requests,0);
  console.log("GitHub auto-open: direct/polled completion, lost reply, once-only, history, failure/cancel, dismissal, failed open and stale reset passed");
})().catch(error=>{console.error(error);process.exitCode=1;});
