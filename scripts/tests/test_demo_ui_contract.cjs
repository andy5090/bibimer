"use strict";
// Exercise the actual input controller as a pure function; no browser or DOM is launched.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const app = fs.readFileSync(path.join(__dirname, "../../android/app/src/main/assets/app.js"), "utf8");
const match = app.match(/  async function submitInput\(steer\) \{[\s\S]*?\n  \}/);
assert.ok(match, "Actual input controller found");
let captured, raw;
const elements = {input:{value:"Fictional contract input"}, send:{disabled:false}, steer:{disabled:false, hidden:false}};
const session = {id:"11111111-1111-1111-1111-111111111111", active_turn_id:"sample-turn"};
const views = new Map([["view", {text:elements.input.value}]]);
const context = vm.createContext({
  $:id => elements[id], sending:new Set(), session, views, canQueue:true, noticeData:null, demo:false,
  viewKey:() => "view", rememberView() {}, renderSession() {}, resizeInput() {},
  isChat:() => true, commands:{invocation:async () => ({})}, uuid:() => "contract-request",
  api:async (method, path, body) => { captured = {method, path, body}; return {session, queue:[]}; },
  setSession() {}, updateQueue() {}, notice(key) { throw new Error(`Unexpected notice ${key}`); },
  sendRaw:async text => { raw = text; return true; }
});
vm.runInContext(match[0], context);
(async () => {
  await vm.runInContext("submitInput(false)", context);
  assert.equal(captured.method, "POST");
  assert.ok(captured.path.endsWith("/queue"));
  assert.equal(captured.body.action, "add");
  assert.equal(captured.body.text, "Fictional contract input");
  assert.equal(captured.body.request_id, "contract-request");
  assert.equal(elements.input.value, "", "Successful Send clears the input");
  context.demo = true;
  context.commands.invocation = async () => { throw new Error("Sample replay must not interpret input as a command"); };
  elements.input.value = "/unknown-sample-command";
  await vm.runInContext("submitInput(false)", context);
  assert.equal(captured.body.action, "add", "Demo replays even arbitrary slash-command text");
  assert.equal(elements.input.value, "");
  elements.input.value = "Fictional steer input";
  await vm.runInContext("submitInput(true)", context);
  assert.ok(captured.path.endsWith("/steer"));
  assert.equal(captured.body.turn_id, "sample-turn");
  context.isChat = () => false;
  elements.input.value = "Fictional terminal input";
  await vm.runInContext("submitInput(false)", context);
  assert.equal(raw, "Fictional terminal input\r", "Terminal uses raw input rather than chat queue");
  console.log("Demo UI contract: actual Send uses queue:add, Steer uses turn ID, Terminal uses raw input; controller assertions passed");
})().catch(error => { console.error(error); process.exitCode = 1; });

// A language refresh must keep demo identity, including a connected sample workspace.
const languageMatch = app.match(/  function renderLanguage\(\) \{[\s\S]*?\n  \}/);
assert.ok(languageMatch);
const labels = new Map();
const languageContext = vm.createContext({
  $: id => { if (!labels.has(id)) labels.set(id, {}); return labels.get(id); },
  demo:true, online:true, instance:"sample", project:null, languagePreference:"ko",
  i18n:{apply() {}, language:() => "ko"}, t:key => key,
  environment:() => ({version:"0.16.0"}), conversation:{localize() {}}, github:{render() {}}, agentConnections:{render() {}},
  renderInputPreferences() {}, renderAgents() {}, renderProjects() {}, updateEnvironment() {},
  renderSession() {}, renderNotice() {}, renderFolderBrowser() {}, renderImport() {},
  setTimeout() {}, resize() {}
});
vm.runInContext(languageMatch[0], languageContext);
vm.runInContext("renderLanguage()", languageContext);
assert.equal(labels.get("connection").textContent, "demo_connection");
languageContext.demo = false;
vm.runInContext("renderLanguage()", languageContext);
assert.equal(labels.get("connection").textContent, "connection_on");
console.log("Language refresh preserves Demo identity; normal connection status remains unchanged");
