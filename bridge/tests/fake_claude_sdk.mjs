/** Controlled public Agent SDK contract fixture. Never invokes a model or CLI. */
import {writeFileSync,readFileSync,existsSync} from 'node:fs';
import assert from 'node:assert/strict';
const saved='11111111-1111-4111-8111-111111111111', fork='22222222-2222-4222-8222-222222222222';
const row=id=>({sessionId:id,cwd:id.startsWith('99999999')?process.cwd()+'/other':process.cwd(),summary:'Claude saved session',lastModified:1790564400000,fileSize:1024});
export async function listSessions(options) { assert.equal(options.dir,process.cwd()); assert.equal(options.includeWorktrees,false); return [row(saved)]; }
export async function getSessionInfo(id,options) { assert.equal(options.dir,process.cwd());return row(id); }
export async function forkSession(id,options) { assert.equal(id,saved); assert.equal(options.dir,process.cwd()); return {sessionId:fork}; }
export async function getSessionMessages(id,options) {
  assert.equal(options.dir,process.cwd());
  return [
    {type:'user',uuid:'old-user',message:{role:'user',content:[{type:'text',text:'Saved Claude prompt'}]}},
    {type:'assistant',uuid:'old-reply',message:{id:'old-assistant',role:'assistant',content:[{type:'text',text:'## Claude history\n```python\nprint("restored")\n```'},{type:'thinking',thinking:'RAW_THINKING_MUST_NOT_APPEAR'},{type:'tool_use',id:'old-tool',name:'Bash',input:{command:'old command'}}]}},
    {type:'user',uuid:'old-result',message:{role:'user',content:[{type:'tool_result',tool_use_id:'old-tool',content:'old output'}]}},
  ];
}
export function query({prompt,options}) {
  assert.equal(options.cwd,process.cwd());
  assert.deepEqual(options.settingSources,['user','project','local']);
  if (options.persistSession===false) return {
    supportedCommands:async()=>[{name:'review',description:'Project review',argumentHint:'[files]'},
      {name:'context',description:'Session context',builtin:true}],
    supportedModels:async()=>[
      {value:'sonnet',displayName:'Test Sonnet',supportsEffort:true,supportedEffortLevels:['low','medium','high']},
      {value:'opus',displayName:'Test Opus',supportsEffort:true,supportedEffortLevels:['low','medium','high','max']},
      {value:'haiku',displayName:'Test Haiku',supportsEffort:false}],
    close:()=>{}
  };
  assert.ok([undefined,'default','acceptEdits','plan','bypassPermissions'].includes(options.permissionMode));
  assert.equal(options.allowDangerouslySkipPermissions,options.permissionMode==='bypassPermissions'?true:undefined);
  writeFileSync('claude-options.json',JSON.stringify({permissionMode:options.permissionMode,allowDangerouslySkipPermissions:options.allowDangerouslySkipPermissions,model:options.model,effort:options.effort}));
  assert.ok(options.pathToClaudeCodeExecutable);
  assert.ok(options.resume || options.sessionId);
  let unblock, interrupted=false;
  const waiting=new Promise(resolve=>{unblock=resolve;});
  const controller=new AbortController();
  const iterator=(async function*(){
    const first=await prompt.next(), input=first.value, text=input.message.content[0].text;
    writeFileSync('claude-input.json',JSON.stringify({text}));
    const id=options.resume || options.sessionId;
    writeFileSync('claude-turn-count',String(existsSync('claude-turn-count')?Number(readFileSync('claude-turn-count','utf8'))+1:1));
    yield {type:'system',subtype:'init',session_id:id};
    if (text==='/context') { yield {type:'result',subtype:'success',session_id:id,is_error:false,result:'Context: controlled session'}; return; }
    yield {type:'stream_event',session_id:id,event:{type:'message_start',message:{id:'msg-live'}}};
    yield {type:'stream_event',session_id:id,event:{type:'content_block_delta',delta:{type:'text_delta',text:'Streaming **Claude**'}}};
    if(text==='approval' || text==='question') {
      const name=text==='question'?'AskUserQuestion':'Bash';
      const data=text==='question'?{questions:[{question:'Which checks?',header:'Checks',multiSelect:true,options:[{label:'Unit',description:'Unit tests'},{label:'UI',description:'UI tests'}]}]}:{command:'controlled command'};
      const result=await options.canUseTool(name,data,{toolUseID:'live-tool',signal:controller.signal});
      if(text==='approval' && result.behavior==='allow') writeFileSync('claude-approved','once');
      if(text==='question' && result.behavior==='allow') { assert.equal(result.updatedInput.answers['Which checks?'],'Unit, UI');writeFileSync('claude-answers','both'); }
    } else if(text==='wait') await waiting;
    yield {type:'assistant',uuid:'live-response',session_id:id,message:{id:'msg-live',role:'assistant',content:[{type:'text',text:'## Claude result\n**Ready** for follow-up'},{type:'tool_use',id:'edit-tool',name:'Edit',input:{file_path:'example.py',old_string:'old',new_string:'new'}}]}};
    yield {type:'user',uuid:'live-tool-result',session_id:id,message:{role:'user',content:[{type:'tool_result',tool_use_id:'edit-tool',content:'file edited'}]}};
    yield {type:'result',subtype:'success',session_id:id,is_error:false};
  })();
  iterator.interrupt=async()=>{interrupted=true;controller.abort();unblock();};
  iterator.close=()=>{controller.abort();unblock();};
  return iterator;
}
