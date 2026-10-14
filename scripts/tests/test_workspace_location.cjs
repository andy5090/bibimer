"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const assets = path.join(__dirname, "../../android/app/src/main/assets");
const context = vm.createContext({window:{}});
vm.runInContext(fs.readFileSync(path.join(assets, "sidebar.js"), "utf8"), context);
const info = context.window.BibimerWorkspaceInfo;
const groups = [
  {path:"/repo", primary:true, available:true, branch:"main"},
  {path:"/repo-login", primary:false, available:true, branch:"feature/login"},
  {path:"/detached", primary:true, available:true, detached:true, head:"12345678abcdef"}
];
assert.equal(info("/repo", groups).label, "⑂ main");
assert.equal(info("/repo-login", groups).label, "⑂ feature/login · repo-login");
assert.equal(info("/repo-other", groups).label, "repo-other", "never inherit a different folder's ref");
assert.equal(info("/plain", []).label, "plain");
assert.equal(info("/detached", groups).label, "⑂ HEAD · 12345678");
assert.equal(info("/repo", [{...groups[0], available:false}]).branch, "");
assert.equal(info("/", []).label, "/");
const source = fs.readFileSync(path.join(assets, "app.js"), "utf8");
const names = ["currentWorkspaceInfo", "refreshProjectWorktrees", "renderWorkspaceSummary", "renderWorkspaceDetails"];
const functions = names.map(name => {
  const match = source.match(new RegExp("  (?:async )?function " + name + "\\([^]*?\\n  \\}"));
  assert.ok(match, name); return match[0];
}).join("\n");
const nodes = new Map();
let requests = [], replies = [], time = 0;
Object.assign(context, {
  project:{id:"p",path:"/repo"}, session:{project:{path:"/repo-login"}}, draftPath:"/draft",
  knownProjects:[{id:"p",path:"/repo"}], projectKey:()=>"p", worktrees:{p:groups},
  worktreeChecks:new Map(), online:true, paused:false, canWorktrees:true, instance:"a",
  worktreeError:null, workspaceDetails:null, Date:{now:()=>time},
  t:key=>key, renderSidebar:()=>{},
  $:id=> {if(!nodes.has(id)) nodes.set(id,{setAttribute(key,value){this[key]=value;}});return nodes.get(id);},
  api:async(method,url,body)=> {requests.push({method,url,body});return await new Promise((resolve,reject)=>replies.push({resolve,reject}));}
});
vm.runInContext(functions, context);
(async () => {
  assert.equal(context.currentWorkspaceInfo().branch,"feature/login");
  context.session=null;
  assert.equal(context.currentWorkspaceInfo().path,"/draft");
  context.draftPath=null;
  assert.equal(context.currentWorkspaceInfo().branch,"main");
  context.workspaceDetails={id:"p",path:"/repo-login"};
  context.renderWorkspaceDetails();
  assert.equal(nodes.get("workspace-path").textContent,"/repo-login", "details retain their own selected path");
  const first=context.refreshProjectWorktrees(context.project);
  await context.refreshProjectWorktrees(context.project,true);
  assert.equal(requests.length,1,"in-flight request coalesced");
  replies.shift().resolve({worktrees:[{...groups[0],branch:"updated"}]});await first;
  assert.equal(context.currentWorkspaceInfo().branch,"updated");
  assert.equal(nodes.get("project-path").textContent,"⑂ updated");
  await context.refreshProjectWorktrees(context.project);
  assert.equal(requests.length,1,"polling throttled");
  time=11000;
  const failed=context.refreshProjectWorktrees(context.project);
  replies.shift().reject({key:"error_request_failed"});await failed;
  assert.equal(context.currentWorkspaceInfo().branch,"","failed refresh discards stale ref");
  time=22000;
  const stale=context.refreshProjectWorktrees(context.project);
  context.instance="b";context.worktreeChecks.clear();
  replies.shift().resolve({worktrees:groups});await stale;
  assert.equal(context.worktrees.p,undefined,"old bridge response discarded");
  context.online=false;
  await context.refreshProjectWorktrees(context.project,true);
  assert.equal(requests.length,3,"offline never makes a request");
  const handlers = new Map(), copies = [];
  const lookup = context.$;
  context.$ = id => {
    const node = lookup(id);
    node.addEventListener = (type, callback) => handlers.set(id + "/" + type, callback);
    node.showModal = () => {node.open = true;};
    node.close = () => {node.open = false; handlers.get(id + "/close")?.();};
    return node;
  };
  context.native = {copyText:value => copies.push(value)};
  vm.runInContext(source.slice(source.indexOf('  $("project-path").addEventListener'), source.indexOf('  async function refreshSessionTitles')), context);
  context.worktrees.p = groups;
  handlers.get("project-path/click")();
  assert.equal(nodes.get("workspace-details-dialog").open,true);
  context.session = {project:{path:"/repo-login"}};
  handlers.get("workspace-copy-path/click")();
  handlers.get("workspace-copy-branch/click")();
  assert.deepEqual(copies,["/repo","main"],"copy uses the opened details, not a later session");
  handlers.get("workspace-details-close/click")();
  assert.equal(context.workspaceDetails,null);
  console.log("Workspace location: session/draft/root, detached/non-Git/missing paths, pinned details and copying, refresh throttling/failure/restart races passed");
})().catch(error=>{console.error(error);process.exitCode=1;});
