"use strict";
window.BibimerWorktreeCreate = class BibimerWorktreeCreate {
  constructor(t, context, request, actions) {
    this.t=t; this.context=context; this.request=request; this.actions=actions;
    this.state=null; this.dialog=document.getElementById("worktree-create-dialog");
    this.$=id=>document.getElementById("worktree-"+id);
    this.$("create-form").addEventListener("submit",event=>{event.preventDefault();void this.submit();});
    this.$("branch-choice").addEventListener("change",()=>{this.$("branch").value=this.$("branch-choice").value;this.render();});
    this.$("branch").addEventListener("input",()=>this.render());
    this.$("agent").addEventListener("change",()=>{this.modes();this.render();});
    this.$("create-close").addEventListener("click",()=>this.dialog.close());
    this.$("create-reset").addEventListener("click",()=>{const id=this.state?.project.id;this.state=null;if(id)void this.open(id,true);});
    this.dialog.addEventListener("close",()=>{if(this.state)this.state.auto=false;clearTimeout(this.timer);});
  }
  current(state) { return this.state===state && this.context().instance===state.instance; }
  async open(id, fresh=false) {
    const ctx=this.context(), project=ctx.projects.find(row=>row.id===id);
    if(!project || !ctx.online || !ctx.supported)return;
    if(this.state?.project.id===id && this.state.instance===ctx.instance && !fresh) {
      this.dialog.showModal();this.render();if(this.state.job?.state==="creating")void this.poll(this.state);return;
    }
    const state=this.state={project,instance:ctx.instance,view:ctx.view,loading:true,busy:false,auto:false,job:null,payload:null,error:null,info:null};
    this.$("branch").value="";this.$("branch-choice").replaceChildren();this.$("base").replaceChildren();this.$("agent").replaceChildren();this.$("mode").replaceChildren();
    if(!this.dialog.open)this.dialog.showModal();this.render();
    try {
      const [info,status]=await Promise.all([this.request({action:"options",project_id:id}),this.request({action:"status",project_id:id})]);
      if(!this.current(state))return;
      state.info=info;
      this.$("branch-choice").replaceChildren(new Option(this.t("worktree_new_branch"),""),...info.refs.filter(row=>row.ref.startsWith("refs/heads/")).map(row=>{
        const name=row.ref.slice(11), option=new Option(name,name);
        option.disabled=info.worktrees.some(tree=>tree.branch===name);
        if(option.disabled)option.dataset.description=this.t("error_worktree_branch_used");return option;
      }));
      for(const id of ["base","agent","mode","branch-choice"])this.$(id).dataset.context=project.id;
      this.$("base").replaceChildren(...info.refs.map(row=>{const option=new Option(row.label,row.ref);option.dataset.commit=row.commit;return option;}));
      const agents=ctx.agents;
      this.$("agent").replaceChildren(...agents.map(row=>{const option=new Option(this.t("agent_"+row.id),row.id);option.disabled=!row.installed || row.available===false;option.dataset.description=option.disabled?this.t(row.installed?"error_program_unavailable":"error_program_missing"):"";return option;}));
      this.$("agent").value=agents.find(row=>row.id===project.agent && row.installed && row.available!==false)?.id || agents.find(row=>row.installed && row.available!==false)?.id || "";
      this.modes();
      if(!fresh) state.job=[...status.jobs].reverse().find(row=>!row.session_id && ["creating","complete","interrupted"].includes(row.state)) || null;
      if(state.job)this.restoreJob(state);
    } catch(error) {if(this.current(state))state.error=error.key || "error_worktree_git";}
    finally {if(this.current(state)){state.loading=false;this.render();if(state.job?.state==="creating")void this.poll(state);}}
  }
  restoreJob(state) {
    this.$("branch").value=state.job.branch;
    this.$("branch-choice").value=state.job.new_branch?"":state.job.branch;
    this.$("agent").value=state.job.agent;this.modes();this.$("mode").value=state.job.mode;
    const base=this.$("base"), commit=state.job.base;
    if(![...base.options].some(option=>option.value===commit)) {
      const option=new Option(commit.slice(0,12),commit);option.dataset.commit=commit;base.append(option);
    }
    base.value=commit;
  }
  modes() {
    const agent=this.context().agents.find(row=>row.id===this.$("agent").value);
    const modes=agent?.modes || ["terminal"], previous=this.$("mode").value;
    this.$("mode").replaceChildren(...modes.map(mode=>new Option(this.t("mode_"+mode),mode)));
    this.$("mode").value=modes.includes(previous)?previous:modes.includes("chat")?"chat":"terminal";
  }
  render() {
    const state=this.state;if(!state)return;
    const ctx=this.context(), t=this.t, job=state.job;
    for(const option of this.$("branch-choice").options) {
      if(!option.value)option.text=t("worktree_new_branch");
      if(option.disabled)option.dataset.description=t("error_worktree_branch_used");
    }
    for(const option of this.$("agent").options) {
      option.text=t("agent_"+option.value);
      const agent=ctx.agents.find(row=>row.id===option.value);
      option.dataset.description=option.disabled?t(agent?.installed?"error_program_unavailable":"error_program_missing"):"";
    }
    for(const option of this.$("mode").options)option.text=t("mode_"+option.value);
    if(ctx.instance!==state.instance){state.auto=false;state.error="bridge_restarted";}
    this.$("create-project").textContent=state.project.name;
    const waiting=state.loading || state.busy || job?.state==="creating";
    const frozen=waiting || !!job || !!state.payload;
    for(const id of ["branch","branch-choice","base","agent","mode"])this.$(id).disabled=frozen || !ctx.online;
    this.$("branch").hidden=!!this.$("branch-choice").value;
    const branch=this.$("branch").value.trim(), existing=state.info?.refs.some(row=>row.ref==="refs/heads/"+branch);
    const used=state.info?.worktrees.some(row=>row.branch===branch && row.path!==job?.path);
    if(existing)this.$("base").disabled=true;
    this.$("branch-hint").textContent=t(used?"error_worktree_branch_used":existing?"worktree_branch_existing":"worktree_branch_new");
    this.$("create-path").textContent=job?.path || state.info?.directory || "";
    this.$("create-submit").textContent=t(state.busy?(state.phase==="launching"?"worktree_session_starting":"worktree_creating"):job?.state==="creating"?"worktree_creating":
      job?.session_id?"worktree_open_session":job?.state==="complete"?"worktree_start_session":"worktree_create_start");
    this.$("create-submit").disabled=waiting || !ctx.online || ctx.instance!==state.instance || !state.info ||
      (!job && (!branch || used || !this.$("agent").value || !this.$("base").value)) || (!!job && !["complete"].includes(job.state));
    this.$("create-submit").setAttribute("aria-busy",String(waiting));
    this.$("create-reset").hidden=!job && !state.payload && !state.error;
    this.$("create-reset").textContent=t(state.info?"worktree_create_another":"sidebar_refresh");
    this.$("create-reset").disabled=waiting || !ctx.online;
    this.$("create-status").textContent=t(state.error || job?.error || (state.loading?"sidebar_loading":job?.state==="creating"?"worktree_creating":
      job?.state==="complete"?"worktree_created":"worktree_create_hint"));
  }
  async submit() {
    const state=this.state, ctx=this.context();
    if(!state || this.$("create-submit").disabled || !this.current(state))return;
    if(state.job?.session_id){this.dialog.close();await this.actions.open(state.project.id,state.job.session_id);return;}
    state.error=null;state.auto=true;state.view=ctx.view;
    if(state.job?.state==="complete"){await this.launch(state);return;}
    state.busy=true;state.phase="creating";
    if(!state.payload)state.payload={action:"create",project_id:state.project.id,request_id:this.actions.id(),
      branch:this.$("branch").value.trim(),base:this.$("base").selectedOptions[0].dataset.commit,agent:this.$("agent").value,mode:this.$("mode").value,
      options:this.actions.options(this.$("agent").value,this.$("mode").value)};
    this.render();
    try {
      const result=await this.request(state.payload);
      if(!this.current(state))return;
      state.job=result.job;
      this.restoreJob(state);
    } catch(error) {
      if(this.current(state)) {
        state.error=error.key || "error_request_failed";state.auto=false;
        if(["error_worktree_branch","error_worktree_base","error_worktree_branch_used","error_worktree_path","error_worktree_busy","error_worktree_limit","error_worktree_git"].includes(state.error))state.payload=null;
      }
    } finally {if(this.current(state)){state.busy=false;this.render();if(state.job?.state==="creating")void this.poll(state);else if(state.job?.state==="complete" && state.auto)void this.launch(state);}}
  }
  async poll(state) {
    clearTimeout(this.timer);
    if(!this.current(state) || !this.dialog.open || state.polling)return;
    state.polling=true;
    try {
      const result=await this.request({action:"status",project_id:state.project.id});
      if(!this.current(state))return;
      state.error=null;
      state.job=result.jobs.find(row=>row.id===state.job.id) || state.job;
      if(state.job.state==="complete") {
        await this.actions.refresh();
        if(this.current(state) && this.dialog.open && state.auto && this.context().view===state.view)await this.launch(state);
      }
    } catch(error) {if(this.current(state))state.error=error.key || "error_request_failed";}
    finally {
      state.polling=false;
      if(this.current(state)){this.render();if(this.dialog.open && state.job?.state==="creating")this.timer=setTimeout(()=>this.poll(state),800);}
    }
  }
  async launch(state) {
    if(!this.current(state) || state.busy || !this.dialog.open || !this.context().online)return;
    state.busy=true;state.phase="launching";state.error=null;this.render();
    try {
      const result=await this.request({action:"launch",project_id:state.project.id,request_id:state.job.id});
      if(!this.current(state))return;
      state.job={...result.job,session_id:result.session.id};
      await this.actions.refresh();
      if(this.current(state) && this.dialog.open && this.context().view===state.view){this.dialog.close();await this.actions.open(state.project.id,result.session.id);}
    } catch(error) {if(this.current(state))state.error=error.key || "error_request_failed";}
    finally {if(this.current(state)){state.busy=false;state.auto=false;this.render();}}
  }
};
