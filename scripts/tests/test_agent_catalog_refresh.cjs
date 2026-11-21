"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const source=fs.readFileSync("android/app/src/main/assets/app.js","utf8");
const refresh=source.match(/  async function refreshCatalog\(\) \{[\s\S]*?\n  \}/)[0];
const oldAgents=[{id:"shell",installed:true},{id:"codex",installed:false,modes:["terminal","chat"]}];
function fixture(){
  let resolve;
  const request=new Promise(yes=>{resolve=yes;});
  const session={id:"kept-session",agent:"shell",state:"running"};
  const ctx=vm.createContext({multipleProjects:true,online:true,paused:false,busy:false,switchingProject:false,
    libraryBusy:false,catalogRequest:false,generation:1,instance:"same-bridge",selectedProjectId:"project",
    knownAgents:oldAgents,knownProjects:[],browserEnabled:true,session,canSwitchAgents:true,canLibrary:true,
    native:{cancelPoll(){throw Error("An unchanged session must keep its poll");}},
    api:async(method,path)=>{assert.equal(method,"GET");assert.equal(path,"/v1/health");return request;},
    connect(){ctx.reconnects++;},reconnects:0,renderAgents(){ctx.agentRenders++;},agentRenders:0,
    adoptAgent(){throw Error("Catalog refresh must not switch the user's agent");},setSession:value=>{ctx.session=value;},
    renderProjects(){},renderBrowser(){},startPoll(){},refreshSessionTitles(){}});
  vm.runInContext(refresh,ctx);
  const agents=oldAgents.map(row=>({...row,installed:true}));
  return {ctx,resolve,session,health:{instance:"same-bridge",agents,projects:[{id:"project",session}]}};
}
(async()=>{
  {
    const {ctx,resolve,session,health}=fixture(),pending=ctx.refreshCatalog();
    resolve(health);await pending;
    assert.equal(ctx.knownAgents[1].installed,true,"Newly detected Codex becomes available without reconnecting");
    assert.equal(ctx.agentRenders,1);assert.equal(ctx.session,session);assert.equal(ctx.reconnects,0);
    ctx.api=async()=>health;await ctx.refreshCatalog();assert.equal(ctx.agentRenders,1,"Unchanged health does not reset selectors");
    ctx.api=async()=>({...health,agents:oldAgents});await ctx.refreshCatalog();
    assert.equal(ctx.knownAgents[1].installed,false,"A removed executable must also become unavailable");assert.equal(ctx.agentRenders,2);
  }
  for(const change of [ctx=>ctx.generation++,ctx=>ctx.paused=true,ctx=>ctx.switchingProject=true]){
    const {ctx,resolve,health}=fixture(),pending=ctx.refreshCatalog();change(ctx);resolve(health);await pending;
    assert.equal(ctx.knownAgents,oldAgents,"Late responses cannot replace another view's catalog");assert.equal(ctx.agentRenders,0);
  }
  {
    const {ctx,resolve,health}=fixture(),pending=ctx.refreshCatalog();resolve({...health,instance:"restarted"});await pending;
    assert.equal(ctx.reconnects,1);assert.equal(ctx.knownAgents,oldAgents);
  }
  for(const agents of [undefined,null,{}]){
    const {ctx,resolve,health}=fixture(),pending=ctx.refreshCatalog();resolve({...health,agents});await pending;
    assert.equal(ctx.knownAgents,oldAgents,"Missing or invalid catalog must not hide installed tools");assert.equal(ctx.agentRenders,0);
  }
  console.log("PASS agent catalog refresh: external install/removal, unchanged selectors, preserved session, stale/background/bridge boundaries");
})().catch(error=>{console.error(error);process.exitCode=1;});
