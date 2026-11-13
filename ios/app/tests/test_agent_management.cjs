"use strict";
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
class Node {
 constructor(tag='div'){this.tag=tag;this.children=[];this.dataset={};this.classList={add(){}};}
 append(...rows){this.children.push(...rows);}
 replaceChildren(...rows){this.children=[...rows];}
 setAttribute(){}
}
const nodes=new Map(),created=[];
const document={getElementById:id=>{if(!nodes.has(id))nodes.set(id,new Node());return nodes.get(id);},querySelector:()=>new Node(),querySelectorAll:()=>[],createElement:tag=>{const n=new Node(tag);created.push(n);return n;}};
const window={BibimerI18n:{language:()=> 'ko',t:key=> 'translated:'+key,errorKey:()=>'',apply(){}}};
vm.runInNewContext(fs.readFileSync('ios/app/Resources/platform.js','utf8'),{window,document});
for(const agent of ['codex','claude','opencode','gemini']){
 const rows=nodes.get(agent+'-install').children;
 assert.equal(rows.length,3);const buttons=rows[1].children;
 assert.equal(buttons.length,1,'advanced iOS setup has no second login/version control');
 assert.equal(buttons[0].dataset.agentAction,'install');assert.equal(buttons[0].dataset.agent,agent);
 assert.equal(buttons[0].dataset.i18n,'agent_management_install');assert.equal(buttons[0].textContent,'translated:agent_management_install');
 assert.equal(rows[2].id,'agent-action-status-'+agent);
}
const html=fs.readFileSync('android/app/src/main/assets/index.html','utf8');
const setup=html.split('<section id="agent-setup-section"')[1].split('</section>')[0];
assert.ok(setup.includes('id="setup-agent-manage"'));assert.ok(!setup.includes('data-agent-action'));
assert.equal((html.match(/id="agent-connection-dialog"/g)||[]).length,1);
assert.ok(html.indexOf('id="codex-install"')>html.indexOf('id="agent-connection-installation"'));
const hooks=fs.readFileSync('ios/app/Resources/ui-hooks.js','utf8');
const install=hooks.slice(hooks.indexOf('  window.BibimerIOSAgentAction = async'),hooks.indexOf('  window.BibimerOpenLocalTerminal ='));
let project='project',calls=[],release=null;const manager={agent:'claude'},dialog={open:true,close(){this.open=false;calls.push('close');}};
const context=vm.createContext({window:{BibimerAgentActionStatus:()=>calls.push('status')},online:true,instance:'bridge',paused:false,agentConnections:{state:manager,dialog},projectKey:()=>project,uuid:()=> 'receipt',api:async()=>({session:{id:'install-session',project:{id:'project'}}}),refreshCatalog:async()=>calls.push('refresh'),selectSession:async(...args)=>calls.push(['select',...args]),tab:page=>calls.push(['tab',page]),notice:key=>calls.push(['error',key])});
vm.runInContext(install,context);
(async()=>{
 await context.window.BibimerIOSAgentAction('claude','install');
 assert.equal(dialog.open,false);assert.deepEqual(calls,["close","refresh",["select","project","install-session"],"status",["tab","work"]],'a requested installation leaves management only after receiving its terminal');
 dialog.open=true;calls=[];context.api=()=>new Promise(resolve=>release=resolve);
 const pending=context.window.BibimerIOSAgentAction('claude','install');assert.equal(dialog.open,true);project='other';release({session:{id:'old'}});await pending;
 assert.equal(dialog.open,true);assert.deepEqual(calls,[],'a late setup response cannot replace a different project');
 project='project';context.api=async()=>{throw {key:'error_fixture'};};calls=[];await context.window.BibimerIOSAgentAction('claude','install');assert.equal(dialog.open,true);assert.deepEqual(calls,[["error","error_fixture"]]);
 console.log('PASS iOS agent manager: one setup destination, localized advanced install/repair only, preserved fixed actions, terminal handoff after success, failure and stale project guards');
})().catch(error=>{console.error(error);process.exitCode=1;});
