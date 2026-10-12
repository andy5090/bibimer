"use strict";
// Review dialog controller tests without a browser, Android or private review credentials.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const assets = path.join(__dirname, "../../android/app/src/main/assets");
const app = fs.readFileSync(path.join(assets, "app.js"), "utf8");
const html = fs.readFileSync(path.join(assets, "index.html"), "utf8");
const start = app.indexOf('  $("review-access-open").addEventListener');
const end = app.indexOf('  $("edit-project").addEventListener', start);
assert.ok(start > 0 && end > start);
const controller = app.slice(start, end);
const elements = new Map();
function element(id) {
  if (!elements.has(id)) elements.set(id, {value:"", textContent:"", open:false, focused:false, handlers:{},
    addEventListener(name, handler) { this.handlers[name] = handler; },
    focus() { this.focused = true; }, showModal() { this.open = true; },
    close() { this.open = false; this.handlers.close?.(); }
  });
  return elements.get(id);
}
let configured = true, keepDrafts = true, accepted = false, attempts = 0, submitted, cancellation = 0;
const context = vm.createContext({
  $:element, demo:false, currentTab:"settings", generation:0, paused:false, retryTimer:null, window:{},
  t:key => key, clearTimeout() {}, environment:() => ({reviewAccessConfigured:configured, paired:false}),
  keepNormalDraftViews:() => keepDrafts, connect() {}, notice() {},
  native:{enterReviewDemo(code) { attempts++; submitted = code; return accepted; }, cancelPoll() { cancellation++; }}
});
vm.runInContext(controller, context);
const open = () => element("review-access-open").handlers.click();
const submit = () => element("review-access-form").handlers.submit({preventDefault() {}});
open();
assert.equal(element("review-access-dialog").open, true);
assert.equal(element("review-access-code").focused, true);
element("review-access-code").value = "fictional-incorrect-code";
submit();
assert.equal(attempts, 1);
assert.equal(element("review-access-status").textContent, "review_access_invalid");
assert.equal(element("review-access-code").value, "");
assert.equal(context.paused, false);
configured = false;
element("review-access-code").value = "fictional-unit-code";
submit();
assert.equal(attempts, 1, "Unconfigured build does not even attempt native entry");
assert.equal(element("review-access-status").textContent, "review_access_unavailable");
assert.equal(element("review-access-code").value, "");
configured = true; keepDrafts = false;
element("review-access-code").value = "fictional-unit-code";
submit();
assert.equal(attempts, 1, "Draft preservation failure blocks entry");
assert.equal(element("review-access-status").textContent, "demo_drafts_failed");
assert.equal(element("review-access-code").value, "");
keepDrafts = true;
element("review-access-code").value = "fictional-cancelled-code";
element("review-access-cancel").handlers.click();
assert.equal(element("review-access-code").value, "");
assert.equal(element("review-access-dialog").open, false);
assert.equal(element("review-access-open").focused, true);
open(); accepted = true;
element("review-access-code").value = " fictional-unit-code ";
submit();
assert.equal(submitted, "fictional-unit-code");
assert.equal(context.paused, true);
assert.equal(context.generation, 1);
assert.equal(cancellation, 1);
assert.equal(element("review-access-dialog").open, false);
assert.equal(element("review-access-code").value, "");
context.window.BibimerReviewEntryFailed();
assert.equal(context.paused, false, "Failed native transition resumes normal UI");
assert.ok(/id="review-access-code"[^>]*type="password"[^>]*maxlength="128"/.test(html), "Code is masked and bounded");
assert.ok(!/id="demo-(welcome|setup|settings)"/.test(html), "No public Try demo entry");
assert.ok(html.includes('id="review-access-open"') && html.includes('id="open-termux"') && html.includes('id="quick-connect"'), "Explicit review access coexists with normal setup");
console.log("Review UI: masked code, native rejection, unavailable build, draft refusal, cancel cleanup and authorized entry checks passed");
