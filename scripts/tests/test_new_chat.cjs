"use strict";
// Exercise the actual new-session controller with delayed native replies.
const fs=require("node:fs"),vm=require("node:vm"),assert=require("node:assert/strict"),path=require("node:path");
const source=fs.readFileSync(path.resolve(__dirname,"../../android/app/src/main/assets/app.js"),"utf8");
const functions=["newSessionAgent", "launchSession", "submitInput", "changeAgent"].map(name=>{
  const match=source.match(new RegExp("  (?:async )?function "+name+"\\([^\\n]*\\) \\{[\\s\\S]*?\\n  \\}"));
  assert.ok(match,name);return match[0];
}).join("\n");
function fixture() {
  const fields={input:{value:"First message 한글"},launch:{disabled:false},send:{disabled:false},steer:{disabled:false,hidden:true},agent:{value:"codex"},mode:{value:"chat"}};
  const draft="project/new/codex/worktree",result={id:"created",agent:"codex",mode:"chat",state:"running",project:{id:"project",path:"/worktree"}};
  let identity=0;
  const ctx=vm.createContext({$:id=>fields[id],session:null,selectedAgent:"codex",project:{id:"project",path:"/root"},
    selectedProjectId:"project",draftPath:"/worktree",instance:"bridge-a",online:true,busy:false,settingsBusy:false,switchingProject:false,paused:false,
    generation:1,retryTimer:null,term:{cols:80,rows:24},native:{cancelPoll(){}},knownAgents:[],canLibrary:true,canOptions:true,canModels:true,
    canInitialMessage:true,multipleProjects:true,canSwitchAgents:true,demo:false,canQueue:true,views:new Map(),launchAttempts:new Map(),sending:new Set(),
    commands:{invocation:async()=>({})},lastNotice:null,noticeData:null,requests:[],selection:null,
    key:draft,viewKey:()=>ctx.key,projectKey:()=>ctx.project.id,uuid:()=>"request-"+(++identity),clearTimeout(){},
    savedOptions:()=>({permission:"read-only",model:"native-model",effort:"high"}),
    rememberView:()=>ctx.views.set(ctx.key,{text:fields.input.value,start:0,end:fields.input.value.length}),
    renderSession(){},resizeInput(){},resize(){},startPoll(){},cacheSession(){},agentConnections:{render(){}},
    setSession:value=>{ctx.session=value;ctx.key="project/"+value.id;fields.input.value=ctx.views.get(ctx.key)?.text || "";},
    notice:(key,suffix)=>ctx.lastNotice={key,suffix},isChat:()=>ctx.session?.mode==="chat",supportsChat:()=>true,updateMode(){},
    selectSession:async(...args)=>ctx.selection=args,
    api:async(method,endpoint,body)=>{ctx.requests.push({method,endpoint,body});return {session:result};},
  });
  vm.runInContext(functions,ctx);return {ctx,fields,draft,result};
}
(async()=>{
  {
    const {ctx,fields}=fixture();
    const makeNode=()=>({dataset:{},options:[],selectedOptions:[],hidden:false,disabled:false,classList:{toggle(){}},replaceChildren(...rows){this.options=rows;}});
    for(const id of Object.keys(fields))Object.assign(fields[id],{dataset:{},classList:{toggle(){}}});
    fields.agent.options=[{value:"codex",label:"Codex",disabled:false}];fields.agent.selectedOptions=fields.agent.options;
    ctx.$=id=>fields[id] ||= makeNode();
    ctx.Option=function(label,value){return {label,value,dataset:{}};};
    ctx.document={querySelectorAll:()=>[]};ctx.t=key=>key;ctx.knownProjects=[];
    Object.assign(ctx,{canSwitchAgents:true,persistentCodex:true,canImport:true,multiImport:true,canQueue:true,canOptions:true,
      libraryBusy:false,multipleProjects:true,queued:[],canBatchQueue:true,conversation:{items:new Map(),requests:new Map(),enable(){}},
      worktreeCreator:{render(){}},github:{render(){}},inspector:{update(){}},fileViewer:{update(){}},commands:{render(){},invocation:async()=>({})},
      importable:()=>false,findSession:()=>null,supportsSteer:()=>false,isResponding:()=>false,sessionTitle:()=>"Existing session",supportsChat:()=>fields.agent.value!=="shell"});
    for(const name of ["renderBrowser","renderContextUsage","renderSubscriptionUsage","renderBridgeUpdate","renderSettings","renderModels","renderImport",
      "renderFolderBrowser","renderQueue","renderHandoff","renderWorkspaceSummary","renderWorkspaceDetails","refreshProjectWorktrees","renderSessionActions",
      "renderProjectSettings","renderSidebar","positionUsageDetails","updateTerminalKeys"])ctx[name]=()=>{};
    ctx.pickers={sync(){}};
    vm.runInContext(source.match(/  function renderSession\(\) \{[\s\S]*?\n  \}/)[0],ctx);
    ctx.renderSession();assert.equal(fields.input.disabled,false);assert.equal(fields.send.disabled,false);
    assert.equal(fields["chat-panel"].hidden,false);assert.equal(fields["terminal-keys"].hidden,true);
    assert.equal(fields["input-form"].hidden,false,"A new Chat draft keeps its composer visible");
    assert.equal(fields["quick-agent"].hidden,false,"New Chat keeps its agent selector");
    ctx.canInitialMessage=false;ctx.renderSession();assert.equal(fields.input.disabled,false);assert.equal(fields.send.disabled,true);
    assert.equal(fields["chat-empty"].textContent,"new_chat_update");
    ctx.canInitialMessage=true;ctx.busy=true;ctx.renderSession();assert.equal(fields.input.disabled,true);
    ctx.busy=false;fields.agent.value="shell";fields.mode.value="terminal";ctx.renderSession();assert.equal(fields.input.disabled,true);
    assert.equal(fields["input-form"].hidden,true,"Explicit terminal setup hides the Chat composer");
    assert.equal(fields["quick-agent"].hidden,true,"Terminal setup uses the launch program selector");
    ctx.session={id:"terminal",agent:"shell",mode:"terminal",state:"running"};ctx.renderSession();
    assert.equal(fields["input-form"].hidden,true,"A running terminal keeps direct xterm input");
    assert.equal(fields["quick-agent"].hidden,true,"Terminal has no agent switching selector");
    ctx.session={id:"existing",agent:"codex",mode:"chat",state:"running",ready:true,turn_state:"ready"};ctx.canInitialMessage=false;ctx.renderSession();
    assert.equal(fields.input.disabled,false);assert.equal(fields.send.disabled,false,"Existing chat remains usable on older bridges");
    assert.equal(fields["quick-agent"].hidden,false,"Returning to Chat restores agent switching");
  }
  {
    const {ctx}=fixture();ctx.knownAgents=[{id:"shell",installed:true},{id:"codex",installed:false},{id:"claude",installed:true,modes:["chat"]}];
    assert.equal(ctx.newSessionAgent("shell"),"claude");assert.equal(ctx.newSessionAgent("claude"),"claude");
    ctx.knownAgents[2].installed=false;assert.equal(ctx.newSessionAgent("shell"),"codex","Installation is explicit; terminal stays secondary");
    await ctx.changeAgent("shell");assert.equal(ctx.selection[1],null);assert.equal(ctx.selection[3],"shell","An explicit terminal choice remains available");
    await ctx.changeAgent("claude");assert.equal(ctx.selection[1],null,"Choosing an agent in a new draft must not reopen its old session");
  }
  {
    const {ctx,fields,draft}=fixture();ctx.commands.invocation=async()=>({command_id:"native-skill"});fields.input.value="/review first";
    await ctx.submitInput(false);
    assert.equal(ctx.requests.length,1);const request=ctx.requests[0];assert.equal(request.endpoint,"/v1/sessions");
    assert.equal(request.body.initial_message.text,"/review first");assert.equal(request.body.initial_message.command_id,"native-skill");
    assert.equal(request.body.worktree_path,"/worktree");assert.equal(request.body.new_session,true);assert.equal(request.body.options.model,"native-model");
    assert.equal(ctx.session.id,"created");assert.equal(ctx.views.get(draft).text,"");assert.equal(fields.input.value,"");assert.equal(ctx.busy,false);
  }
  {
    const {ctx,fields,draft,result}=fixture();let release;ctx.api=async(method,endpoint,body)=>{
      ctx.requests.push({method,endpoint,body});if(method==="GET")return {projects:[],instance:"bridge-a"};
      return await new Promise(resolve=>release=()=>resolve({session:result}));
    };
    const first=ctx.submitInput(false);await new Promise(setImmediate);await ctx.submitInput(false);
    assert.equal(ctx.requests.length,1,"Repeated Send while creating must not duplicate the request");
    fields.input.value="A newer draft";ctx.rememberView();release();await first;
    assert.equal(ctx.views.get(draft).text,"A newer draft","A changed draft must survive completion");
  }
  {
    const {ctx,fields,draft,result}=fixture();let reject=true;
    ctx.api=async(method,endpoint,body)=>{ctx.requests.push({method,endpoint,body});
      if(method==="GET")return {instance:"bridge-a",projects:[]};
      if(reject)throw {key:"error_timeout",status:0};return {session:result};};
    await ctx.submitInput(false);const firstId=ctx.requests[0].body.request_id;
    assert.equal(fields.input.value,"First message 한글");assert.equal(ctx.session,null);assert.equal(ctx.launchAttempts.size,1);
    reject=false;await ctx.submitInput(false);
    assert.equal(ctx.requests.filter(r=>r.method==="POST")[1].body.request_id,firstId,"Retry uses the same launch and first-message receipt");
    assert.equal(ctx.views.get(draft).text,"");assert.equal(ctx.launchAttempts.size,0);
  }
  {
    const {ctx,fields,result}=fixture();ctx.api=async(method,endpoint,body)=>{
      ctx.requests.push({method,endpoint,body});if(method==="POST"){result.launch_id=body.request_id;throw {key:"error_timeout"};}
      return {instance:"bridge-a",projects:[{sessions:[result]}]};};
    await ctx.submitInput(false);assert.equal(ctx.session.id,"created","A lost launch reply is reconciled without resending the message");
    assert.equal(fields.input.value,"");assert.equal(ctx.requests.filter(r=>r.method==="POST").length,1);
  }
  {
    const {ctx,fields}=fixture();ctx.api=async()=>{throw {key:"error_program_missing",status:400};};
    await ctx.submitInput(false);assert.equal(fields.input.value,"First message 한글");assert.equal(ctx.launchAttempts.size,0);
    ctx.canInitialMessage=false;await ctx.submitInput(false);assert.equal(ctx.session,null,"Old bridges must not silently drop the first message");
  }
  {
    const {ctx,fields,draft,result}=fixture();ctx.api=async()=>{ctx.instance="bridge-b";return {session:result};};
    await ctx.submitInput(false);assert.equal(ctx.session,null);assert.equal(fields.input.value,"First message 한글");
    assert.equal(ctx.views.get(draft).text,"First message 한글","A late reply from another bridge instance preserves the draft");
  }
  {
    const nodes=new Map(),field=id=>{if(!nodes.has(id))nodes.set(id,{value:"",options:[],selectedOptions:[],dataset:{},setAttribute(){}});return nodes.get(id);};
    const ctx=vm.createContext({window:{}});vm.runInContext(fs.readFileSync(path.resolve(__dirname,"../../android/app/src/main/assets/worktree-create.js"),"utf8"),ctx);
    const creator=Object.create(ctx.window.BibimerWorktreeCreate.prototype);
    Object.assign(creator,{$:field,t:key=>key,state:{project:{id:"project",name:"Project"},instance:"bridge",info:{refs:[],worktrees:[],directory:"/trees"}},
      context:()=>({instance:"bridge",online:true,agents:[{id:"codex",installed:false},{id:"shell",installed:true}]})});
    field("branch").value="feature";field("base").value="head";field("agent").value="codex";
    field("agent").options=[{value:"codex",disabled:true,dataset:{}}];field("agent").selectedOptions=field("agent").options;
    creator.render();assert.equal(field("create-submit").disabled,true,"A missing default agent must not create a worktree or session");
    field("agent").value="shell";field("agent").options=[{value:"shell",disabled:false,dataset:{}}];field("agent").selectedOptions=field("agent").options;
    creator.render();assert.equal(field("create-submit").disabled,false,"Explicit terminal remains available for worktree creation");
  }
  console.log("New chat: agent defaults, explicit terminal, fresh agent selection, atomic first message/options/path, double Send, retry receipts, lost replies and draft preservation passed");
})().catch(error=>{console.error(error);process.exitCode=1;});
