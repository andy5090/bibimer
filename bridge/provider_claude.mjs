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
let liveInput = null;
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
let permissionMode = 'inherit', modelOptions = {};
const quotaPeriods={five_hour:300,seven_day:10080,seven_day_opus:10080,seven_day_sonnet:10080,seven_day_overage_included:10080,overage:null};
const quotaPercent=(value,scale)=>typeof value==='number' && Number.isFinite(value) && value>=0 && value<=10000/scale ? value*scale : null;
function subscriptionEvent(info) {
  if (!info || typeof info!=='object') return;
  const rows=[];
  const add=(kind,value,status)=>{
    if (!value || typeof value!=='object') return;
    rows.push({id:'claude:'+kind,kind,windowDurationMins:quotaPeriods[kind] ?? null,
      usedPercent:quotaPercent(value.utilization,100),resetsAt:value.resetsAt,status});
  };
  // CLI unifiedWindows reports fractions (0.24 == 24%), unlike /usage's
  // percentages. Accept this optional extension by shape; never infer zero.
  for (const kind of Object.keys(quotaPeriods)) {
    const value=info.unifiedWindows?.[kind];
    if (value) add(kind,value,kind===info.rateLimitType?info.status:undefined);
  }
  if (Object.hasOwn(quotaPeriods,info.rateLimitType) && !rows.some(row=>row.kind===info.rateLimitType))
    add(info.rateLimitType,info,info.status);
  if (!rows.length && ['allowed','allowed_warning','rejected'].includes(info.status)) add('window',info,info.status);
  if (rows.length) notify('bibimer/subscriptionUsage',{windows:rows});
}
function subscriptionReport(report) {
  if (!report || typeof report!=='object') return;
  const limits=report.rate_limits;
  if (!limits || typeof limits!=='object') { notify('bibimer/subscriptionUsage',{unavailable:true});return; }
  const reset=value=>typeof value==='string' && Number.isFinite(Date.parse(value)) ? Math.floor(Date.parse(value)/1000) : null;
  const rows=[];
  if (Array.isArray(limits.limits)) {
    for (const [index,row] of limits.limits.slice(0,16).entries()) {
      if (!row || typeof row!=='object') continue;
      rows.push({id:'claude:report:'+index,kind:row.kind,label:row.label,
        usedPercent:quotaPercent(row.percent,1),resetsAt:reset(row.resets_at)});
    }
  } else {
    for (const kind of Object.keys(quotaPeriods)) {
      const value=limits[kind];
      if (value && typeof value==='object') rows.push({id:'claude:'+kind,kind,windowDurationMins:quotaPeriods[kind],
        usedPercent:quotaPercent(value.utilization,1),resetsAt:reset(value.resets_at)});
    }
  }
  notify('bibimer/subscriptionUsage',{windows:rows,replace:true});
}
async function runTurn(prompt, identity) {
  let finishInput, failed=false, resultSeen=false, answerSeen=false;
  let windowUsage=null;
  const publishUsage = limit => {
    if (windowUsage) notify('bibimer/contextUsage',{usedTokens:windowUsage.used,contextWindow:limit ?? null,estimated:true});
  };
  const state = {identity,accepting:true,messages:[],pending:new Map(),wake:null};
  liveInput=state;
  finishInput=()=>{state.accepting=false;state.wake?.();};
  async function* input() {
    yield {type:'user',uuid:identity,session_id:thread,parent_tool_use_id:null,message:{role:'user',content:[{type:'text',text:prompt}]}};
    while (state.accepting) {
      if (!state.messages.length) await new Promise(resolve=>{state.wake=resolve;});
      state.wake=null;
      while (state.accepting && state.messages.length) yield state.messages.shift();
    }
  }
  try {
    // A new SDK query can resolve a different CLI account/profile. Do not merge
    // a previous query's account windows into this query's first report.
    notify('bibimer/subscriptionUsage',{windows:[],replace:true});
    const options={cwd,pathToClaudeCodeExecutable:executable,settingSources:['user','project','local'],
      systemPrompt:{type:'preset',preset:'claude_code',...(process.env.BIBIMER_BROWSER_INSTRUCTIONS?{append:process.env.BIBIMER_BROWSER_INSTRUCTIONS}:{})},includePartialMessages:true,canUseTool:permission,
      extraArgs:{'replay-user-messages':null},
      ...(permissionMode==='inherit'?{}:{permissionMode}),
      ...(permissionMode==='bypassPermissions'?{allowDangerouslySkipPermissions:true}:{}),
      ...(Object.hasOwn(modelOptions,'model')?{model:modelOptions.model || 'default'}:{}),
      ...(modelOptions.effort?{effort:modelOptions.effort}:{}),
      ...(persisted?{resume:thread}:{sessionId:thread}),stderr:()=>{}};
    active=sdk.query({prompt:input(),options});
    notify('item/completed',{item:{id:identity,type:'userMessage',content:[{type:'text',text:prompt}]}});
    for await (const message of active) {
      if (message.session_id && message.session_id!==thread) throw Error('error_agent_transport');
      if (message.type==='system' && message.subtype==='init') persisted=true;
      if (message.parent_tool_use_id || message.agent_id) continue;
      if (message.type==='auth_status') notify('bibimer/subscriptionUsage',{windows:[],replace:true});
      if (message.type==='rate_limit_event') subscriptionEvent(message.rate_limit_info);
      if (message.type==='assistant' && message.usage_report) subscriptionReport(message.usage_report);
      if (message.type==='system' && ['compact_boundary','conversation_reset'].includes(message.subtype)) {
        windowUsage=null; notify('bibimer/contextUsage',{usedTokens:null,reset:true});
      }
      if (message.type==='assistant' && message.context_usage) {
        const usage=message.context_usage;
        windowUsage=null;
        notify('bibimer/contextUsage',{usedTokens:usage.total_tokens,contextWindow:usage.raw_max_tokens,estimated:true});
      } else if (message.type==='assistant' && !message.isSidechain && message.message?.usage) {
        // The latest MAIN-loop request, including caches, rather than result.usage
        // or modelUsage totals (which can include many steps and subagents).
        const usage=message.message.usage;
        const fields=[usage.input_tokens,usage.cache_read_input_tokens ?? 0,usage.cache_creation_input_tokens ?? 0,usage.output_tokens ?? 0];
        if (fields.every(value=>Number.isSafeInteger(value) && value>=0) && fields.some(value=>value>0)) {
          windowUsage={model:message.message.model,used:fields.reduce((sum,value)=>sum+value,0)};
          publishUsage(null);
        }
      }
      if (message.type==='command_lifecycle') {
        const pending=state.pending.get(message.command_uuid);
        if (pending && ['queued','started'].includes(message.state) && !pending.accepted) {
          pending.accepted=true;
          notify('item/completed',{item:{id:message.command_uuid,type:'userMessage',content:[{type:'text',text:pending.text}]}});
          pending.resolve({turnId:identity});
        } else if (pending && ['cancelled','discarded'].includes(message.state)) {
          state.pending.delete(message.command_uuid);
          if (pending.accepted) notify('item/completed',{item:{id:message.command_uuid,type:'userMessage',status:'interrupted',content:[{type:'text',text:pending.text}]}});
          pending.reject(Error('error_steer_rejected'));
          if (resultSeen && !state.pending.size) finishInput();
        }
        continue;
      }
      if (message.type==='user' && message.isReplay) {
        const pending=state.pending.get(message.uuid);
        if (pending) {
          state.pending.delete(message.uuid);
          // Older CLIs can acknowledge via replay. On current CLIs the queued
          // lifecycle arrives first, without waiting for running tools to end.
          notify('item/completed',{item:{id:message.uuid,type:'userMessage',content:[{type:'text',text:pending.text}]}});
          pending.resolve({turnId:identity});
        }
        continue;
      }
      if (message.type==='stream_event') {
        const event=message.event;
        if (event.type==='message_start') streams.set('current',{id:event.message.id,text:''});
        else if (event.type==='content_block_delta' && event.delta.type==='text_delta') {
          const current=streams.get('current');
          if (current) { current.text=text(current.text+event.delta.text); notify('item/started',{item:{id:current.id,type:'agentMessage',text:current.text,status:'inProgress'}}); }
        }
      } else if (['assistant','user'].includes(message.type)) {
        for (const entry of convert(message,identity)) {
          if (entry.item.type==='agentMessage' && entry.item.text) answerSeen=true;
          notify('item/completed',entry);
        }
        for (const block of message.message?.content || []) {
          if (block.type==='tool_use' && block.name==='TodoWrite') notify('turn/plan/updated',{plan:(block.input?.todos || []).map(todo=>({step:todo.content,status:todo.status}))});
        }
      } else if (message.type==='result') {
        // Only take the matching model's LIMIT from the cumulative result.
        // Assistant output counts can be placeholders, so retain the estimate label.
        publishUsage(message.modelUsage?.[windowUsage?.model]?.contextWindow);
        resultSeen=true; persisted=true; failed=failed || message.is_error || message.subtype!=='success';
        // Claude can fold input into this turn or continue with another native
        // turn. Keep the same Bibimer operation open until the native backlog
        // is empty; never drop queued input at the first result.
        if (failed || interrupted || (!state.pending.size && !(message.queued_turn_count>0))) finishInput();
        // Local SDK commands can return a result without an assistant message.
        if (!failed && prompt.startsWith('/') && !answerSeen && typeof message.result==='string' && message.result.trim()) {
          notify('item/completed',{item:{id:identity+'-result',type:'agentMessage',text:text(message.result),status:'completed'}});
        }
        if (failed && !interrupted) notify('bibimer/notice',{code:'error_agent_turn'});
        if (failed || interrupted) { active?.close(); break; }
      }
    }
  } catch {
    failed=true;
    if (!interrupted) notify('bibimer/notice',{code:'error_agent_turn'});
  } finally {
    finishInput();
    for (const [uuid,pending] of state.pending) {
      if (pending.accepted) notify('item/completed',{item:{id:uuid,type:'userMessage',status:'interrupted',content:[{type:'text',text:pending.text}]}});
      pending.reject(Error('error_input_uncertain'));
    }
    state.pending.clear();
    if (liveInput===state) liveInput=null;
    for (const request of [...approvals.values()]) request.finish({behavior:'deny',message:'Turn ended'});
    active?.close(); active=null;
    notify('turn/completed',{turn:{id:identity,status:interrupted?'interrupted':failed || !resultSeen?'failed':'completed'}});
    turn=null; streams.clear(); tools.clear();
  }
}
async function call(method,params) {
  if (method==='initialize') return {userAgent:'bibimer-claude',capabilities:{steer:true}};
  if (method==='model/list' || method==='commands/list') {
    // Initialize the CLI control protocol without yielding any user prompt.
    let release;
    const idle = new Promise(resolve=>{release=resolve;});
    async function* input() { await idle; }
    const probe=sdk.query({prompt:input(),options:{cwd,pathToClaudeCodeExecutable:executable,
      settingSources:['user','project','local'],persistSession:false,stderr:()=>{}}});
    try {
      if (method==='commands/list') return {data:await probe.supportedCommands()};
      const rows=await probe.supportedModels();
      return {data:rows.map(row=>({id:row.value,model:row.value,displayName:row.displayName,
        description:row.description,hidden:row.disabled===true,
        supportedReasoningEfforts:(row.supportsEffort===false?[]:row.supportedEffortLevels || []).map(level=>({reasoningEffort:level,description:''}))})),nextCursor:null};
    } finally { release(); probe.close(); }
  }
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
    modelOptions=params.bibimerOptions || {};
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
    const next=params.bibimerOptions?.permission ?? permissionMode;
    if (!['inherit','default','acceptEdits','plan','bypassPermissions'].includes(next)) throw Error('error_agent_options');
    permissionMode=next;
    modelOptions=params.bibimerOptions || modelOptions;
    turn=randomUUID(); interrupted=false;
    notify('turn/started',{turn:{id:turn,status:'inProgress'}});
    const identity=turn;
    void runTurn(params.input[0].text,identity);
    return {turn:{id:identity}};
  }
  if (method==='turn/steer') {
    const state=liveInput, value=params.input;
    if (!turn || params.expectedTurnId!==turn || !active || !state?.accepting || interrupted) throw Error('error_steer_unavailable');
    if (!Array.isArray(value) || value.length!==1 || value[0].type!=='text' || typeof value[0].text!=='string' ||
        !value[0].text.trim() || Buffer.byteLength(value[0].text)>16384) throw Error('error_input_size');
    if (value[0].text.trimStart().startsWith('/')) throw Error('error_steer_unavailable');
    if (state.pending.size>=16) throw Error('error_steer_rejected');
    const uuid=randomUUID(), text=value[0].text;
    return new Promise((resolve,reject)=>{
      state.pending.set(uuid,{text,resolve,reject});
      state.messages.push({type:'user',uuid,session_id:thread,parent_tool_use_id:null,message:{role:'user',content:[{type:'text',text}]}});
      state.wake?.();
    });
  }
  if (method==='turn/interrupt') {
    if (active && params.turnId===turn) {
      interrupted=true;
      const query=active;
      try { await query.interrupt(); }
      finally { query.close(); }
    }
    return {};
  }
  throw Error('error_history_unsupported');
}
const input = createInterface({input:process.stdin,crlfDelay:Infinity});
input.on('line',line=>{
  if (line.length>2097152) { process.exit(1); return; }
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
