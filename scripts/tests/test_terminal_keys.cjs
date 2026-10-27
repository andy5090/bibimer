"use strict";
// Check the actual terminal control bytes without a bridge or provider login.
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm"), assert = require("node:assert/strict");
const source = fs.readFileSync(path.resolve(__dirname, "../../android/app/src/main/assets/app.js"), "utf8");
const nodes = new Map();
function node(id, dataset = {}) {
  const value = {dataset, hidden: true, attributes: {}, listeners: {},
    setAttribute(name, text) { this.attributes[name] = text; },
    addEventListener(name, listener) { this.listeners[name] = listener; }};
  nodes.set(id, value); return value;
}
for (const key of ["escape", "tab", "up", "down", "left", "right", "enter", ...Array.from({length: 12}, (_, i) => "f" + (i + 1))]) node(key, {key});
node("ctrl", {modifier: "ctrl"}); node("alt", {modifier: "alt"}); node("shift", {modifier: "shift"});
node("terminal-function-keys"); node("terminal-functions-toggle"); node("terminal-keys").scrollIntoView = () => {};
const buttons = [...nodes.values()].filter(value => value.dataset.key || value.dataset.modifier).concat(nodes.get("terminal-functions-toggle"));
const ctx = vm.createContext({$: id => nodes.get(id), online: true, paused: false, switchingProject: false, currentTab: "work",
  instance: "bridge", projectId: "project", projectKey: () => ctx.projectId,
  session: {id: "one", state: "running", mode: "terminal", kind: "terminal"}, isChat: () => ctx.session?.mode === "chat",
  terminalCtrl: false, terminalAlt: false, terminalShift: false, terminalKeysContext: "", sent: [],
  sendRaw: text => { ctx.sent.push(text); return Promise.resolve(true); },
  term: {modes: {applicationCursorKeysMode: false}, focus() {}},
  document: {querySelectorAll: selector => selector.includes("[data-key]") ? buttons.filter(button => button.dataset.key)
    : selector.includes("[data-modifier]") ? buttons.filter(button => button.dataset.modifier) : buttons},
});
vm.runInContext(source.slice(source.indexOf("  const keys = {escape:"), source.indexOf("  window.BibimerPause =")), ctx);
const encode = ctx.modifiedTerminalData, esc = "\x1b";
for (const [key, expected] of Object.entries({up: "[A", down: "[B", left: "[D", right: "[C", f1: "OP", f2: "OQ", f3: "OR", f4: "OS", f5: "[15~", f6: "[17~", f7: "[18~", f8: "[19~", f9: "[20~", f10: "[21~", f11: "[23~", f12: "[24~"})) {
  vm.runInContext("updateTerminalKeys()", ctx); nodes.get(key).listeners.click();
  assert.equal(ctx.sent.pop(), esc + expected, key);
}
for (const [input, expected] of [["c", "\x03"], ["C", "\x03"], [" ", "\x00"], ["@", "\x00"], ["[", esc], ["\\", "\x1c"], ["]", "\x1d"], ["^", "\x1e"], ["_", "\x1f"], ["?", "\x7f"], ["ß", "ß"], ["한", "한"], ["😀", "😀"]]) {
  assert.equal(encode(input, true, false), expected, "Ctrl " + input);
}
assert.equal(encode("c", true, true), esc + "\x03");
assert.equal(encode("x", false, true), esc + "x");
for (const sequence of ["[A", "OD", "OP", "[24~"]) {
  const [prefix, tail] = sequence.startsWith("[24") ? ["[24;", "~"] : ["[1;", sequence.at(-1)];
  for (const [ctrl, alt, param] of [[false, true, 3], [true, false, 5], [true, true, 7]]) {
    assert.equal(encode(esc + sequence, ctrl, alt), esc + prefix + param + tail);
  }
}
assert.equal(encode(esc + "[1;2D", true, false), esc + "[1;6D", "Preserve physical Shift");
assert.equal(encode(esc + "[24;3~", true, false), esc + "[24;7~", "Preserve physical Alt");
for (const input of ["pasted command", "한글 입력", esc + "[200~paste\ntext" + esc + "[201~"]) assert.equal(encode(input, true, true), input, "Pastes stay literal");
for (const [input, expected] of [["a","A"],["1","!"],["[","{"],["/","?"],["ß","ß"],["한","한"],["\t",esc+"[Z"],[esc+"[A",esc+"[1;2A"],[esc+"OP",esc+"[1;2P"],[esc+"[24~",esc+"[24;2~"]]) assert.equal(encode(input,false,false,true),expected,"Shift "+input);
assert.equal(encode(esc+"[24~",true,true,true),esc+"[24;8~","All three modifiers combine");
assert.equal(encode(esc+"[1;2D",false,false,true),esc+"[1;2D","Shift is not applied twice");
assert.equal(encode("c",true,false,true),"\x03");
assert.equal(encode("2",true,false,true),"\x00");
assert.equal(encode("[",true,false,true),esc);
assert.equal(encode("a phrase 한글",true,true,true),"a phrase 한글","Shift does not rewrite a paste");
ctx.term.modes.applicationCursorKeysMode = true;
nodes.get("left").listeners.click(); assert.equal(ctx.sent.pop(), esc + "OD", "Application cursor mode");
nodes.get("ctrl").listeners.click(); assert.equal(ctx.terminalCtrl, true); assert.equal(ctx.sent.length, 0);
nodes.get("alt").listeners.click(); assert.equal(ctx.terminalAlt, true); assert.equal(ctx.sent.length, 0);
nodes.get("right").listeners.click(); assert.equal(ctx.sent.pop(), esc + "[1;7C");
assert.equal(ctx.terminalCtrl, true); assert.equal(ctx.terminalAlt, true, "Modifiers stay held after a key");
nodes.get("alt").listeners.click(); assert.equal(ctx.terminalCtrl, true, "Alt release does not release Ctrl");
ctx.sendTerminalData("c"); assert.equal(ctx.sent.pop(), "\x03", "Held Ctrl plus c replaces the shortcut button");
ctx.sendTerminalData("d"); assert.equal(ctx.sent.pop(), "\x04", "Held Ctrl applies to subsequent keys");
ctx.sendTerminalData("pasted text"); assert.equal(ctx.sent.pop(), "pasted text"); assert.equal(ctx.terminalCtrl, true);
nodes.get("ctrl").listeners.click(); ctx.sendTerminalData("c"); assert.equal(ctx.sent.pop(), "c", "A second tap releases Ctrl");
nodes.get("alt").listeners.click(); nodes.get("alt").listeners.click(); assert.equal(ctx.terminalAlt, false, "Second tap cancels");
nodes.get("shift").listeners.click(); ctx.sendTerminalData("a"); assert.equal(ctx.sent.pop(),"A");
nodes.get("tab").listeners.click(); assert.equal(ctx.sent.pop(),esc+"[Z"); assert.equal(ctx.terminalShift,true);
nodes.get("shift").listeners.click(); ctx.sendTerminalData("a"); assert.equal(ctx.sent.pop(),"a");
for (const [property, value] of [["currentTab", "settings"], ["online", false], ["paused", true], ["switchingProject", true], ["projectId", "other"]]) {
  nodes.get("ctrl").listeners.click(); nodes.get("shift").listeners.click(); nodes.get("terminal-functions-toggle").listeners.click();
  assert.equal(nodes.get("terminal-function-keys").hidden, false);
  const previous = ctx[property]; ctx[property] = value; ctx.updateTerminalKeys();
  assert.equal(ctx.terminalCtrl, false, property); assert.equal(ctx.terminalShift,false,property); assert.equal(nodes.get("terminal-function-keys").hidden, true, property);
  ctx[property] = previous; ctx.updateTerminalKeys();
}
for (const next of [{id: "two", state: "running", mode: "terminal"}, {id: "one", state: "exited", mode: "terminal"}, {id: "one", state: "running", mode: "chat"}, {id: "browser", state: "running", kind: "browser"}]) {
  nodes.get("ctrl").listeners.click(); nodes.get("shift").listeners.click(); ctx.session = next; ctx.updateTerminalKeys();
  assert.equal(ctx.terminalCtrl, false); assert.equal(ctx.terminalShift,false);
  if (!ctx.terminalKeysEnabled()) { ctx.sendTerminalData("x"); nodes.get("enter").listeners.click(); assert.equal(ctx.sent.length, 0, "Inactive contexts cannot send"); }
  ctx.session = {id: "one", state: "running", mode: "terminal"}; ctx.updateTerminalKeys();
}
console.log("PASS terminal key encoding, held modifier toggles, application mode and context guards");
