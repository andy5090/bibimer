"use strict";
const fs = require("node:fs"), vm = require("node:vm"), assert = require("node:assert/strict"), path = require("node:path");
const assets = path.join(__dirname, "../../android/app/src/main/assets");
const source = fs.readFileSync(path.join(assets, "app.js"), "utf8");
const functions = ["absoluteFolder", "parentFolder", "newProjectPath", "rememberProjectLocation"].map(name => {
  const match = source.match(new RegExp("  function " + name + "\\([^]*?\\n  \\}"));
  assert.ok(match, name); return match[0];
}).join("\n");
let persisted, fail = false, saves = 0;
const context = vm.createContext({window:{}, demo:false, projectLocation:{parent:"", folder:""},
  native:{setProjectLocation(parent, folder) { if (fail) return false; saves++; persisted = {parent, folder}; return true; }}});
vm.runInContext(functions, context);
assert.equal(context.newProjectPath(), "~/projects/");
context.rememberProjectLocation("/workspace/한글 project");
assert.deepEqual(persisted, {parent:"/workspace", folder:"/workspace/한글 project"});
assert.equal(context.newProjectPath(), "/workspace/");
context.rememberProjectLocation("/workspace/한글 project");assert.equal(saves, 1, "same selection need not write again");
context.rememberProjectLocation("/clones/", true);
assert.deepEqual(persisted, {parent:"/clones", folder:"/clones"});
fail = true;context.rememberProjectLocation("/rejected", true);assert.equal(context.newProjectPath(), "/clones/");fail = false;
for (const value of [null, undefined, "relative", "~/projects", "/bad\npath"]) context.rememberProjectLocation(value, true);
assert.equal(context.newProjectPath(), "/clones/");
context.rememberProjectLocation("/root-project");assert.equal(context.newProjectPath(), "/");
const normal = {...persisted};context.demo = true;context.projectLocation = {parent:"", folder:""};
assert.equal(context.newProjectPath(), "/demo/projects/");
context.rememberProjectLocation("/demo/samples", true);assert.deepEqual(persisted, normal, "demo never changes normal preferences");
vm.runInContext(fs.readFileSync(path.join(assets, "github.js"), "utf8"), context);
(async () => {
  const remembered = [], requests = [];
  const github = Object.create(context.window.BibimerGitHub.prototype);
  let reply = {job:{id:"new", path:"/canonical/parent/new", state:"cloning"}};
  Object.assign(github, {loading:false, epoch:0, state:{login:{state:"idle"}, jobs:[]}, pending:{request_id:"new"},
    context:()=>({online:true,supported:true}), request:async data=>{requests.push(data);return reply;},
    actions:{rememberClone:path=>remembered.push(path),refresh:()=>{}}, render:()=>{},schedule:()=>{}});
  await github.perform("clone", {parent:"~/alias"});
  assert.deepEqual(remembered, ["/canonical/parent/new"], "typed clone parent is remembered from canonical accepted response");
  reply = {job:{id:"bad", path:"/failed/new", state:"failed"}};
  await github.perform("clone", {});assert.equal(remembered.length, 1, "failed clone never changes default");
  github.pending = {request_id:"recovered"};
  github.accept({login:{state:"idle"}, jobs:[{id:"older",path:"/old/job",state:"complete"}, {id:"recovered",path:"/restored/new",state:"complete"}]});
  assert.deepEqual(remembered, ["/canonical/parent/new", "/restored/new"], "recover a lost reply only for this pending clone");
  github.accept({login:{state:"idle"},jobs:[{id:"older",path:"/old/job",state:"complete"}]});assert.equal(remembered.length, 2);
  let release;github.request=()=>new Promise(resolve=>{release=resolve;});
  const late=github.perform("clone", {});github.epoch++;release({job:{id:"late",path:"/stale/new",state:"cloning"}});await late;
  assert.equal(remembered.length, 2, "stale response cannot overwrite a later selection");
  console.log("Project locations: shared parent/browse defaults, root/Unicode, failed save, demo isolation, typed clone/canonical path, lost reply and stale response passed");
})().catch(error=>{console.error(error);process.exitCode=1;});
