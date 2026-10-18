"use strict";
/* GitHub credentials never enter this view. Native gh owns authentication. */
window.BibimerGitHub = class {
  constructor(t, context, request, actions) {
    this.t=t; this.context=context; this.request=request; this.actions=actions;
    this.$=id=>document.getElementById("github-"+id);
    this.state={login:{state:"idle"},jobs:[]}; this.entries=[]; this.next=null;
    this.loading=false; this.error=null; this.pending=null; this.timer=null; this.epoch=0; this.openIntent=null; this.cloneRequestId=null;
    this.$("launch").addEventListener("click",()=>this.open());
    this.$("close").addEventListener("click",()=>this.$("dialog").close());
    this.$("dialog").addEventListener("close",()=>{clearTimeout(this.timer);this.openIntent=null;this.cloneRequestId=null;});
    this.$("refresh").addEventListener("click",()=>this.refresh());
    this.$("connect").addEventListener("click",()=>this.perform("login"));
    this.$("cancel-login").addEventListener("click",()=>this.perform("cancel_login"));
    this.$("copy-code").addEventListener("click",()=>{if(this.state.login.code)this.actions.copy(this.state.login.code);});
    this.$("browser").addEventListener("click",()=>this.actions.link("https://github.com/login/device"));
    this.$("install").addEventListener("click",()=>this.actions.copy("pkg install git gh"));
    this.$("manual").addEventListener("click",()=>this.actions.copy("gh auth login --hostname github.com --git-protocol https --web"));
    this.$("termux").addEventListener("click",()=>this.actions.termux());
    this.$("filter").addEventListener("input",()=>this.renderRepositories());
    this.$("more").addEventListener("click",()=>this.repositories(true));
    this.$("browse").addEventListener("click",()=>this.actions.browse(this.$("parent").value,path=>{
      this.$("parent").value=path;this.draftChanged();this.$("name").focus();
    }));
    for(const id of ["repository","parent","name"])this.$(id).addEventListener("input",()=>this.draftChanged());
    this.$("form").addEventListener("submit",event=>{event.preventDefault();this.clone();});
  }
  async open() {
    if(!this.pending && !this.state.jobs.some(job=>["cloning","registering"].includes(job.state)))
      this.$("parent").value=this.actions.parent?.()||this.$("parent").value||this.context().home||"~";
    this.$("dialog").showModal(); this.render(); await this.refresh();
  }
  schedule() {
    clearTimeout(this.timer);
    if(this.$("dialog").open)this.timer=setTimeout(()=>this.poll(),1500);
  }
  async poll() {
    if(this.loading || !this.context().online || !this.context().supported){this.schedule();return;}
    const epoch=this.epoch;
    try {
      const previous=this.state.login.state;
      const data=await this.request({action:"poll"});
      if(epoch!==this.epoch)return;
      this.accept(data);
      if(previous!=="complete" && data.login.state==="complete"){await this.refresh();return;}
    }catch(error){if(epoch===this.epoch)this.error=error.key||"error_github_api";}
    this.render();await this.openCompletedClone();this.schedule();
  }
  accept(data) {
    const completed = new Set(this.state.jobs.filter(job=>job.state==="complete").map(job=>job.id));
    this.state={...this.state,...data};
    if(this.state.jobs.some(job=>job.state==="complete"&&!completed.has(job.id)))void this.actions.refresh();
    if(this.pending && this.state.jobs.some(job=>job.id===this.pending.request_id)){
      this.rememberClone(this.state.jobs.find(job=>job.id===this.pending.request_id));
      this.pending=null;this.error=null;
    }
  }
  async refresh() {
    if(this.loading || !this.context().online || !this.context().supported)return;
    this.loading=true;this.error=null;const epoch=++this.epoch;this.render();
    try {
      const data=await this.request({action:"status"});
      if(epoch!==this.epoch)return;
      this.accept(data);this.entries=[];this.next=null;
      if(data.account){
        const list=await this.request({action:"repositories",page:1});
        if(epoch!==this.epoch)return;
        this.entries=list.entries;this.next=list.next;
      }
    }catch(error){if(epoch===this.epoch)this.error=error.key||"error_github_api";}
    finally{if(epoch===this.epoch){this.loading=false;this.render();await this.openCompletedClone();this.schedule();}}
  }
  async repositories(more) {
    if(this.loading || !this.context().online)return;
    this.loading=true;this.error=null;const epoch=this.epoch;this.render();
    try{
      const data=await this.request({action:"repositories",page:more?this.next:1});
      if(epoch!==this.epoch)return;
      this.entries=[...new Map([...(more?this.entries:[]),...data.entries].map(row=>[row.name,row])).values()];this.next=data.next;
    }catch(error){if(epoch===this.epoch)this.error=error.key||"error_github_api";}
    finally{if(epoch===this.epoch){this.loading=false;this.render();await this.openCompletedClone();this.schedule();}}
  }
  async perform(action,extra={}) {
    if(this.loading || !this.context().online || !this.context().supported)return;
    this.loading=true;this.error=null;const epoch=++this.epoch;this.render();
    try{
      const data=await this.request({action,...extra});
      if(epoch!==this.epoch)return;
      if(data.job){this.state.jobs=[data.job,...this.state.jobs.filter(job=>job.id!==data.job.id)];if(action==="clone")this.rememberClone(data.job);this.pending=null;}
      else this.accept(data);
    }catch(error){
      if(epoch!==this.epoch)return;
      if(action==="clone" && (!error.status || error.status>=500))this.error="github_uncertain";
      else {this.error=error.key||"error_github_api";if(action==="clone"){this.pending=null;this.openIntent=null;}}
    }finally{if(epoch===this.epoch){this.loading=false;this.render();await this.openCompletedClone();this.schedule();}}
  }
  async clone() {
    if(this.$("submit").disabled)return;
    try {
      if(!this.pending)this.pending={action:"clone",request_id:crypto.randomUUID(),repository:this.$("repository").value.trim(),
        parent:this.$("parent").value.trim(),name:this.$("name").value.trim()};
      this.cloneRequestId=this.pending.request_id;
      this.openIntent={id:this.pending.request_id};
      await this.perform("clone",this.pending);
    } catch(error) {
      this.error=error.key||"error_request_failed";
    } finally {
      this.render();
      if(this.$("dialog").open && !this.$("clone-status").hidden)this.$("clone-feedback").scrollIntoView?.({block:"nearest"});
    }
  }
  draftChanged() {
    if(!this.pending && !this.state.jobs.some(job=>["cloning","registering"].includes(job.state))){
      this.cloneRequestId=null;this.error=null;
    }
    this.render();
  }
  async openCompletedClone() {
    const intent=this.openIntent;
    if(!intent || intent.opening || this.loading || !this.context().online || !this.$("dialog").open)return;
    const job=this.state.jobs.find(job=>job.id===intent.id);
    if(!job)return;
    if(["failed","cancelled"].includes(job.state)){this.openIntent=null;return;}
    if(job.state!=="complete" || !job.project_id)return;
    intent.opening=true;const epoch=this.epoch;
    try {
      const opened=await this.actions.open(job.project_id);
      if(epoch===this.epoch && this.openIntent===intent){
        this.openIntent=null;
        if(opened)this.$("dialog").close();
      }
    } catch(error) {
      if(epoch===this.epoch && this.openIntent===intent){this.openIntent=null;this.error=error.key||"error_request_failed";this.render();}
    }
  }
  rememberClone(job) {
    if(job && ["cloning","registering","complete"].includes(job.state))this.actions.rememberClone?.(job.path);
  }
  renderRepositories() {
    const disabled=this.loading||!this.context().online||!!this.pending||this.state.jobs.some(job=>["cloning","registering"].includes(job.state));
    const filter=this.$("filter").value.trim().toLowerCase();
    const rows=this.entries.filter(row=>row.name.toLowerCase().includes(filter)||row.description.toLowerCase().includes(filter));
    const signature=JSON.stringify([rows,disabled,this.$("repository").value,this.t("github_private")]);
    if(signature===this.repoSignature)return;this.repoSignature=signature;
    this.$("entries").replaceChildren();
    for(const row of rows){
      const button=document.createElement("button");button.type="button";button.className="github-repository";button.disabled=disabled;
      button.setAttribute("aria-pressed",String(this.$("repository").value===row.name));
      const name=document.createElement("strong");name.textContent=row.name;
      const detail=document.createElement("small");detail.textContent=[this.t(row.private?"github_private":"github_public"),row.archived?this.t("github_archived"):"",row.description].filter(Boolean).join(" · ");
      button.append(name,detail);button.addEventListener("click",()=>{
        this.$("repository").value=row.name;this.$("name").value=row.name.split("/")[1];this.draftChanged();
        this.$("parent").focus();
      });this.$("entries").append(button);
    }
    this.$("empty").hidden=rows.length>0||this.loading;
  }
  renderJobs() {
    const signature=JSON.stringify([this.state.jobs,this.loading,this.context().online,this.t("github_complete")]);
    if(signature===this.jobSignature)return;this.jobSignature=signature;
    this.$("jobs").replaceChildren();
    for(const job of this.state.jobs){
      const card=document.createElement("article");card.className="github-job";
      const title=document.createElement("strong");title.textContent=job.repository;
      const state=document.createElement("p");state.className="hint";state.textContent=this.t("github_"+job.state);
      const path=document.createElement("p");path.className="github-path";path.textContent=job.path;
      card.append(title,state,path);
      if(job.error){const text=document.createElement("p");text.className="hint";text.textContent=this.t(job.error);card.append(text);}
      if(job.state==="complete"||job.state==="cloning"){
        const button=document.createElement("button");button.type="button";button.className="secondary";
        button.textContent=this.t(job.state==="complete"?"github_open":"github_cancel_clone");
        button.disabled=this.loading||!this.context().online;
        button.addEventListener("click",async()=>{
          if(job.state==="cloning")await this.perform("cancel_clone",{id:job.id});
          else if(await this.actions.open(job.project_id))this.$("dialog").close();
        });card.append(button);
      }
      this.$("jobs").append(card);
    }
    this.$("jobs-section").hidden=!this.state.jobs.length;
  }
  render() {
    const ctx=this.context();this.$("launch").disabled=!ctx.online;
    if(!this.$("dialog").open)return;
    const locked=this.loading||!ctx.online||!ctx.supported;
    const authenticating=["starting","waiting"].includes(this.state.login.state);
    const activeJob=this.state.jobs.find(job=>["cloning","registering"].includes(job.state)),cloning=!!activeJob;
    this.$("account").textContent=!ctx.supported?this.t("github_update"):this.state.account?this.t("github_connected",{account:this.state.account}):this.t("github_disconnected");
    this.$("refresh").disabled=locked;
    this.$("connect").hidden=!!this.state.account||authenticating||this.state.installed===false;
    this.$("connect").disabled=locked;
    this.$("tools").hidden=this.state.installed!==false;
    this.$("auth-hint").hidden=!!this.state.account;
    this.$("manual").hidden=!!this.state.account;
    this.$("auth").hidden=!authenticating;
    this.$("login-status").textContent=this.t("github_"+(this.state.login.state==="waiting"?"waiting":"starting"));
    this.$("code").textContent=this.state.login.code||"";
    this.$("copy-code").disabled=!this.state.login.code;
    this.$("browser").disabled=!this.state.login.code;
    this.$("cancel-login").disabled=locked;
    const error=!ctx.online?"error_connection_failed":this.error||(!this.state.account&&this.state.login.state==="failed"?"github_login_failed":this.state.auth_issue?"error_github_api":null);
    this.$("status").textContent=this.state.account?"":error?this.t(error):this.loading?this.t("folder_loading"):"";
    this.$("status").hidden=!this.$("status").textContent;
    this.$("repository-section").hidden=!this.state.account;
    for(const id of ["repository","parent","name","browse"])this.$(id).disabled=locked||!!this.pending||cloning;
    this.$("more").hidden=!this.next;this.$("more").disabled=locked;
    const missing=!this.$("repository").value.trim()?"github_choose_repository":!this.$("parent").value.trim()?"github_choose_parent":!this.$("name").value.trim()?"github_enter_name":null;
    this.$("submit").disabled=locked||cloning||!this.state.account||!!missing;
    const sending=this.loading&&!!this.pending,busy=sending||cloning;
    this.$("submit").textContent=this.t(sending?"github_requesting":activeJob?"github_"+activeJob.state:this.pending?"github_retry":"github_clone");
    this.$("submit").setAttribute("aria-busy",String(busy));
    const job=activeJob||this.state.jobs.find(row=>row.id===this.cloneRequestId),native=job?.progress;
    const measured=job?.state==="cloning"&&["counting","compressing","receiving","resolving","checkout"].includes(native?.phase)&&Number.isInteger(native?.percent)&&native.percent>=0&&native.percent<=100;
    const feedback=error||(!ctx.supported?"github_update":sending?"github_requesting":
      job?(job.error||(measured?"github_progress_"+native.phase:"github_"+job.state)):this.loading?"folder_loading":missing);
    this.$("clone-status").textContent=feedback?this.t(feedback,measured?{percent:native.percent}:{}):"";
    this.$("clone-status").hidden=!feedback;
    this.$("clone-status").classList.toggle("danger-text",!!(error||job?.error));
    this.$("clone-feedback").classList.toggle("busy",busy&&ctx.online&&ctx.supported);
    this.$("clone-progress").hidden=!busy||!ctx.online||!ctx.supported;
    if(measured)this.$("clone-progress").value=native.percent;
    else this.$("clone-progress").removeAttribute("value");
    this.$("clone-progress-note").hidden=!busy||!measured||!ctx.online||!ctx.supported;
    this.$("destination").textContent=this.t("github_destination",{path:this.$("parent").value.replace(/\/$/,"")+"/"+this.$("name").value});
    this.renderRepositories();this.renderJobs();
  }
  reset() {
    ++this.epoch;clearTimeout(this.timer);this.loading=false;this.pending=null;this.openIntent=null;this.cloneRequestId=null;this.error=null;
    this.state={login:{state:"idle"},jobs:[]};this.entries=[];this.next=null;
    this.$("dialog").close();
  }
};
