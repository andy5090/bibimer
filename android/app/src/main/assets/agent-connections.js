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
    this.$("update-start").addEventListener("click",()=>void this.updates("start"));
    this.$("version-check").addEventListener("click",()=>void this.load("version"));
    this.$("form").addEventListener("submit",event=>{event.preventDefault();void this.start();});
    this.$("browser").addEventListener("click",()=>{const s=this.state;if(this.current(s)&&s.job?.status==="pending"&&s.job.url)this.actions.link(s.job.url);});
    this.$("code-form").addEventListener("submit",event=>{event.preventDefault();void this.sendCode();});
    this.$("cancel").addEventListener("click",()=>void this.cancel());
    this.$("terminal").addEventListener("click",()=>void this.openTerminal());
  }
  $(id){return document.getElementById("agent-connection-"+id);}
  get dialog(){return this.$("dialog");}
  current(state){const c=this.context();return !!state&&state===this.state&&c.instance===state.instance&&c.project===state.project&&(c.path||null)===state.path&&!c.demo;}
  available(){const c=this.context();return c.online&&c.supported&&!c.demo&&!c.paused;}
  clearSecrets(){this.$("key").value="";this.$("code").value="";}
  pause(){clearTimeout(this.timer);clearTimeout(this.updateTimer);this.timer=null;this.updateTimer=null;this.clearSecrets();}
  payload(extra={}){const s=this.state;return {agent:s.agent,...(s.project?{project_id:s.project,...(s.path?{worktree_path:s.path}:{})}:{}),...extra};}
  async open(agent="codex") {
    this.pause();
    const c=this.context(), previous=this.state;
    if(c.demo)return;
    if(!this.current(previous)||previous.agent!==agent){
      if(this.current(previous)&&previous.job?.status==="pending")void this.request(this.payload({action:"cancel",id:previous.job.id})).catch(()=>{});
      this.state={agent,instance:c.instance,project:c.project,path:c.path||null,report:null,job:null,busy:false,error:null,version:""};
    }
    this.$("agent").value=agent;
    if(!this.dialog.open)this.dialog.showModal();
    this.render();
    if(this.context().updates)await this.updates("status");
    if(this.updating())return;
    if(this.state.job?.status==="pending")void this.poll();else await this.load();
  }
  updating(s=this.state){return ["installing","verifying"].includes(s?.updateJob?.status);}
  async updates(action="status"){
    const s=this.state;if(!this.current(s)||!this.available()||!this.context().updates||s.updateBusy)return;
    if(action==="check"&&(this.updating(s)||s.busy||s.job?.status==="pending"))return;
    if(action==="start"&&(!s.updatePlan?.available||s.updatePlan.blocked||this.updating(s)||s.busy||s.job?.status==="pending"))return;
    s.updateBusy=true;s.updateError=null;this.render();
    const body={agent:s.agent,action,...(action==="poll"?{id:s.updateJob.id}:{}),
      ...(action==="start"?{plan_id:s.updatePlan.id,request_id:s.updateRequest ||= this.actions.uuid()}: {})};
    try{
      const result=await this.actions.updates(body);
      if(!this.current(s))return;
      if(result.plan){s.updatePlan=result.plan;s.updateJob=null;s.updateRequest=null;s.version=result.plan.current_version;}
      if(result.job)s.updateJob=result.job;
      if(s.updateJob?.status==="succeeded"){s.version=s.updateJob.installed_version;s.updatePlan=null;}
      if(s.updateJob?.status==="failed"){s.updatePlan=null;s.updateRequest=null;}
    }catch(e){if(this.current(s))s.updateError=e.key||"error_agent_update_failed";}
    finally{
      if(this.current(s)){
        s.updateBusy=false;this.render();
        if(this.updating(s)&&this.dialog.open&&this.available())this.updateTimer=setTimeout(()=>{this.updateTimer=null;void this.updates("poll");},1000);
      }
    }
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
    s.busy=true;s.error=null;this.render();
    try{
      const result=await this.request(this.payload({action}));
      if(!this.current(s))return;
      if(action==="version")s.version=result.version||"";
      else{s.report=result;this.providers();if(result.job)s.job=result.job;}
    }catch(e){if(this.current(s))s.error=e.key||"error_agent_connection";}
    finally{if(this.current(s)){s.busy=false;this.render();}}
  }
  providers(){
    const s=this.state,select=this.$("provider"),value=select.value;
    select.replaceChildren(...(s.report?.providers||[]).map(p=>new Option(p.name+(p.connected?" · "+this.t("connection_configured"):""),p.id)));
    if([...select.options].some(o=>o.value===value))select.value=value;
    this.methods();
  }
  methods(){
    const s=this.state,choices=s.agent==="codex"?[{id:"chatgpt",type:"oauth",name:"ChatGPT",supported:true},{id:"apiKey",type:"api",name:"API key",supported:true}]:["claude","gemini"].includes(s.agent)&&this.context().loginUI?(s.report?.login_methods||[]):(s.report?.providers||[]).find(p=>p.id===this.$("provider").value)?.methods||[];
    this.choices=choices;
    this.$("method").replaceChildren(...choices.map(m=>{const o=new Option(m.name,m.id);o.disabled=!m.supported;if(!m.supported){o.dataset ||= {};o.dataset.description=this.t("connection_fallback");}return o;}));
    const first=choices.find(m=>m.supported);if(first)this.$("method").value=first.id;
    this.render();
  }
  choice(){return this.choices?.find(m=>m.id===this.$("method").value);}
  async start(){
    const s=this.state,m=this.choice();if(!this.current(s)||s.busy||this.updating(s)||!this.available()||!m?.supported||s.job?.status==="pending")return;
    const body=this.payload({action:"start",method:m.id,request_id:this.actions.uuid(),...(s.agent==="opencode"?{provider:this.$("provider").value}:{}),...(m.type==="api"?{key:this.$("key").value}:{})});
    this.clearSecrets();s.busy=true;s.error=null;this.render();
    try{const result=await this.request(body);if(this.current(s))s.job=result.job;}
    catch(e){if(this.current(s))s.error=e.key||"error_agent_connection";}
    finally{delete body.key;if(this.current(s)){s.busy=false;this.render();if(s.job?.status==="pending")void this.poll();}}
  }
  async poll(){
    const s=this.state;if(!this.current(s)||s.busy||s.job?.status!=="pending"||!this.dialog.open||!this.available())return;
    clearTimeout(this.timer);s.busy=true;
    try{const result=await this.request(this.payload({action:"poll",id:s.job.id}));if(this.current(s)){s.job=result.job;s.error=null;}}
    catch(e){if(this.current(s))s.error=e.key||"error_agent_connection";}
    finally{if(this.current(s)){s.busy=false;this.render();if(s.job?.status==="pending"&&this.dialog.open&&this.available())this.timer=setTimeout(()=>void this.poll(),2000);}}
  }
  async sendCode(){
    const s=this.state;if(!this.current(s)||s.busy||!this.available()||!s.job?.code_required)return;
    const body=this.payload({action:"code",id:s.job.id,code:this.$("code").value});
    this.clearSecrets();s.busy=true;s.error=null;
    try{const r=await this.request(body);if(this.current(s))s.job=r.job;}
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
    if(!this.current(this.state)){this.pause();this.dialog.close();return;}
    if(!this.available())this.pause();
    if(this.available()&&this.updating()&&!this.state.updateBusy&&!this.updateTimer)void this.updates("poll");
    this.render();
    if(this.available()&&this.state.job?.status==="pending"&&!this.state.busy&&!this.timer)void this.poll();
  }
  render(){
    const s=this.state;if(!s)return;
    const usable=this.available()&&this.current(s),pending=s.job?.status==="pending",report=s.report,updating=this.updating(s);
    this.$("status").textContent=!usable?this.t(this.context().online?"connection_update_bridge":"connection_need_bridge"):s.busy&&!report?this.t("connection_loading"):this.t("connection_"+(report?.state||"unknown"));
    if(usable&&report?.method)this.$("status").textContent+=" · "+report.method;
    this.$("version").textContent=s.version?this.t("connection_version",{version:s.version}):"";
    this.$("error").textContent=s.error?this.t(s.error):"";this.$("error").hidden=!s.error;
    this.$("provider-field").hidden=s.agent!=="opencode";
    this.$("form").hidden=!usable||!report?.installed||!["codex","opencode","claude","gemini"].includes(s.agent);
    const m=this.choice();this.$("key-field").hidden=m?.type!=="api";
    this.$("private").hidden=m?.type!=="api";
    this.$("login-hint").hidden=m?.type!=="oauth";
    this.$("submit").textContent=this.t(m?.type==="oauth"?"agent_action_login":"connection_connect");
    for(const id of ["agent","provider","method","key","submit","refresh","version-check"])this.$(id).disabled=s.busy||pending||(updating&&id!=="agent")||(id!=="agent"&&!usable)||(id==="submit"&&!m?.supported);
    this.$("key").required=m?.type==="api"&&!this.$("form").hidden;
    this.$("job").hidden=!s.job;
    this.$("job-status").textContent=s.job?this.t("connection_job_"+s.job.status):"";
    this.$("instructions").textContent=s.job?.instructions||"";
    this.$("site").textContent=s.job?.url?new URL(s.job.url).origin:"";
    this.$("browser").hidden=!pending||!s.job?.url;
    this.$("browser").disabled=!usable;
    this.$("code-form").hidden=!pending||!s.job?.code_required||s.job?.code_submitted;
    this.$("code-submit").disabled=s.busy||!usable;
    this.$("cancel").hidden=!pending;this.$("cancel").disabled=s.busy||!usable;
    this.$("terminal").disabled=s.busy||pending||updating||this.context().demo||this.context().paused||(s.agent!=="gemini"&&(!usable||!this.context().loginTerminal||!s.project));
    this.$("terminal").hidden=s.agent==="gemini";
    this.$("terminal").textContent=this.t("connection_terminal_in_app");
    if(s.agent!=="gemini")this.$("fallback-hint").textContent=this.t(!this.context().loginTerminal?"connection_update_bridge":"connection_terminal_in_app_hint");
    else this.$("fallback-hint").textContent=this.t(this.context().loginUI?"connection_native_unavailable":"connection_update_bridge");
    this.$("fallback-hint").hidden=usable&&["codex","opencode","claude","gemini"].includes(s.agent)&&this.choices?.some(m=>m.supported);
    this.$("updates").hidden=!this.context().updates;
    const plan=s.updatePlan,job=s.updateJob;
    this.$("update-target").textContent=plan?.latest_version?this.t("agent_update_target",{current:plan.current_version,latest:plan.latest_version}):"";
    this.$("update-check").disabled=!usable||s.busy||s.updateBusy||pending||updating;
    this.$("update-start").disabled=!usable||s.busy||s.updateBusy||pending||updating||!plan?.available||plan.blocked;
    this.$("update-status").textContent=s.updateError?this.t(s.updateError):s.updateBusy&&!updating?this.t("connection_loading"):
      updating?this.t("agent_update_"+job.status):job?.status==="failed"?this.t(job.error||"error_agent_update_failed"):
      job?.status==="succeeded"?this.t("agent_update_succeeded",{version:job.installed_version}):plan?
      this.t(!plan.supported?"agent_update_unsupported":plan.blocked?"agent_update_blocked":!plan.available?"agent_update_current":"agent_update_ready"):"";
    this.actions.sync();
  }
};
