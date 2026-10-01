/** Official Claude Agent SDK -> Bibimer's stdio protocol. No transcript guessing.
 * History uses the SDK's file APIs. Queries start only on explicit turn/start.
 * The SDK and the user's working Claude CLI are separate, optional prerequisites.
 */
import {realpathSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {randomUUID} from 'node:crypto';
import {createInterface} from 'node:readline';

const sdk = await import(pathToFileURL(process.argv[3]).href);
const cwd = realpathSync(process.cwd()), executable = process.argv[2];
const emit = value => process.stdout.write(JSON.stringify(value)+'\n');
const text = value => typeof value === 'string' ? value.slice(0,32768) : '';
let thread = null, turn = null, active = null, persisted = false, interrupted = false;
const approvals = new Map(), tools = new Map(), streams = new Map();
const notify = (method, params) => emit({method,params:{threadId:thread,turnId:turn,...params}});
const metadata = row => ({id:row.sessionId,cwd:row.cwd,name:row.customTitle || row.summary || '',updatedAt:row.lastModified/1000,ephemeral:false,source:'appServer',status:{type:'notLoaded'}});
function checkedPath(path) { try { return realpathSync(path) === cwd; } catch { return false; } }
async function source(id) {
  if (!/^[a-f0-9-]{36}$/i.test(id)) throw Error('error_import_invalid');
  const value = await sdk.getSessionInfo(id,{dir:cwd});
  if (!value || !checkedPath(value.cwd)) throw Error('error_import_project');
  if (value.fileSize > 64*1024*1024) throw Error('error_history_large');
  return value;
}
function toolItem(block, status='inProgress', output='') {
  const input = block.input || {}, item = {id:block.id,type:'tool',tool:block.name,status,result:text(output)};
  if (block.name === 'Bash') Object.assign(item,{type:'commandExecution',command:text(input.command),aggregatedOutput:text(output)});
  if (['Edit','Write','MultiEdit'].includes(block.name)) {
    const edits = block.name === 'MultiEdit' ? input.edits || [] : [input];
    const diff = edits.map(edit => {
      const before=text(edit.old_string).split('\n').filter(Boolean).map(line=>'-'+line).join('\n');
      const after=text(edit.new_string ?? edit.content).split('\n').map(line=>'+'+line).join('\n');
      return before+'\n'+after;
    }).join('\n');
    Object.assign(item,{type:'fileChange',changes:[{path:input.file_path || '',diff:text(diff)}]});
  }
  return item;
}
function convert(value, group, completed=true, book=tools) {
  const body = value.message || {}, content = typeof body.content === 'string' ? [{type:'text',text:body.content}] : body.content || [];
  const result = [], words = content.filter(block=>block.type==='text').map(block=>block.text).join('\n');
  if (words) {
    const item = {id:body.id || value.uuid,type:value.type==='user'?'userMessage':'agentMessage',status:completed?'completed':'inProgress'};
    if (value.type==='user') item.content=[{type:'text',text:text(words)}]; else item.text=text(words);
    result.push({turnId:group,item});
  }
  for (const block of content) {
    if (block.type==='tool_use') {
      book.set(block.id,{block,group});
      result.push({turnId:group,item:toolItem(block)});
    } else if (block.type==='tool_result') {
      const original = book.get(block.tool_use_id);
      if (!original) continue;
      const output = typeof block.content==='string' ? block.content : (block.content || []).filter(part=>part.type==='text').map(part=>part.text).join('\n');
      result.push({turnId:original.group,item:toolItem(original.block,block.is_error?'failed':'completed',output)});
    }
  }
  return result;
}
async function permission(name,input,options) {
  if (!turn) return {behavior:'deny',message:'No active Bibimer turn'};
  const id = randomUUID(), params = {threadId:thread,turnId:turn,itemId:options.toolUseID || id};
  let method = 'item/commandExecution/requestApproval';
  if (name==='AskUserQuestion') {
    method='item/tool/requestUserInput';
    params.questions=(input.questions || []).map((question,index)=>({...question,id:String(index),multiple:!!question.multiSelect,isOther:true}));
  } else {
    method=['Write','Edit','MultiEdit'].includes(name)?'item/fileChange/requestApproval':method;
    Object.assign(params,{reason:name,command:name==='Bash'?input.command:undefined,cwd,details:input});
  }
  return new Promise(resolve=>{
    const finish=value=>{
      approvals.delete(id); options.signal?.removeEventListener('abort',abort);
      notify('serverRequest/resolved',{requestId:id}); resolve(value);
    };
    const abort=()=>finish({behavior:'deny',message:'Request interrupted'});
    approvals.set(id,{name,input,finish,turn});
    if (options.signal?.aborted) { abort(); return; }
    options.signal?.addEventListener('abort',abort,{once:true});
    emit({id,method,params});
  });
}
function respond(value) {
  const request=approvals.get(value.id);
  if (!request || request.turn!==turn) return;
  const result=value.result;
  if (!result) { request.finish({behavior:'deny',message:'Unsupported request'}); return; }
  if (request.name==='AskUserQuestion') {
    const answers={};
    (request.input.questions || []).forEach((question,index)=>{answers[question.question]=(result.answers?.[String(index)]?.answers || []).join(', ');});
    request.finish({behavior:'allow',updatedInput:{...request.input,answers}});
  } else request.finish(result.decision==='accept'?{behavior:'allow',updatedInput:request.input}:{behavior:'deny',message:'User declined in Bibimer'});
}
let permissionMode = 'inherit';
async function runTurn(prompt, identity) {
  let finishInput, failed=false;
  const done = new Promise(resolve=>{finishInput=resolve;});
  async function* input() {
    yield {type:'user',uuid:identity,session_id:thread,parent_tool_use_id:null,message:{role:'user',content:[{type:'text',text:prompt}]}};
    await done;
  }
  try {
    const options={cwd,pathToClaudeCodeExecutable:executable,settingSources:['user','project','local'],
      systemPrompt:{type:'preset',preset:'claude_code'},includePartialMessages:true,canUseTool:permission,
      ...(permissionMode==='inherit'?{}:{permissionMode}),
      ...(permissionMode==='bypassPermissions'?{allowDangerouslySkipPermissions:true}:{}),
      ...(persisted?{resume:thread}:{sessionId:thread}),stderr:()=>{}};
    active=sdk.query({prompt:input(),options});
    notify('item/completed',{item:{id:identity,type:'userMessage',content:[{type:'text',text:prompt}]}});
    for await (const message of active) {
      if (message.session_id && message.session_id!==thread) throw Error('error_agent_transport');
      if (message.type==='system' && message.subtype==='init') persisted=true;
      if (message.parent_tool_use_id) continue;
      if (message.type==='stream_event') {
        const event=message.event;
        if (event.type==='message_start') streams.set('current',{id:event.message.id,text:''});
        else if (event.type==='content_block_delta' && event.delta.type==='text_delta') {
          const current=streams.get('current');
          if (current) { current.text=text(current.text+event.delta.text); notify('item/started',{item:{id:current.id,type:'agentMessage',text:current.text,status:'inProgress'}}); }
        }
      } else if (['assistant','user'].includes(message.type)) {
        for (const entry of convert(message,identity)) notify('item/completed',entry);
        for (const block of message.message?.content || []) {
          if (block.type==='tool_use' && block.name==='TodoWrite') notify('turn/plan/updated',{plan:(block.input?.todos || []).map(todo=>({step:todo.content,status:todo.status}))});
        }
      } else if (message.type==='result') {
        persisted=true; failed=message.is_error || message.subtype!=='success'; finishInput();
        if (failed && !interrupted) notify('bibimer/notice',{code:'error_agent_turn'});
      }
    }
  } catch {
    failed=true;
    if (!interrupted) notify('bibimer/notice',{code:'error_agent_turn'});
  } finally {
    finishInput();
    for (const request of [...approvals.values()]) request.finish({behavior:'deny',message:'Turn ended'});
    active?.close(); active=null;
    notify('turn/completed',{turn:{id:identity,status:interrupted?'interrupted':failed?'failed':'completed'}});
    turn=null; streams.clear(); tools.clear();
  }
}
async function call(method,params) {
  if (method==='initialize') return {userAgent:'bibimer-claude'};
  if (method==='thread/list') {
    const offset=Number(params.cursor || 0);
    if (!Number.isSafeInteger(offset) || offset<0 || offset>10000) throw Error('error_import_invalid');
    let rows=await sdk.listSessions({dir:cwd,includeWorktrees:false,limit:10000});
    rows=rows.filter(row=>checkedPath(row.cwd) && row.tag!=='__hidden' && (row.customTitle || row.summary || '').includes(params.searchTerm || ''));
    rows.sort((a,b)=>b.lastModified-a.lastModified);
    return {data:rows.slice(offset,offset+25).map(metadata),nextCursor:rows.length>offset+25?String(offset+25):null};
  }
  if (method==='thread/read') return {thread:metadata(await source(params.threadId))};
  if (['thread/start','thread/resume','thread/fork'].includes(method)) {
    if (thread) throw Error('error_session_exists');
    permissionMode=params.bibimerOptions?.permission || 'inherit';
    if (!['inherit','default','acceptEdits','plan','bypassPermissions'].includes(permissionMode)) throw Error('error_agent_options');
    if (method==='thread/start') { thread=randomUUID(); return {thread:{id:thread,cwd,ephemeral:false}}; }
    let row=await source(params.threadId);
    if (method==='thread/fork') { const fork=await sdk.forkSession(row.sessionId,{dir:cwd}); row=await source(fork.sessionId); }
    thread=row.sessionId; persisted=true;
    return {thread:metadata(row)};
  }
  if (!thread || params.threadId!==thread) throw Error('error_chat_request');
  if (method==='thread/items/list') {
    await source(thread);
    const messages=await sdk.getSessionMessages(thread,{dir:cwd});
    const book=new Map(), entries=[]; let group='history';
    for (const message of messages) {
      if (message.parent_tool_use_id) continue;
      if (message.type==='user' && (typeof message.message?.content==='string' || message.message?.content?.some(part=>part.type==='text'))) group=message.uuid;
      entries.push(...convert(message,group,true,book));
    }
    // Merge tool start/result into one historical activity row.
    const merged=new Map(); for (const entry of entries) merged.set(entry.turnId+':'+entry.item.id,entry);
    return {data:[...merged.values()].slice(-50).reverse()};
  }
  if (method==='turn/start') {
    if (turn) throw Error('error_chat_busy');
    turn=randomUUID(); interrupted=false;
    notify('turn/started',{turn:{id:turn,status:'inProgress'}});
    const identity=turn;
    void runTurn(params.input[0].text,identity);
    return {turn:{id:identity}};
  }
  if (method==='turn/interrupt') {
    if (active && params.turnId===turn) { interrupted=true; await active.interrupt(); }
    return {};
  }
  throw Error('error_history_unsupported');
}
const input = createInterface({input:process.stdin,crlfDelay:Infinity});
input.on('line',line=>{
  if (line.length>131072) { process.exit(1); return; }
  let value; try { value=JSON.parse(line); } catch { process.exit(1); return; }
  if (!value.method) { respond(value); return; }
  if (value.id===undefined) return;
  Promise.resolve().then(()=>call(value.method,value.params || {})).then(result=>emit({id:value.id,result}), error=>{
    const code=/^error_[a-z_]+$/.test(error.message)?error.message:'error_agent_transport';
    emit({id:value.id,error:{code:code==='error_history_unsupported'?-32601:-32603,message:code}});
  });
});
function close() { active?.close(); process.exit(0); }
input.on('close',close); process.on('SIGTERM',close); process.on('SIGINT',close);
