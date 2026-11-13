"use strict";
window.BibimerAgentConnections = class BibimerAgentConnections {
  constructor(t, context, request, actions) {
    this.t=t;this.context=context;this.request=request;this.actions=actions;
    this.state=null;this.timer=null;this.updateTimer=null;
    this.$("close").addEventListener("click",()=>this.dialog.close());
    this.dialog.addEventListener("close",()=>this.pause());
    this.$("agent").addEventListener("change",()=>void this.open(this.$("agent").value));
    this.$("provider").addEventListener("change",()=>{this.clearSecrets();this.methods();});
    this.$("method").addEventListener("change",()=>{this.clearSecrets();this.render();});
    this.$("refresh").addEventListener("click",()=>void this.load());
    this.$("update-check").addEventListener("click",()=>void this.updates("check"));
    this.$("update-start").addEventListener("click",()=>void this.beginOperation("update"));
    this.$("version-check").addEventListener("click",()=>void this.load("version"));
    this.$("form").addEventListener("submit",event=>{event.preventDefault();void this.start();});
    this.$("browser").addEventListener("click",()=>this.openBrowser(this.state));
    this.$("code-form").addEventListener("submit",event=>{event.preventDefault();void this.sendCode();});
    this.$("cancel").addEventListener("click",()=>void this.cancel());
    this.$("terminal").addEventListener("click",()=>void this.openTerminal());
    this.o("confirm").addEventListener("click",()=>void this.confirmOperation());
    this.o("cancel").addEventListener("click",()=>this.operationDialog.close());
    this.o("reopen").addEventListener("change",()=>{if(this.state?.operation&&!this.operationBusy())this.state.operation.reopen=this.o("reopen").checked;});
    this.operationDialog.addEventListener("cancel",event=>{if(this.operationBusy())event.preventDefault();});
    this.operationDialog.addEventListener("close",()=>{if(this.state?.operation&&!this.operationBusy())this.state.operation=null;});
    this.$("update-recovery-retry").addEventListener("click",()=>void this.updates("retry_restore"));
    this.$("recovery-retry").addEventListener("click",()=>void this.retryAccountRestore());
  }
  $(id){return document.getElementById("agent-connection-"+id);}
  get dialog(){return this.$("dialog");}
  o(id){return document.getElementById("agent-operation-"+id);}
  get operationDialog(){return this.o("dialog");}
  operationBusy(){return !!this.state?.confirming;}
  activeLogin(s=this.state){return ["stopping","pending","restoring"].includes(s?.job?.status);}
  current(state){const c=this.context();return !!state&&state===this.state&&c.instance===state.instance&&c.project===state.project&&(c.path||null)===state.path&&!c.demo;}
  available(){const c=this.context();return c.online&&c.supported&&!c.demo&&!c.paused;}
  clearSecrets(){this.$("key").value="";this.$("code").value="";}
  pause(){clearTimeout(this.timer);clearTimeout(this.updateTimer);this.timer=null;this.updateTimer=null;if(this.state)this.state.autoBrowserJob=null;this.clearSecrets();if(this.operationDialog.open&&!this.operationBusy())this.operationDialog.close();}
  payload(extra={}){const s=this.state;return {agent:s.agent,...(s.project?{project_id:s.project,...(s.path?{worktree_path:s.path}:{})}:{}),...extra};}
  async open(agent="codex", options={}) {
    this.pause();
    const c=this.context(), previous=this.state;
    if(c.demo)return;
    if(!this.current(previous)||previous.agent!==agent){
      this.state={agent,instance:c.instance,project:c.project,path:c.path||null,report:null,job:null,busy:false,error:null,version:""};
    }
    this.$("agent").value=agent;
    this.$("installation").open=options.installation===true;
    this.state.installationInitialized=options.installation===true;
    this.state.installationAwaitingStatus=true;
    if(!this.dialog.open)this.dialog.showModal();
    this.render();
    if(this.context().updates)await this.updates("status");
    if(this.updating())return;
    if(this.activeLogin())void this.poll();else{await this.load();if(this.activeLogin())void this.poll();}
  }
  updating(s=this.state){return ["waiting","stopping","installing","verifying","restoring"].includes(s?.updateJob?.status);}
  async beginOperation(kind){
    const s=this.state;if(!this.current(s)||!this.available()||s.busy||s.updateBusy||this.updating(s)||this.activeLogin(s))return;
    if(!this.context().maintenance){if(kind==="update")return this.updates("start");return this.start(true);}
    const choice=this.choice();if(kind==="connection"&&!choice?.supported)return;
    s.busy=true;s.error=null;this.render();
    try{
      const result=kind==="update"?await this.actions.updates({agent:s.agent,action:"prepare",plan_id:s.updatePlan?.id}):
        await this.request(this.payload({action:"prepare",method:choice.id,...(s.agent==="opencode"?{provider:this.$("provider").value}:{})}));
      if(!this.current(s)||!this.dialog.open||!this.available())return;
      s.operation={kind,confirmation:result.confirmation,reopen:true,error:null,started:false};
      if(!result.confirmation?.targets?.length){s.busy=false;return await this.confirmOperation();}
      this.operationDialog.showModal();this.renderOperation();
    }catch(e){if(this.current(s)){s.error=e.key||"error_agent_operation_changed";this.render();}}
    finally{if(this.current(s)){s.busy=false;this.render();}}
  }
  async confirmOperation(){
    const s=this.state,operation=s?.operation;
    if(!operation||!this.current(s)||!this.available()||s.confirming)return;
    operation.reopen=this.operationDialog.open?this.o("reopen").checked:true;
    s.confirming=true;operation.error=null;this.renderOperation();
    try{
      if(operation.kind==="update")await this.updates("start");else await this.start(true);
      if(this.current(s)){
        const error=operation.kind==="update"?s.updateError:s.error;
        if(error){operation.error=error;this.renderOperation();}
        else{operation.started=true;s.confirming=false;if(this.operationDialog.open)this.operationDialog.close();}
      }
    }finally{s.confirming=false;if(this.current(s))this.renderOperation();}
  }
  renderOperation(){
    const s=this.state,operation=s?.operation;if(!operation)return;
    this.o("confirm").disabled=this.operationBusy()||!this.available();this.o("cancel").disabled=this.operationBusy();
    this.o("reopen").disabled=this.operationBusy();
    if(!this.operationBusy())this.o("reopen").checked=operation.reopen;
    this.o("progress").textContent=operation.error?this.t(operation.error):this.operationBusy()?this.t("connection_loading"):"";
    this.o("targets").replaceChildren(...(operation.confirmation?.targets||[]).map(row=>{
      const node=document.createElement("li"),title=document.createElement("strong"),detail=document.createElement("small");
      title.textContent=row.title||row.id.slice(0,8);detail.textContent=[row.project?.name,row.project?.path,this.t("agent_"+row.agent),row.archived?this.t("session_archived"):""].filter(Boolean).join(" · ");
      node.append(title,detail);return node;
    }));
  }
  renderRecovery(job,prefix){
    const recovery=job?.recovery,show=!!recovery?.total;
    this.$(prefix+"status").hidden=!show;
    this.$(prefix+"status").textContent=show?this.t(!recovery.reopen?"agent_operation_kept_stopped":job.status==="failed"||["failed","cancelled","expired"].includes(job.status)?"agent_operation_failed_stopped":"agent_operation_result",{done:recovery.restored,total:recovery.total}):"";
    this.$(prefix+"rows").replaceChildren(...(recovery?.rows||[]).filter(row=>["failed","skipped","uncertain"].includes(row.state)).map(row=>{
      const node=document.createElement("li");node.textContent=(this.actions.title?.(row.id)||row.id.slice(0,8))+" · "+this.t(row.error||"maintenance_recovery_failed");return node;
    }));
    this.$(prefix+"retry").hidden=!recovery?.retryable||!["saved","succeeded"].includes(job?.status);
    this.$(prefix+"retry").disabled=this.updating()||this.activeLogin()||!this.available();
  }
  async retryAccountRestore(){
    const s=this.state;if(!this.current(s)||!this.available()||s.busy||this.activeLogin(s)||!s.job?.recovery?.retryable)return;
    s.busy=true;try{const result=await this.request(this.payload({action:"retry_restore",id:s.job.id}));if(this.current(s))s.job=result.job;}
    catch(e){if(this.current(s))s.error=e.key||"error_agent_operation_restore";}
    finally{if(this.current(s)){s.busy=false;this.render();if(this.activeLogin(s))void this.poll();}}
  }
  scheduleUpdates(s=this.state){
    clearTimeout(this.updateTimer);this.updateTimer=null;
    if(!this.current(s)||!this.dialog.open||!this.available()||(!this.updating(s)&&!s.updatePlan?.available))return;
    this.updateTimer=setTimeout(()=>{this.updateTimer=null;void this.updates(this.updating(s)?"poll":"status");},this.updating(s)?1000:2000);
  }
  async updates(action="status"){
    const s=this.state,status=action==="status";
    if(!this.current(s)||!this.available()||!this.context().updates||s.updateBusy||(status&&s.updateStatusBusy))return;
    if(action==="check"&&(this.updating(s)||s.busy||s.job?.status==="pending"))return;
    if(action==="start"&&(!s.updatePlan?.available||(s.updatePlan.blocked&&!s.operation?.confirmation)||this.updating(s)||s.busy||s.job?.status==="pending"))return;
    const revision=status?(s.updateRevision||0):(s.updateRevision=(s.updateRevision||0)+1);
    if(status){s.updateStatusBusy=true;this.renderInstallation();}
    else{clearTimeout(this.updateTimer);this.updateTimer=null;s.updateBusy=true;s.updateError=null;s.updateStatusError=null;this.render();}
    const body={agent:s.agent,action,...(["poll","retry_restore"].includes(action)?{id:s.updateJob.id}:{}),
      ...(action==="start"?{plan_id:s.updatePlan.id,request_id:s.updateRequest ||= this.actions.uuid(),...(s.operation?.kind==="update"?{confirmation_id:s.operation.confirmation.id,reopen:s.operation.reopen}:{})}: {})};
    try{
      const result=await this.actions.updates(body);
      if(!this.current(s)||(status&&revision!==(s.updateRevision||0)))return;
      s.updateStatusError=null;
      if(result.plan){
        if(s.updatePlan?.id!==result.plan.id)s.updateRequest=null;
        s.updatePlan=result.plan;s.updateJob=null;s.version=result.plan.current_version;
        if(s.updateError==="error_agent_update_busy")s.updateError=null;
      }else if(status&&Object.prototype.hasOwnProperty.call(result,"plan")){
        s.updatePlan=null;
        if(result.expired){s.updateRequest=null;s.updateError="error_agent_update_expired";}
      }
      if(result.job)s.updateJob=result.job;
      if(s.updateJob?.status==="succeeded"){s.version=s.updateJob.installed_version;s.updatePlan=null;}
      if(s.updateJob?.status==="failed"){s.updatePlan=null;s.updateRequest=null;}
    }catch(e){if(this.current(s)&&(!status||revision===(s.updateRevision||0))){
      if(status)s.updateStatusError=e.key||"error_agent_update_failed";
      else{s.updateError=e.key||"error_agent_update_failed";
        if(["error_agent_update_expired","error_agent_update_unavailable"].includes(e.key)){s.updatePlan=null;s.updateRequest=null;}}
    }}
    finally{if(this.current(s)){
      if(status)s.updateStatusBusy=false;else s.updateBusy=false;
      this.render();this.scheduleUpdates(s);
    }}
  }
  async openTerminal(){
    const s=this.state;if(!this.current(s)||s.busy||this.updating(s)||this.context().paused||s.job?.status==="pending")return;
    if(s.agent==="gemini")return;
    if(!this.available()||!this.context().loginTerminal){s.error="connection_update_bridge";this.render();return;}
    s.busy=true;s.error=null;this.clearSecrets();this.render();
    // Keep the same request ID on uncertain delivery; an explicit retry must
    // reattach to the created PTY rather than start another login process.
    s.terminalRequest ||= this.actions.uuid();
    try{
      const result=await this.request(this.payload({action:"terminal",request_id:s.terminalRequest}));
      if(!this.current(s)||this.context().paused||!this.dialog.open)return;
      this.dialog.close();await this.actions.session(result.session);
      s.terminalRequest=null;
    }catch(e){if(this.current(s)){s.error=e.key||"error_agent_connection";if(e.status&&e.status<500)s.terminalRequest=null;}}
    finally{if(this.current(s)){s.busy=false;this.render();}}
  }
  async load(action="status") {
    const s=this.state;if(!this.current(s)||s.busy||!this.available())return;
    if(s.job?.status==="pending")return this.poll();
    s.busy=true;s.loading=action;s.error=null;this.render();
    try{
      const result=await this.request(this.payload({action}));
      if(!this.current(s))return;
      if(action==="version")s.version=result.version||"";
      else{s.report=result;s.installationAwaitingStatus=false;this.providers();if(result.job)s.job=result.job;}
    }catch(e){if(this.current(s))s.error=e.key||"error_agent_connection";}
    finally{if(this.current(s)){s.busy=false;s.loading=null;this.render();}}
  }
  providers(){
    const s=this.state,select=this.$("provider"),value=select.value;
    select.replaceChildren(...(s.report?.providers||[]).map(p=>new Option(p.name+(p.connected?" · "+this.t("connection_configured"):""),p.id)));
    if([...select.options].some(o=>o.value===value))select.value=value;
    this.methods();
  }
  methods(){
    const s=this.state,choices=s.agent==="codex"?(s.report?.login_methods?.length?s.report.login_methods:[{id:"chatgpt",type:"oauth",name:"ChatGPT",supported:true},{id:"apiKey",type:"api",name:"API key",supported:true}]):["claude","gemini"].includes(s.agent)&&this.context().loginUI?(s.report?.login_methods||[]):(s.report?.providers||[]).find(p=>p.id===this.$("provider").value)?.methods||[];
    this.choices=choices;
    this.$("method").replaceChildren(...choices.map(m=>{const o=new Option(m.name,m.id);o.disabled=!m.supported;if(!m.supported){o.dataset ||= {};o.dataset.description=this.t("connection_fallback");}return o;}));
    const first=choices.find(m=>m.supported);if(first)this.$("method").value=first.id;
    this.render();
  }
  choice(){return this.choices?.find(m=>m.id===this.$("method").value);}
  openBrowser(s, automatic=false){
    if(!this.current(s)||!this.dialog.open||!this.available()||s.job?.status!=="pending"||!s.job.url)return;
    if(automatic&&(s.autoBrowserJob!==s.job.id||s.browserOpened))return;
    // Only an explicit new login arms automatic opening. Status/reopen/polling
    // must not launch browsers for a previously existing authentication job.
    s.browserOpened=true;
    try{Promise.resolve(this.actions.link(s.job.url,s.job.id)).catch(()=>{if(this.current(s)){s.error="error_agent_connection";this.render();}});}
    catch(_){s.error="error_agent_connection";this.render();}
  }
  async start(confirmed=false){
    if(this.choice()?.type==="terminal")return this.openTerminal();
    if(!confirmed&&this.context().maintenance)return this.beginOperation("connection");
    const s=this.state,m=this.choice();if(!this.current(s)||s.busy||this.updating(s)||!this.available()||!m?.supported||s.job?.status==="pending")return;
    const body=this.payload({action:"start",method:m.id,request_id:this.actions.uuid(),...(s.agent==="opencode"?{provider:this.$("provider").value}:{}),...(m.type==="api"&&!this.actions.secret?{key:this.$("key").value}:{}),...(s.operation?.kind==="connection"?{confirmation_id:s.operation.confirmation.id,reopen:s.operation.reopen}:{})});
    this.clearSecrets();s.busy=true;s.error=null;this.render();
    try{const result=await (m.type==="api"&&this.actions.secret?this.actions.secret(body):this.request(body));if(this.current(s)&&!result.cancelled){s.job=result.job;s.autoBrowserJob=["stopping","pending"].includes(s.job?.status)?s.job.id:null;s.browserOpened=false;}}
    catch(e){if(this.current(s))s.error=e.key||"error_agent_connection";}
    finally{delete body.key;if(this.current(s)){s.busy=false;this.render();this.openBrowser(s,true);if(this.activeLogin(s))void this.poll();}}
  }
  async poll(){
    const s=this.state;if(!this.current(s)||s.busy||!this.activeLogin(s)||!this.dialog.open||!this.available())return;
    clearTimeout(this.timer);this.timer=null;s.busy=true;
    let completed=false;
    try{const result=await this.request(this.payload({action:"poll",id:s.job.id}));if(this.current(s)){s.job=result.job;s.error=null;completed=s.job?.status==="saved";}}
    catch(e){if(this.current(s)){
      s.error=e.key||"error_agent_connection";
      if(e.key==="error_connection_expired"){
        s.job={id:s.job.id,agent:s.agent,status:"expired"};this.clearSecrets();
      }
    }}
    finally{if(this.current(s)){s.busy=false;this.render();this.openBrowser(s,true);if(this.activeLogin(s)&&this.dialog.open&&this.available())this.timer=setTimeout(()=>void this.poll(),2000);}}
    if(completed&&this.current(s)&&this.dialog.open&&this.available())await this.load();
  }
  async sendCode(){
    const s=this.state;if(!this.current(s)||s.busy||!this.available()||!s.job?.code_required)return;
    const body=this.payload({action:"code",id:s.job.id,...(!this.actions.codeSecret?{code:this.$("code").value}:{})});
    this.clearSecrets();s.busy=true;s.error=null;this.render();
    try{const r=await (this.actions.codeSecret?this.actions.codeSecret(body):this.request(body));if(this.current(s)&&!r.cancelled)s.job=r.job;}
    catch(e){if(this.current(s))s.error=e.key||"error_agent_connection";}
    finally{delete body.code;if(this.current(s)){s.busy=false;this.render();void this.poll();}}
  }
  async cancel(){
    const s=this.state;if(!this.current(s)||s.busy||!this.available()||!s.job)return;
    clearTimeout(this.timer);this.clearSecrets();s.busy=true;
    try{const r=await this.request(this.payload({action:"cancel",id:s.job.id}));if(this.current(s))s.job=r.job;}
    catch(e){if(this.current(s))s.error=e.key||"error_agent_connection";}
    finally{if(this.current(s)){s.busy=false;this.render();}}
  }
  update(){
    if(!this.state||!this.dialog.open)return;
    if(!this.current(this.state)){this.state.confirming=false;this.pause();this.dialog.close();return;}
    if(!this.available())this.pause();
    if(this.available()&&(this.updating()||this.state.updatePlan?.available)&&!this.state.updateBusy&&!this.state.updateStatusBusy&&!this.updateTimer)this.scheduleUpdates();
    this.render();
    if(this.available()&&this.activeLogin()&&!this.state.busy&&!this.timer)void this.poll();
  }
  renderInstallation(){
    const s=this.state;if(!s)return;
    const installed=s.report?.installed,runtime=this.context().agents?.find(row=>row.id===s.agent);
    if(!s.installationInitialized&&!s.installationAwaitingStatus&&typeof installed==="boolean"){
      this.$("installation").open=!installed||runtime?.available===false;s.installationInitialized=true;
    }
    for(const agent of ["codex","claude","opencode","gemini"]){
      const details=document.getElementById(agent+"-install");
      if(details){details.hidden=agent!==s.agent;details.open=agent===s.agent;}
    }
    for(const button of this.$("installation").querySelectorAll?.("[data-agent-action]")||[]){
      const context=this.context();
      button.disabled=context.demo||context.paused||(context.platform==="ios"&&!context.online)||s.confirming||s.busy||s.updateBusy||s.updateStatusBusy||(context.online&&context.supported&&!s.report)||this.activeLogin(s)||this.updating(s);
    }
  }
  render(){
    const s=this.state;if(!s)return;
    this.renderInstallation();
    const usable=this.available()&&this.current(s),pending=this.activeLogin(s),report=s.report,updating=this.updating(s);
    const loading=usable&&!!(s.loading||(s.busy&&!report)||(s.updateBusy&&!report));
    this.$("status").setAttribute("aria-busy",String(loading));
    this.$("status").dataset.loading=String(loading);
    this.$("status").textContent=!usable?this.t(this.context().online?"connection_update_bridge":"connection_need_bridge"):loading?this.t("connection_loading"):this.t("connection_"+(report?.state||"unknown"));
    if(usable&&!loading&&report?.method)this.$("status").textContent+=" · "+report.method;
    this.$("version").textContent=s.version?this.t("connection_version",{version:s.version}):"";
    this.$("error").textContent=s.error?this.t(s.error):"";this.$("error").hidden=!s.error;
    this.$("account").hidden=s.report?.installed===false;
    this.$("provider-field").hidden=s.agent!=="opencode";
    this.$("form").hidden=!usable||!report?.installed||!["codex","opencode","claude","gemini"].includes(s.agent);
    const m=this.choice();this.$("key-field").hidden=m?.type!=="api"||!!this.actions.secret;
    this.$("private").hidden=m?.type!=="api";
    this.$("login-hint").hidden=!["oauth","terminal"].includes(m?.type);
    this.$("submit").textContent=this.t(["oauth","terminal"].includes(m?.type)?"agent_action_login":"connection_connect");
    for(const id of ["agent","provider","method","key","submit","refresh","version-check"])this.$(id).disabled=s.confirming||s.busy||pending||(updating&&id!=="agent")||(id!=="agent"&&(!usable||loading))||(id==="version-check"&&report?.installed===false)||(id==="submit"&&!m?.supported);
    this.$("key").required=m?.type==="api"&&!this.actions.secret&&!this.$("form").hidden;
    this.$("job").hidden=!s.job;
    this.$("job-status").textContent=s.job?this.t("connection_job_"+s.job.status):"";
    if(s.job&&!pending&&s.closedBrowserJob!==s.job.id){s.closedBrowserJob=s.job.id;this.actions.closeBrowser?.(s.job.id);}
    this.$("instructions").textContent=s.job?.instructions||"";
    this.$("site").textContent=s.job?.url?new URL(s.job.url).origin:"";
    this.$("browser").hidden=!pending||!s.job?.url;
    this.$("browser").disabled=!usable;
    this.$("code-form").hidden=!pending||!s.job?.code_required||s.job?.code_submitted;
    this.$("code").hidden=!!this.actions.codeSecret;
    this.$("code").required=!this.actions.codeSecret&&!this.$("code-form").hidden;
    this.$("code-submit").disabled=s.busy||!usable;
    this.$("cancel").hidden=s.job?.status!=="pending";this.$("cancel").disabled=s.busy||!usable;
    const terminalUnavailable=!this.context().loginTerminal||(!s.project&&!this.context().loginWithoutProject);
    this.$("terminal").disabled=s.busy||pending||updating||this.context().demo||this.context().paused||(s.agent!=="gemini"&&(!usable||terminalUnavailable));
    if(m?.type==="terminal"&&terminalUnavailable)this.$("submit").disabled=true;
    this.$("terminal").hidden=s.agent==="gemini";
    this.$("terminal").textContent=this.t("connection_terminal_in_app");
    if(s.agent!=="gemini")this.$("fallback-hint").textContent=this.t(!this.context().loginTerminal?"connection_update_bridge":"connection_terminal_in_app_hint");
    else this.$("fallback-hint").textContent=this.t(this.context().loginUI?"connection_native_unavailable":"connection_update_bridge");
    this.$("fallback-hint").hidden=m?.type!=="terminal"&&usable&&["codex","opencode","claude","gemini"].includes(s.agent)&&this.choices?.some(m=>m.supported);
    this.$("updates").hidden=!this.context().updates||report?.installed===false;
    const plan=s.updatePlan,job=s.updateJob;
    this.$("update-target").textContent=plan?.latest_version?this.t("agent_update_target",{current:plan.current_version,latest:plan.latest_version}):"";
    this.$("update-check").disabled=!usable||s.busy||s.updateBusy||pending||updating;
    this.$("update-start").textContent=this.t(this.context().maintenance&&plan?.blocked_reason==="sessions"?"agent_operation_update":"agent_update_start");
    this.$("update-start").disabled=!usable||s.busy||s.updateBusy||pending||updating||!plan?.available||(plan.blocked&&!(this.context().maintenance&&["sessions","account","update"].includes(plan.blocked_reason)));
    const reason=pending?"login":s.busy?"account":plan?.blocked_reason;
    const blockedKey=["sessions","login","account","update","maintenance"].includes(reason)?"agent_update_blocked_"+reason:"agent_update_blocked";
    this.$("update-status").textContent=s.updateError||s.updateStatusError?this.t(s.updateError||s.updateStatusError):s.updateBusy&&!updating?this.t("connection_loading"):
      updating?this.t("agent_update_"+job.status):job?.status==="failed"?this.t(job.error||"error_agent_update_failed"):
      job?.status==="succeeded"?this.t("agent_update_succeeded",{version:job.installed_version}):plan?
      this.t(!plan.supported?(plan.unsupported_reason==="major"?"agent_update_major":"agent_update_unsupported"):
        (plan.blocked||pending||s.busy)?(this.context().maintenance&&reason==="sessions"?"agent_operation_update_hint":blockedKey):!plan.available?"agent_update_current":"agent_update_ready",{count:plan.active_session_count||0}):"";
    this.renderOperation();this.renderRecovery(s.updateJob,"update-recovery-");this.renderRecovery(s.job,"recovery-");
    this.actions.sync();
  }
};
