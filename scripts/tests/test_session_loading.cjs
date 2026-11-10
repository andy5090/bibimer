"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const source=fs.readFileSync("android/app/src/main/assets/app.js","utf8");
const poll=source.match(/  async function startPoll\(\) \{[\s\S]*?\n  \}/)[0];
function fixture(){
  let resolve,reject;
  const request=new Promise((yes,no)=>{resolve=yes;reject=no;});
  const ctx=vm.createContext({activePoll:false,paused:false,online:true,switchingProject:false,libraryBusy:false,
    session:{id:"saved",state:"running"},generation:1,cursor:0,retryTimer:null,
    conversation:{loading:true,items:new Map(),update(){ctx.updates++;}},updates:0,
    api:()=>request,rememberView(){},restoreQuestions(){},speechOutput:{observe(){}},
    knownProjects:[],projectKey:()=>"project",setSession:value=>{ctx.session=value;},
    updateQueue(){},renderProjects(){},connect(){},setTimeout:()=>1,clearTimeout(){},
    connected:value=>{ctx.online=value;},notice:key=>{ctx.error=key;},connectionError:null});
  vm.runInContext(poll,ctx);
  return {ctx,resolve,reject,event:{items:[],cursor:0,session:{id:"saved",state:"exited",output_end:0}}};
}
(async()=>{
  {
    const {ctx,resolve,event}=fixture(),pending=ctx.startPoll();
    assert.equal(ctx.conversation.loading,true,"Keep loading until the initial snapshot arrives");
    resolve(event);await pending;
    assert.equal(ctx.conversation.loading,false,"An empty saved conversation also finishes loading");
    assert.equal(ctx.updates,1);
  }
  {
    const {ctx,resolve}=fixture(),pending=ctx.startPoll();
    resolve({items:[],cursor:1,session:{id:"saved",state:"running",ready:false,turn_state:"starting"}});await pending;
    assert.equal(ctx.conversation.loading,true,"An initial transport response is not restored history");
    ctx.api=async()=>({items:[],cursor:2,session:{id:"saved",state:"running",ready:true,turn_state:"ready"}});
    await ctx.startPoll();assert.equal(ctx.conversation.loading,false,"Keep the spinner until native history is ready");
  }
  for(const change of [ctx=>ctx.generation++,ctx=>ctx.session={id:"other",state:"running"},ctx=>ctx.paused=true]){
    const {ctx,resolve,event}=fixture(),pending=ctx.startPoll();change(ctx);resolve(event);await pending;
    assert.equal(ctx.conversation.loading,true,"Stale/background snapshots cannot clear another view's loading state");
    assert.equal(ctx.updates,0);
  }
  {
    const {ctx,reject}=fixture(),pending=ctx.startPoll();reject({key:"error_connection_failed"});await pending;
    assert.equal(ctx.conversation.loading,false);assert.equal(ctx.online,false);assert.equal(ctx.error,"error_connection_failed");
  }
  {
    const {ctx,reject}=fixture(),pending=ctx.startPoll();ctx.generation++;reject({key:"old_error"});await pending;
    assert.equal(ctx.conversation.loading,true);assert.equal(ctx.online,true);assert.equal(ctx.error,undefined);
  }
  console.log("PASS session loading: first and empty snapshots, stale session/generation, background and failure boundaries");
})().catch(error=>{console.error(error);process.exitCode=1;});
