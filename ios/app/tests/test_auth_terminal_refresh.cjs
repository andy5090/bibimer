"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const source=fs.readFileSync("ios/app/Resources/ui-hooks.js","utf8");
const helper=source.slice(source.indexOf("  // A login PTY exit"),source.indexOf("  const iosConnect = connect;"));
assert.ok(helper.includes("async function iosRefreshAuthentication"));
const flush=()=>new Promise(setImmediate);
function fixture(){
  const calls=[],notices=[],resolvers=[],catalogs=new Map([["project/claude",{error:"old"}],["other/claude/path",{}],["project/codex",{}]]);
  const state={online:true,paused:false,switchingProject:false,canConnections:true,instance:"bridge1",session:{id:"auth1",launch_id:"launch1",agent:"shell",authentication_agent:"claude",state:"running"},project:"project",path:"/fixture"};
  const box={...state,projectKey:()=>box.project,fileContext:()=>({path:box.path}),api:async(method,path,body)=>{calls.push({method,path,body});return await new Promise((resolve,reject)=>resolvers.push({resolve,reject}));},notice:value=>notices.push(value),modelCatalogs:catalogs,renderSession(){},agentConnections:{dialog:{open:false}}};
  vm.createContext(box);vm.runInContext(helper+"\nthis.refreshAuthentication=iosRefreshAuthentication;",box);
  return {box,calls,notices,catalogs,resolvers};
}
(async()=>{
  const f=fixture();await f.box.refreshAuthentication();assert.equal(f.calls.length,0,"A running PTY does not create periodic status processes");
  f.box.session.state="exited";f.box.session.exit_code=0;
  const first=f.box.refreshAuthentication();await f.box.refreshAuthentication();assert.equal(f.calls.length,1,"Repeated renders share one status request");
  f.resolvers.shift().resolve({agent:"claude",state:"signed_out"});await first;
  assert.deepEqual(f.notices,["connection_signed_out"],"Exit 0 cannot establish login success");assert.equal(f.catalogs.size,3);
  await f.box.refreshAuthentication();assert.equal(f.calls.length,1,"An exited PTY is checked once");
  const retry=f.box.refreshAuthentication("settings:1");f.resolvers.shift().resolve({agent:"claude",state:"configured"});await retry;
  assert.deepEqual(f.notices,["connection_signed_out","connection_configured"]);assert.deepEqual([...f.catalogs.keys()],["project/codex"],"Only this agent's model caches are invalidated");
  await f.box.refreshAuthentication("foreground:2");assert.equal(f.calls.length,2,"A confirmed auth process is not rechecked every foreground transition");
  for(const changed of ["session","instance","project","path","paused"]){
    const stale=fixture();stale.box.session.state="exited";stale.box.session.exit_code=0;const request=stale.box.refreshAuthentication();
    if(changed==="session")stale.box.session={...stale.box.session,id:"other"};else stale.box[changed]=changed==="paused"?true:"other";
    stale.resolvers.shift().resolve({agent:"claude",state:"configured"});await request;
    assert.deepEqual(stale.notices,[],changed+" change rejects stale auth completion");assert.equal(stale.catalogs.size,3);
  }
  const running=fixture();const returned=running.box.refreshAuthentication("foreground:1");running.box.session.state="exited";running.box.session.exit_code=0;
  running.resolvers.shift().resolve({agent:"claude",state:"signed_out"});await returned;await flush();
  assert.equal(running.calls.length,2,"A process that exits during a foreground check gets its final structured status");
  running.resolvers.shift().resolve({agent:"claude",state:"configured"});await flush();assert.equal(running.notices.at(-1),"connection_configured");
  const setup=fixture();delete setup.box.session.authentication_agent;setup.box.session.setup_action={agent:"claude",action:"login"};setup.box.session.state="exited";setup.box.session.exit_code=0;
  const checked=setup.box.refreshAuthentication();assert.equal(setup.calls[0].body.agent,"claude");setup.resolvers.shift().resolve({agent:"claude",state:"unknown"});await checked;assert.deepEqual(setup.notices,["connection_unknown"]);
  const old=fixture();const open=old.box.refreshAuthentication("foreground:1");old.resolvers.shift().resolve({agent:"claude",state:"configured"});await open;
  assert.deepEqual(old.notices,[],"Existing configured credentials do not finish a still-running login");assert.equal(old.catalogs.size,3);
  old.box.session.state="exited";old.box.session.exit_code=1;const failed=old.box.refreshAuthentication();old.resolvers.shift().resolve({agent:"claude",state:"configured"});await failed;
  assert.deepEqual(old.notices,["error_agent_connection"],"A failed new login cannot claim success from pre-existing credentials");assert.equal(old.catalogs.size,3);
  assert.ok(!helper.includes("setInterval"));
  console.log("PASS owned authentication PTY refresh: structured status only, one exit check, explicit foreground/settings retry, agent model invalidation and stale-context guards");
})().catch(error=>{console.error(error);process.exitCode=1;});
