"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const modes = ["inherit","read-only","workspace-write","yolo"];
const fields = new Map();
const field = id => {
  if (!fields.has(id)) fields.set(id,{value:"",disabled:false,hidden:false,textContent:"",dataset:{},options:[],addEventListener(){}});
  return fields.get(id);
};
let saved = "read-only", mode = "chat";
let metadataCalls = 0;
for (const id of ["permission","quick-permission"]) field(id).options = [...modes,"app-sandbox"].map(value=>({value,disabled:false}));
field("import-agent").value = "shell";
const context = {
  permissionModes:{codex:[...modes]},window:{},environment:()=>({selfTest:false}),native:{},
  term:{registerLinkProvider(){}},worktreeCreator:{state:null,render(){}},session:null,online:false,$:field,
  renderSettings() { for (const id of ["permission","quick-permission"]) for (const option of field(id).options) option.disabled = false; },
  renderModels() { metadataCalls++; },
  renderSession() { field("launch").disabled = false; field("send").disabled = false; },
  modelContext:()=>({agent:"codex",mode,chat:false}),savedOptions:agent=>({permission:agent === "codex" ? saved : "inherit"}),
  pickers:{sync(){}},t:key=>key,updateMode:()=>{field("mode-hint").textContent="normal mode hint";}
};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname,"../Resources/ui-hooks.js"),"utf8"),context);

assert.equal(context.permissionModes.codex.includes("read-only"),true);
assert.equal(context.permissionModes.codex.includes("workspace-write"),true);
assert.equal(context.permissionModes.codex.includes("app-sandbox"),true);
context.renderSettings(); context.renderSession();
assert.equal(saved,"read-only","Unsupported saved choices must never become inherit or app-sandbox automatically");
assert.equal(field("launch").disabled,true);
assert.equal(field("send").disabled,true,"A new chat must respect the stored iOS policy before session creation");
assert.equal(field("permission").options.find(option=>option.value === "read-only").disabled,true);
assert.equal(field("permission-hint").textContent,"error_ios_codex_sandbox");
assert.equal(field("permission").options.find(option=>option.value === "app-sandbox").disabled,false);

saved = "workspace-write"; context.renderSettings(); context.renderSession();
assert.equal(saved,"workspace-write"); assert.equal(field("launch").disabled,true);

saved = "app-sandbox"; context.renderSettings(); context.renderSession();
assert.equal(field("launch").disabled,false,"An explicit app sandbox choice is available in Chat");
mode = "terminal"; context.renderSettings(); context.renderSession();
assert.equal(saved,"app-sandbox","Switching modes must keep the user's saved policy");
assert.equal(field("launch").disabled,true);
assert.equal(field("permission").options.find(option=>option.value === "app-sandbox").disabled,true);
assert.equal(field("permission-hint").textContent,"error_ios_codex_terminal_policy");

saved = "inherit"; context.renderSettings(); context.renderSession();
assert.equal(saved,"inherit"); assert.equal(field("launch").disabled,false);
assert.equal(field("permission-hint").textContent,"ios_codex_inherit_hint");
assert.equal(context.iosPermissionIssue("claude","read-only","chat"),null);
saved = "app-sandbox"; context.worktreeCreator.state = {};
field("worktree-agent").value = "codex"; field("worktree-mode").value = "terminal";
context.worktreeCreator.render();
assert.equal(field("worktree-create-submit").disabled,true);
assert.equal(field("worktree-create-status").textContent,"error_ios_codex_terminal_policy");
context.session = {setup_action:{action:"version"}};
context.renderModels(); context.renderSettings();
assert.equal(metadataCalls,0,"Fixed installer/version sessions must not start unrelated model discovery");
assert.equal(field("quick-model").hidden,true); assert.equal(field("agent-settings").hidden,true);
context.session = null; context.renderModels(); assert.equal(metadataCalls,1);
async function verifySetupCatalog() {
  let healthCalls = 0;
  context.online = true; context.instance = "current-instance";
  context.knownAgents = [{id:"gemini",installed:false}];
  context.api = async () => { healthCalls++; return {instance:"current-instance",agents:[{id:"gemini",installed:true}]}; };
  field("agent").options = [{value:"shell"},{value:"gemini"}]; field("agent").value = "gemini";
  field("mode").options = [{value:"chat"},{value:"terminal"}]; field("mode").value = "terminal";
  field("input").value = "unfinished input";
  context.renderAgents = () => { field("agent").value = "shell"; field("mode").value = "chat"; };
  const selectedSession = {id:"installed-session",state:"exited",exit_code:0,setup_action:{action:"install",agent:"gemini"}};
  context.session = selectedSession;
  context.renderSession(); context.renderSession();
  await new Promise(setImmediate);
  assert.equal(healthCalls,1,"Repeated terminal renders must not duplicate completion health requests");
  assert.equal(context.knownAgents[0].installed,true,"Installed capabilities must update without reconnecting the workspace");
  assert.equal(context.session,selectedSession,"Completion refresh must preserve the selected session");
  assert.equal(field("input").value,"unfinished input");
  assert.equal(field("agent").value,"gemini"); assert.equal(field("mode").value,"terminal");
  context.renderSession(); await new Promise(setImmediate);
  assert.equal(healthCalls,1);
  console.log("iOS permissions and setup catalog: stored policies, selected session/mode and draft preserved");
}
verifySetupCatalog().catch(error=>{console.error(error);process.exitCode=1;});
