"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const sandbox = {window:{}, setTimeout};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,"../../android/app/src/main/assets/bridge-maintenance.js"),"utf8"), sandbox);
const prototype = sandbox.window.BibimerMaintenance.prototype;
const row = {id:"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",launch_id:"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",state:"running",project:{id:"project"}};
async function check(supported, changedLaunch=false) {
  const calls=[], starts=[];
  const state={instance:"bridge",action:"update",rows:[row],reopen:true};
  let running=true;
  const controller=Object.assign(Object.create(prototype),{
    state,dialog:{open:true,close(){}},changed(){},
    context:()=>({instance:"bridge",online:true,allowed:()=>true}),
    actions:{changed(){},id:()=>"recovery",start:(...args)=>starts.push(args)},
    request:async(method,route,body)=>{
      if(method==="GET")return {instance:"bridge",active_sessions:running?1:0,
        features:supported?["maintenance_archive"]:[],projects:[{sessions:running?
          [{...row,...(changedLaunch?{launch_id:"different-process"}:{})}]:[]}]};
      calls.push({route,body});running=false;return {};
    }
  });
  await controller.confirm();
  if(changedLaunch){assert.equal(calls.length,0);assert.equal(starts.length,0);assert.equal(state.error,"bridge_maintenance_changed");return;}
  assert.equal(calls.length,1);assert.equal(starts.length,1);
  assert.equal(JSON.stringify(calls[0].body),JSON.stringify(supported?
    {maintenance:{instance:"bridge",launch_id:row.launch_id}}:{}));
}
(async()=>{
  await check(true);await check(false);await check(true,true);
  console.log("PASS maintenance archiving: exact stop receipt, old bridge fallback, changed process requires review");
})().catch(error=>{console.error(error);process.exitCode=1;});
