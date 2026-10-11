"use strict";
// Pure snapshot unit tests. No browser, DOM, Android or user data is accessed.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const source = fs.readFileSync(path.join(__dirname, "../../android/app/src/main/assets/app.js"), "utf8");
const functions = ["keepNormalDraftViews", "restoreNormalDraftViews"].map(name => {
  const match = source.match(new RegExp("  function " + name + "\\(\\) \\{[\\s\\S]*?\\n  \\}"));
  assert.ok(match, `${name} exists`); return match[0];
}).join("\n");
let held = null, saves = 0, reads = 0, remembered = 0, failure;
const native = {
  saveNormalDraftViews(snapshot) { saves++; if (snapshot.length > 262144) return false; held = snapshot; return true; },
  takeNormalDraftViews() { reads++; const result = held || "{}"; held = null; return result; }
};
const views = new Map([
  ["project/session-1", {text:"Unsent normal text", start:3, end:9, agent:"codex", mode:"chat", questions:{approval:{choice:{value:"Draft answer", selections:["Mint"]}}}, messages:["EXCLUDED"], token:"EXCLUDED", queue:["EXCLUDED"]}],
  ["project/session-2", {text:"Second unsent text", start:0, end:4, agent:"claude", mode:"chat", questions:{}}],
  [null, {text:"Unkeyed initial view", questions:{}}]
]);
const context = vm.createContext({native, views, demo:false, noticeData:null,
  rememberView() { remembered++; }, notice(key) { failure = key; }});
vm.runInContext(functions, context);
assert.equal(vm.runInContext("keepNormalDraftViews()", context), true);
assert.equal(remembered, 1);
assert.equal(saves, 1);
assert.ok(!held.includes("EXCLUDED"));
assert.ok(!held.includes("Unkeyed initial view"), "Initial view without a session key cannot block valid draft preservation");
const saved = held;
views.clear();
context.demo = true;
vm.runInContext("restoreNormalDraftViews()", context);
assert.equal(reads, 0, "Demo cannot access normal draft snapshot");
assert.equal(views.size, 0);
context.demo = false;
vm.runInContext("restoreNormalDraftViews()", context);
assert.equal(reads, 1);
assert.equal(held, null, "Native getter is one-shot");
assert.equal(views.size, 2);
assert.equal(views.get("project/session-1").text, "Unsent normal text");
assert.equal(views.get("project/session-1").start, 3);
assert.equal(views.get("project/session-1").end, 9);
assert.equal(views.get("project/session-1").questions.approval.choice.value, "Draft answer");
assert.equal(views.get("project/session-1").questions.approval.choice.selections[0], "Mint");
assert.equal(views.get("project/session-2").text, "Second unsent text");
assert.equal(views.get("project/session-2").agent, "claude");
views.set("large/session", {text:"x".repeat(262145), questions:{}});
assert.equal(vm.runInContext("keepNormalDraftViews()", context), false, "Oversized snapshot blocks entry");
assert.equal(failure, "demo_drafts_failed");
assert.equal(held, null, "Rejected save does not replace previous snapshot");
views.delete("large/session");
native.saveNormalDraftViews = () => { throw new Error("Simulated native failure"); };
assert.equal(vm.runInContext("keepNormalDraftViews()", context), false);
assert.equal(failure, "demo_drafts_failed");
context.rememberView = () => { throw new Error("Simulated view capture failure"); };
assert.equal(vm.runInContext("keepNormalDraftViews()", context), false);
assert.equal(failure, "demo_drafts_failed");
console.log("Demo drafts: normal-only restore, all views/questions/selections, content filtering and entry failure checks passed");
