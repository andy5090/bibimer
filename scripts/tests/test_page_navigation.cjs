"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const source=fs.readFileSync("android/app/src/main/assets/app.js","utf8");
const html=fs.readFileSync("android/app/src/main/assets/index.html","utf8");
const iosHooks=fs.readFileSync("ios/app/Resources/ui-hooks.js","utf8");
const functions=["tab","closePage","openSetupGuide","openInitialPage"].map(name=>{
  const match=source.match(new RegExp("  function "+name+"\\([^]*?\\n  \\}"));assert.ok(match,name);return match[0];
}).join("\n");
function fixture(paired=false,demo=false){
 const nodes=new Map(),events=[];
 const $=id=>{if(!nodes.has(id))nodes.set(id,{hidden:false,scrollTop:0,open:false,attributes:{},classes:new Set(),
  classList:{toggle(name,on){on?nodes.get(id).classes.add(name):nodes.get(id).classes.delete(name);}},
  setAttribute(k,v){this.attributes[k]=v;},focus(){events.push(["focus",id]);},scrollIntoView(){events.push(["scroll",id]);}});return nodes.get(id);};
 const session={id:"running",state:"running",mode:"chat"},draft={text:"작성 중인 초안",queue:["대기 중"]};
 const ctx=vm.createContext({$,events,agentConnections:{open:(agent,options)=>events.push(["manager",agent,options.installation])},currentTab:"work",pageHistory:[],demo,environment:()=>({paired}),session,draft,
  closeUsageDetails(){},pickers:{close(){},sync(){}},sidebar:{close(){}},voiceSettings:{render(){}},
  speechOutput:{render(){},syncContext(){}},voiceInput:{update(){}},browserConsent:{render(){},refresh(){}},
  updateTerminalFullscreen(){},updateTerminalKeys(){},updateBackState(){},updateEnvironment(){},setTimeout:fn=>fn(),resize(){}});
 vm.runInContext(functions,ctx);return {ctx,$,session,draft,events};
}
{
 const {ctx,$}=fixture();ctx.openInitialPage();assert.equal(ctx.currentTab,"setup");assert.equal($("work").hidden,true);
 assert.equal($("page-back").hidden,false);assert.equal(ctx.pageHistory.length,0);
 ctx.closePage();assert.equal(ctx.currentTab,"work","Initial guide can be dismissed without claiming a connection");
}
for(const [paired,demo] of [[true,false],[false,true]]){
 const {ctx,$}=fixture(paired,demo);ctx.openInitialPage();assert.equal(ctx.currentTab,"work");
 assert.equal($("app-settings-open").hidden,false);assert.equal($("page-back").hidden,true);
}
{
 const {ctx,$,session,draft}=fixture(true);ctx.openInitialPage();
 ctx.tab("settings");assert.equal($("settings").hidden,false);assert.equal($("work").hidden,true);
 assert.equal($("sidebar-open").hidden,true);assert.equal($("app-settings-open").hidden,true);
 assert.ok($("app").classes.has("auxiliary-page"));
 $("settings").scrollTop=317;ctx.openSetupGuide("claude");
 assert.equal(ctx.currentTab,"settings");assert.deepEqual(ctx.events.at(-1),["manager","claude",true],"Agent-specific details open the shared manager without adding a setup page");
 ctx.openSetupGuide();assert.equal(ctx.currentTab,"setup");
 ctx.closePage();assert.equal(ctx.currentTab,"settings");assert.equal($("settings").scrollTop,317);
 ctx.closePage();assert.equal(ctx.currentTab,"work");assert.equal(ctx.pageHistory.length,0);
 assert.equal(ctx.session,session);assert.equal(ctx.draft,draft);assert.equal(draft.text,"작성 중인 초안");assert.deepEqual(draft.queue,["대기 중"]);
 assert.equal($("app").classes.has("auxiliary-page"),false);
 ctx.tab("settings");ctx.tab("settings");assert.equal(ctx.pageHistory.length,1,"Repeated opens do not trap Back");
 ctx.openSetupGuide();ctx.tab("work");assert.equal(ctx.pageHistory.length,0,"Pairing, session or notification destination returns directly to Work");
 ctx.tab("invalid");assert.equal(ctx.currentTab,"work");
 // Android Back dismisses an overlay first, then the guide and settings in order.
 ctx.window={};ctx.document={querySelectorAll:()=>[],querySelector:()=>null};ctx.commands={dismiss(){}};
 $("commands").hidden=true;ctx.terminalFullscreen=false;ctx.native={setBackHandling(){}};
 vm.runInContext(source.slice(source.indexOf("  window.BibimerBack = () => {"),source.indexOf("  const backObserver =")),ctx);
 ctx.tab("settings");ctx.openSetupGuide();
 let dismissed=0;ctx.document.querySelectorAll=()=>[{id:"overlay",close(){dismissed++;}}];
 assert.equal(ctx.window.BibimerBack(),true);assert.equal(dismissed,1);assert.equal(ctx.currentTab,"setup");
 ctx.document.querySelectorAll=()=>[];assert.equal(ctx.window.BibimerBack(),true);assert.equal(ctx.currentTab,"settings");
 assert.equal(ctx.window.BibimerBack(),true);assert.equal(ctx.currentTab,"work");assert.equal(ctx.window.BibimerBack(),false);
 let keydown;ctx.document.addEventListener=(type,listener)=>{if(type==="keydown")keydown=listener;};
 vm.runInContext(source.slice(source.indexOf('  document.addEventListener("keydown", event => {'),source.indexOf('  window.BibimerRefreshLanguage =')),ctx);
 ctx.tab("settings");let prevented=0;
 keydown({key:"Escape",isComposing:true,preventDefault(){prevented++;}});assert.equal(ctx.currentTab,"settings");
 keydown({key:"Escape",defaultPrevented:true,preventDefault(){prevented++;}});assert.equal(ctx.currentTab,"settings");
 keydown({key:"Escape",preventDefault(){prevented++;}});assert.equal(ctx.currentTab,"work");assert.equal(prevented,1);

}
{
 const {ctx,$,session,draft}=fixture(true);
 ctx.iosTerminalTools={update(){}};ctx.iosTextGestures=[];
 const authenticationChecks=[];ctx.iosAuthenticationReturns=0;
 ctx.iosRefreshAuthentication=reason=>authenticationChecks.push(reason);
 const wrapper=iosHooks.match(/  if \(iosTerminalTools\) \{[^]*?\n  \}/);assert.ok(wrapper);
 vm.runInContext(wrapper[0],ctx);
 ctx.openInitialPage();assert.equal(ctx.pageHistory.length,0);
 ctx.tab("settings");ctx.openSetupGuide();
 ctx.closePage();assert.equal(ctx.currentTab,"settings");
 assert.equal(ctx.pageHistory.length,1,"iOS must forward replace:true instead of pushing the guide again");
 ctx.closePage();assert.equal(ctx.currentTab,"work");
 assert.equal($("page-back").hidden,true);assert.equal($("sidebar-open").hidden,false);
 assert.equal(ctx.pageHistory.length,0);assert.equal(ctx.session,session);assert.equal(ctx.draft,draft);
 assert.deepEqual(authenticationChecks,["settings:1","settings:2"],"Explicit iOS Settings returns request scoped authentication status");
}
assert.ok(!html.includes('class="bottom-nav"'));assert.ok(!html.match(/id="tab-(work|setup|settings)"/));
for(const id of ["app-settings-open","page-back","setup-guide-open","agent-install-guide"])assert.ok(html.includes('id="'+id+'"'));
assert.ok(html.indexOf('id="forget"')>html.indexOf('id="settings"'),"Connection management lives in Settings");
assert.ok(html.includes('id="setup-agent-manage"'));
const setupAgent=html.split('id="agent-setup-section"')[1].split('</section>')[0];
assert.ok(!setupAgent.includes('agent-install'));assert.ok(!setupAgent.includes('data-agent-action'));
for(const agent of ["codex","claude","opencode","gemini"])assert.ok(html.indexOf('id="'+agent+'-install"')>html.indexOf('id="agent-connection-dialog"'));
assert.ok(!html.match(/data-agent="(?:codex|claude|opencode|gemini)" data-agent-action="(?:login|status|version)"/),"The setup guide reuses account management");
console.log("PASS page navigation: initial guide, paired/offline and demo Work entry, Settings/guide Back stack and scroll, overlay priority, preserved running session/draft/queue, no footer and shared connection management");
