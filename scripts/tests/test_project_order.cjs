"use strict";
// Exercise the real controller, including stale replies and unchanged session selection.
const fs=require("node:fs"),vm=require("node:vm"),path=require("node:path"),assert=require("node:assert/strict");
const source=fs.readFileSync(path.join(__dirname,"../../android/app/src/main/assets/app.js"),"utf8");
const controller=source.match(/  async function manageProject\([^]*?\n  \}/)[0];
function fixture() {
  const requests=[],nodes=new Map();
  const ctx=vm.createContext({canOrderProjects:true,canManageProjects:true,online:true,libraryBusy:false,busy:false,switchingProject:false,
    generation:1,retryTimer:null,knownProjects:[{id:"a",name:"Same"},{id:"b",name:"Same"},{id:"c",name:"Third"}],
    projectActionError:null,clearTimeout(){},native:{cancelPoll(){}},renderSession(){},renderProjects(){},startPoll(){},
    $:id=>{if(!nodes.has(id))nodes.set(id,{open:true});return nodes.get(id);},
    notice(){throw Error("reordering must keep the settings dialog");},
    connect(){throw Error("reordering must not reconnect or change project/session");},
    api:async(method,url,data)=>{requests.push({method,url,data});return {project_order:["c","a","b"]};}});
  vm.runInContext(controller,ctx);return {ctx,requests};
}
(async()=>{
  let {ctx,requests}=fixture();
  await ctx.manageProject("c","move_up");
  assert.equal(ctx.knownProjects.map(row=>row.id).join(","),"c,a,b");
  assert.equal(requests.length,1);assert.equal(requests[0].url,"/v1/project/manage");
  assert.equal(ctx.libraryBusy,false);
  for(const guard of ["online","canOrderProjects"]){
    ({ctx,requests}=fixture());ctx[guard]=false;await ctx.manageProject("b","move_up");assert.equal(requests.length,0);
  }
  ({ctx,requests}=fixture());ctx.api=async()=>{throw {key:"error_request_failed"};};
  await ctx.manageProject("b","move_up");assert.equal(ctx.knownProjects.map(row=>row.id).join(","),"a,b,c");
  assert.equal(ctx.projectActionError,"error_request_failed");assert.equal(ctx.libraryBusy,false);
  for(const rejected of [false,true]){
    ({ctx,requests}=fixture());let resolve,reject;
    ctx.api=()=>new Promise((yes,no)=>{resolve=yes;reject=no;});
    const pending=ctx.manageProject("b","move_up");
    await ctx.manageProject("b","move_up");assert.equal(ctx.libraryBusy,true,"duplicate mutation blocked");
    ctx.generation++;ctx.knownProjects=[{id:"other-bridge"}];
    if(rejected)reject({key:"stale-error"});else resolve({project_order:["c","a","b"]});
    await pending;assert.equal(ctx.knownProjects[0].id,"other-bridge");assert.equal(ctx.projectActionError,null);
    assert.equal(ctx.libraryBusy,false);
  }
  console.log("Project order: canonical ID order, unchanged selection/dialog, feature/offline guards, failed save, duplicate block and stale success/error replies passed");
})().catch(error=>{console.error(error);process.exitCode=1;});
