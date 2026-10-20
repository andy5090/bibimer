"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function linksFor(lines, requested) {
  let provider;
  const opened = [];
  const rows = lines.map(({text,wrapped = false}) => {
    const cells = [];
    for (const character of text) {
      const width = /[가-힣]/.test(character) ? 2 : 1;
      cells.push({getChars:()=>character,getWidth:()=>width});
      if (width === 2) cells.push({getChars:()=>"",getWidth:()=>0});
    }
    return {length:cells.length,isWrapped:wrapped,getCell:index=>cells[index],translateToString:trim=>trim ? text.trimEnd() : text};
  });
  const context = {$:()=>({dataset:{},addEventListener(){}}),permissionModes:{codex:["inherit","read-only","workspace-write","yolo"]},renderModels:()=>{},renderSettings:()=>{},renderSession:()=>{},worktreeCreator:{render(){}},term:{buffer:{active:{length:rows.length,getLine:index=>rows[index]}},registerLinkProvider:value=>{provider=value;}},
    native:{openLink:url=>opened.push(url)},window:{},environment:()=>({selfTest:false})};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,"../Resources/ui-hooks.js"),"utf8"),context);
  let links;
  provider.provideLinks(requested,result=>{links=result;});
  return {links,opened};
}

const url = "https://example.invalid/auth?code=123456789&next=%2Fcallback";
const wrapped = linksFor([
  {text:"Open " + url.slice(0,18)},
  {text:url.slice(18,39),wrapped:true},
  {text:url.slice(39),wrapped:true}
],2);
assert.equal(wrapped.links.length,1);
assert.equal(wrapped.links[0].text,url,"A wrapped sign-in URL must not be truncated to the first visual row");
assert.equal(wrapped.links[0].range.start.x,6);
assert.equal(wrapped.links[0].range.start.y,1);
assert.equal(wrapped.links[0].range.end.y,3);
wrapped.links[0].activate({},url);
assert.deepEqual(wrapped.opened,[url]);

const korean = linksFor([{text:"로그인 https://example.invalid/"}],1);
assert.equal(korean.links[0].range.start.x,8,"Korean terminal cells occupy two columns");
assert.equal(korean.links[0].text,"https://example.invalid/");
assert.equal(linksFor([{text:"No links"}],1).links.length,0);
assert.equal(linksFor([{text:"javascript:alert(1)"}],1).links.length,0);
assert.equal(linksFor([{text:"https://example.invalid/"}],4).links,undefined);
console.log("terminal link behavior: 5 cases passed");
