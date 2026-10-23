"use strict";
window.BibimerMaintenance = class BibimerMaintenance {
  constructor(t, context, request, actions) {
    this.t=t;this.context=context;this.request=request;this.actions=actions;this.state=null;
    this.recoveryError=null;this.recovery=null;this.recoverySupported=false;this.recoveryPolling=false;this.recoveryChecked=0;
    this.dialog=document.getElementById("bridge-maintenance-dialog");
    this.$=id=>document.getElementById("bridge-maintenance-"+id);
    this.$("confirm").addEventListener("click",()=>void this.confirm());
    this.$("reopen").addEventListener("change",()=>{if(this.state && !this.busy)this.state.reopen=this.$("reopen").checked;});
    document.getElementById("bridge-recovery-retry").addEventListener("click",()=>void this.retryRecovery());
    this.$("cancel").addEventListener("click",()=>this.dialog.close());
    this.dialog.addEventListener("cancel",event=>{if(this.stopping)event.preventDefault();});
    this.dialog.addEventListener("close",()=>{if(!this.stopping){this.state=null;this.actions.changed();}});
  }
  get busy() { return !!(this.state?.busy || this.state?.loading); }
  get stopping() { return !!this.state?.busy; }
  rows(health) {
    const rows=new Map();
    const add=(row,project)=>{if(row && ["running","stopping"].includes(row.state))rows.set(row.id,{...row,project:row.project || project});};
    for(const project of health.projects || [])for(const row of project.sessions || [project.session])add(row,project);
    add(health.session,health.project);
    if((health.active_sessions || 0)>rows.size)throw {key:"bridge_maintenance_stop_failed"};
    return [...rows.values()];
  }
  ensure(state) {
    const ctx=this.context();
    if(this.state!==state || !this.dialog.open || ctx.paused || !ctx.online || !ctx.allowed(state.action))throw {key:"bridge_maintenance_failed"};
    if(ctx.instance!==state.instance)throw {key:"bridge_restarted"};
  }
  async health(state) {
    this.ensure(state);
    const health=await this.request("GET","/v1/health");
    this.ensure(state);
    if(health.instance!==state.instance)throw {key:"bridge_restarted"};
    return this.rows(health);
  }
  changed() { this.render();this.actions.changed(); }
  async open(action) {
    const ctx=this.context();
    if(this.busy || this.dialog.open || !ctx.allowed(action) || ctx.paused)return;
    // Offline state is checked by the authenticated Termux maintenance helper.
    // Stale rows never authorize terminating sessions we cannot inspect.
    if(!ctx.online){this.actions.start(action);return;}
    const state=this.state={action,instance:ctx.instance,rows:null,loading:true,busy:false,error:null,stopped:0,reopen:action==="update" && !!ctx.reopen};
    this.dialog.showModal();this.changed();
    await this.load(state);
  }
  async load(state) {
    state.loading=true;state.error=null;this.changed();
    try {
      state.rows=await this.health(state);
      if(state.rows.length>128)state.reopen=false;
      if(!state.rows.length)this.start(state);
    } catch(error) {if(this.state===state)state.error=error.key==="bridge_restarted"?error.key:"bridge_maintenance_stop_failed";}
    finally {if(this.state===state){state.loading=false;this.changed();}}
  }
  same(a,b) { return a.length===b.length && a.every(row=>b.some(other=>row.id===other.id)); }
  start(state) {
    this.ensure(state);
    const action=state.action;this.state=null;this.dialog.close();this.actions.start(action, state.reopen && state.rows?.length ?
      {id:this.actions.id(),instance:state.instance,session_ids:state.rows.map(row=>row.id)} : null);
  }
  async confirm() {
    const state=this.state;if(!state || this.busy)return;
    if(!state.rows){await this.load(state);return;}
    state.busy=true;state.error=null;state.stopped=0;this.changed();
    try {
      const targets=await this.health(state);
      if(!this.same(targets,state.rows)){state.rows=targets;state.error="bridge_maintenance_changed";return;}
      for(const row of targets) {
        this.ensure(state);
        if(!/^[a-f0-9-]{36}$/.test(row.id))throw {key:"bridge_maintenance_stop_failed"};
        await this.request("POST","/v1/sessions/"+row.id+"/stop",{});
        ++state.stopped;this.changed();
      }
      const deadline=Date.now()+20000;
      while(true) {
        const rows=await this.health(state);
        if(rows.some(row=>!targets.some(target=>target.id===row.id))){state.rows=rows;state.error="bridge_maintenance_changed";return;}
        if(!rows.length){this.start(state);return;}
        if(Date.now()>=deadline)throw {key:"bridge_maintenance_stop_failed"};
        await new Promise(resolve=>setTimeout(resolve,250));
      }
    } catch(error) {if(this.state===state)state.error=error.key==="bridge_restarted"?error.key:"bridge_maintenance_stop_failed";}
    finally {if(this.state===state){state.busy=false;this.changed();}}
  }
  get recovering() { return this.recovery?.state==="restoring"; }
  setRecovery(health) {
    this.recoverySupported=health.features?.includes("maintenance_recovery")===true;
    this.recovery=this.recoverySupported?health.maintenance_recovery:null;
  }
  async pollRecovery() {
    const ctx=this.context();
    if(!this.recoverySupported || this.recoveryPolling || !ctx.online || ctx.paused || Date.now()-this.recoveryChecked<1500)return;
    const instance=ctx.instance;this.recoveryPolling=true;this.recoveryChecked=Date.now();
    try {
      const value=await this.request("GET","/v1/maintenance/recovery");
      if(this.context().instance===instance)this.recovery=value.recovery;
    } catch(_) {} finally {this.recoveryPolling=false;this.renderRecovery();}
  }
  async retryRecovery() {
    const ctx=this.context(),plan=this.recovery;
    if(!plan?.retryable || this.recovering || this.recoveryPolling || !ctx.online || ctx.paused)return;
    this.recoveryPolling=true;this.recoveryError=null;this.renderRecovery();
    try {
      const result=await this.request("POST","/v1/maintenance/recovery",{id:plan.id});
      if(this.context().instance===ctx.instance)this.recovery=result.recovery;
    } catch(_) {if(this.context().instance===ctx.instance)this.recoveryError="error_maintenance_recovery";} finally {this.recoveryPolling=false;this.renderRecovery();}
  }
  renderRecovery() {
    const plan=this.recovery,ctx=this.context(),$=id=>document.getElementById("bridge-recovery-"+id);
    document.getElementById("bridge-recovery").hidden=!plan;
    if(!plan)return;
    $("status").textContent=this.recoveryError?this.t(this.recoveryError):this.t(this.recovering?"maintenance_recovery_progress":"maintenance_recovery_result",{done:plan.restored,total:plan.total});
    $("rows").replaceChildren(...plan.rows.filter(row=>["failed","skipped","uncertain"].includes(row.state)).map(row=>{
      const item=document.createElement("li"),source=this.actions.find?.(row.id);
      item.textContent=(source?this.actions.title(source):row.id.slice(0,8))+" · "+this.t(row.error || "maintenance_recovery_failed");return item;
    }));
    $("retry").hidden=!plan.retryable;
    $("retry").disabled=this.recovering || this.recoveryPolling || !ctx.online || ctx.paused;
  }
  render() {
    const state=this.state;if(!state)return;
    this.$("confirm").textContent=this.t(state.rows ? state.action==="update"?"bridge_maintenance_end_update":"bridge_maintenance_end_restart":"sidebar_refresh");
    this.$("confirm").disabled=this.busy || !this.context().online || this.context().paused;
    this.$("cancel").disabled=state.busy;
    this.$("reopen-option").hidden=state.action!=="update" || !this.context().reopen;
    this.$("reopen").checked=state.reopen;
    this.$("reopen").disabled=this.busy || (state.rows?.length || 0)>128;
    this.$("confirm").setAttribute("aria-busy",String(this.busy));
    this.$("progress").textContent=this.t(state.error || (state.loading?"sidebar_loading":state.busy?"bridge_maintenance_stopping":"bridge_maintenance_active"),
      {count:state.rows?.length || 0,done:state.stopped});
    this.$("sessions").replaceChildren(...(state.rows || []).map(row=>{
      const item=document.createElement("li"),title=document.createElement("strong"),detail=document.createElement("small");
      title.textContent=this.actions.title(row);
      detail.textContent=[row.project?.name,this.t("agent_"+row.agent),this.actions.status(row),row.archived?this.t("session_archived"):"",
        row.queued_count?this.t("queue_count",{count:row.queued_count}):"",row.project?.path].filter(Boolean).join(" · ");
      item.append(title,detail);return item;
    }));
  }
};
