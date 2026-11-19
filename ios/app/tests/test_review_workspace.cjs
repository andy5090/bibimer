"use strict";
const fs=require("node:fs"),vm=require("node:vm"),assert=require("node:assert/strict"),crypto=require("node:crypto");
const source=fs.readFileSync("ios/app/Resources/review-workspace.js","utf8"),samples=JSON.parse(fs.readFileSync("ios/app/Resources/review-samples.json","utf8")).samples;
let now=100000;
const box=vm.createContext({window:{},crypto:crypto.webcrypto,URLSearchParams,btoa:x=>Buffer.from(x,"binary").toString("base64"),fetch(){throw Error("network forbidden");}});vm.runInContext(source,box);
function fixture(language="en"){
 const d=new box.window.BibimerReviewWorkspace(samples,language,()=>now);
 const get=path=>d.request("GET",path,{}),post=(path,data={})=>d.request("POST",path,data),health=()=>get("/v1/health"),p=health().projects[0];
 const sid=agent=>health().projects.find(row=>row.id===p.id).sessions.find(s=>s.agent===agent).id;
 const events=id=>get(`/v1/sessions/${id}/events?cursor=0&wait=0`),action=(id,path,data={})=>post(`/v1/sessions/${id}/${path}`,data),finish=id=>{now+=10000;events(id);now+=10000;return events(id);};
 return {d,get,post,health,p,sid,events,action,finish};
}
const f=fixture(),codex=f.sid("codex"),shell=f.sid("shell");
assert.equal(f.health().demo,true);assert.equal(f.health().projects[0].sessions.length,4);
for(const agent of ["codex","claude","opencode"]){const items=f.events(f.sid(agent)).items;assert.ok(items.some(i=>i.kind==="assistant"));assert.ok(items.some(i=>i.kind==="diff"));assert.ok(items.some(i=>/fictional|Fictional/.test(i.text||"")));}
f.action(codex,"message",{text:"PRIVATE-USER-TEXT"});const done=f.finish(codex);assert.equal(done.session.turn_state,"ready");assert.ok(!JSON.stringify(done).includes("PRIVATE-USER-TEXT"));assert.ok(f.get(`/v1/completions?cursor=0&instance=${f.d.instance}&wait=0`).events[0].preview.startsWith("Demo:"));
const other=fixture();other.action(other.sid("codex"),"message",{text:"completely different"});const output=other.finish(other.sid("codex"));const answer=x=>x.items.filter(i=>i.kind==="assistant").at(-1).text;assert.equal(answer(done),answer(output));
for(let n=0;n<2;n++){f.action(codex,"message",{text:"not saved"});f.finish(codex);}
let e=f.events(codex);assert.equal(e.requests[0].kind,"command");f.action(codex,"respond",{prompt_id:e.requests[0].id,decision:"accept"});e=f.events(codex);assert.equal(e.requests[0].kind,"questions");f.action(codex,"respond",{prompt_id:e.requests[0].id,answers:{"demo-color":"PRIVATE-ANSWER"}});now+=2000;e=f.events(codex);assert.equal(e.session.turn_state,"ready");assert.ok(!JSON.stringify(e).includes("PRIVATE-ANSWER"));
f.action(shell,"input",{data:"curl https://private.invalid; rm -rf /"});const terminal=Buffer.from(f.events(shell).data,"base64").toString("utf8");assert.match(terminal,/no command was executed/);assert.ok(!terminal.includes("private.invalid"));
const queued=fixture(),id=queued.sid("claude");queued.action(id,"message",{text:"run"});queued.action(id,"queue",{action:"add",text:"PRIVATE-QUEUED"});let q=queued.events(id);assert.equal(q.queue.length,1);assert.ok(!JSON.stringify(q).includes("PRIVATE-QUEUED"));queued.action(id,"queue",{action:"steer",entry_id:q.queue[0].id,turn_id:q.session.active_turn_id});assert.equal(queued.events(id).queue.length,0);queued.action(id,"interrupt");assert.equal(queued.events(id).session.queue_paused,true);
const options={model:"demo-model",permission:"inherit",effort:"high"};queued.action(id,"options",{options});assert.equal(queued.events(id).session.options.model,"demo-model");
queued.action(id,"manage",{action:"rename",title:"My sample"});queued.action(id,"manage",{action:"archive"});assert.equal(queued.events(id).session.archived,true);queued.action(id,"manage",{action:"restore"});
assert.throws(()=>queued.action(id,"manage",{action:"delete"}),e=>e.key==="error_session_active");queued.action(id,"stop");queued.action(id,"manage",{action:"delete"});assert.throws(()=>queued.events(id),e=>e.key==="error_session_missing");
const p=f.post("/v1/project",{path:"/demo/projects/second"}).project;f.post("/v1/project/manage",{project_id:p.id,action:"rename",name:"Second sample"});assert.equal(f.health().projects.length,2);f.post("/v1/project/manage",{project_id:p.id,action:"move_to",position:0});assert.equal(f.health().projects[0].id,p.id);f.post("/v1/project/manage",{project_id:p.id,action:"delete"});
const wt=f.post("/v1/worktrees",{project_id:f.p.id});assert.equal(wt.worktrees.length,2);
const session=f.post("/v1/sessions",{project_id:f.p.id,agent:"claude",mode:"chat",new_session:true,worktree_path:wt.worktrees[1].path,request_id:"request-one",initial_message:{text:"PRIVATE-INITIAL"}}).session;assert.equal(f.post("/v1/sessions",{request_id:"request-one"}).session.id,session.id);assert.ok(!JSON.stringify(f.events(session.id)).includes("PRIVATE-INITIAL"));
const h=fixture();const preview=h.action(h.sid("codex"),"handoff",{action:"preview"});assert.match(preview.context,/Fictional/);const handed=h.action(h.sid("codex"),"handoff",{action:"start",agent:"opencode"}).session;assert.equal(handed.agent,"opencode");assert.ok(h.events(handed.id).items.some(i=>i.kind==="assistant"));
for(const action of ["files","file","status","diff","history","commit"]){const data=h.post("/v1/inspect",{action,path:action==="file"?"src/garden.js":"",project_id:h.p.id});assert.ok(data);}
assert.match(h.post("/v1/models",{agent:"codex"}).models[0].name,/no inference/);assert.match(h.post("/v1/commands",{}).commands[0].description,/fictional/);assert.match(h.post("/v1/session-history",{project_id:h.p.id}).sessions[0].title,/Fictional/);
assert.match(h.post("/v1/github",{action:"status"}).account,/fictional/);h.post("/v1/github",{action:"clone",repository:"demo/pocket-garden",parent:"/demo/projects",name:"imported",request_id:"clone-one"});assert.equal(h.post("/v1/github",{action:"poll"}).jobs.length,1);
for(const [path,data] of [["/v1/ios/agents",{action:"install"}],["/v1/agent-connections",{action:"start"}],["/native/open-file",{}],["/v1/browser",{}],["/v1/git",{}],["/v1/project",{path:"/root/real"}],["/v1/inspect",{project_id:h.p.id,action:"file",path:"../../secret"}]])assert.throws(()=>h.post(path,data),e=>/^error_demo/.test(e.key));
const ko=fixture("ko");assert.match(ko.events(ko.sid("codex")).items.find(i=>i.kind==="notice").text,/가상의/);assert.match(ko.events(ko.sid("codex")).items.find(i=>i.kind==="assistant").text,/예제/);
const language=fixture("de");assert.match(language.events(language.sid("codex")).items.find(i=>i.kind==="assistant").text,/fictional/);
console.log("PASS review workspace: input-independent Android samples, chat/approval/questions/queue/Steer, projects/worktrees/sessions/files, prerecorded terminal, limits and real-capability rejection");
