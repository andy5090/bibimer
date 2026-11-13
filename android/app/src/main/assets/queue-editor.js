"use strict";
window.BibimerQueueEditor = class BibimerQueueEditor {
  constructor(t, context, request, actions) {
    this.t=t;this.context=context;this.request=request;this.actions=actions;this.state=null;this.drafts=new Map();
    this.$=id=>document.getElementById("queue-edit-"+id);
    this.$("form").addEventListener("submit",event=>{event.preventDefault();void this.save();});
    this.$("cancel").addEventListener("click",()=>{if(!this.state?.busy){this.pause();this.actions.changed();}});
    this.$("dialog").addEventListener("cancel",event=>{if(this.state?.busy)event.preventDefault();});
    this.$("dialog").addEventListener("close",()=>{if(this.$("dialog").open||this.state?.preparing)return;this.remember();this.state=null;this.$("text").value="";this.$("original").textContent="";this.actions.changed();});
    this.$("text").addEventListener("input",()=>{if(this.state){this.state.receipt=null;this.remember();}});
  }
  key(ctx,id){return JSON.stringify([ctx.instance,ctx.session,ctx.launch,id]);}
  current(state=this.state){const c=this.context();return !!state&&state===this.state&&c.instance===state.instance&&c.session===state.session&&c.launch===state.launch&&c.project===state.project;}
  available(){const c=this.context();return c.supported&&c.online&&!c.paused&&c.work&&c.running;}
  editing(id){return !!this.state&&this.state.session===id;}
  remember(){const s=this.state;if(!s||!this.$("dialog").open&&s.preparing)return;this.drafts.set(s.key,{text:this.$("text").value,revision:s.baseRevision ?? s.revision});if(this.drafts.size>64)this.drafts.delete(this.drafts.keys().next().value);}
  async open(entry){
    if(!this.available()||this.state||!["queued","failed"].includes(entry.state))return;
    const c=this.context(),s={...c,id:entry.id,key:this.key(c,entry.id),busy:true,preparing:true};this.state=s;this.actions.changed();
    try{
      const result=await this.request(s.session,{action:"edit_begin",entry_id:s.id,request_id:this.actions.uuid()});
      if(!this.current(s)||!this.available()){if(this.state===s)this.state=null;return;}
      this.actions.accept(result,s.session);
      const row=result.queue?.find(item=>item.id===s.id);
      if(!result.session?.queue_paused||!["queued","failed"].includes(row?.state))throw {key:"error_queue_entry"};
      s.revision=row.edit_revision||0;s.preparing=false;
      const draft=this.drafts.get(s.key);s.baseRevision=draft?.revision ?? s.revision;
      this.$("text").value=draft?draft.text:row.text;
      this.$("current").hidden=!draft||draft.revision===s.revision;
      this.$("current").open=!!draft&&draft.revision!==s.revision;
      this.$("original").textContent=this.$("current").hidden?"":row.text;
      this.$("status").textContent="";this.$("dialog").showModal();this.$("text").focus();
    }catch(error){if(this.current(s))this.actions.error(error.key||"error_request_failed");if(this.state===s)this.state=null;}
    finally{s.busy=false;if(this.state===s)this.render();this.actions.changed();}
  }
  render(){if(!this.state)return;const disabled=this.state.busy||!this.available();this.$("save").disabled=disabled;this.$("cancel").disabled=this.state.busy;this.$("text").readOnly=this.state.busy;}
  async save(){
    const s=this.state;if(!this.current(s)||!this.available()||s.busy||s.preparing)return;
    const text=this.$("text").value;
    if(!text.trim()||new TextEncoder().encode(text).length>16384){this.$("status").textContent=this.t("error_input_size");return;}
    this.remember();s.busy=true;this.render();
    try{
      const command=await this.actions.invocation(text);
      if(!this.current(s)||!this.available())return;
      const receipt=s.receipt ||= this.actions.uuid();
      const result=await this.request(s.session,{...command,action:"edit",entry_id:s.id,text,expected_revision:s.revision,request_id:receipt});
      if(!this.current(s))return;
      this.actions.accept(result,s.session);this.drafts.delete(s.key);
      // Close without retaining the saved text as an unsaved draft.
      this.state=null;this.$("text").value="";if(this.$("dialog").open)this.$("dialog").close();
      this.actions.error("queue_edit_saved");
    }catch(error){if(this.current(s))this.$("status").textContent=this.t(error.key||"error_request_failed");}
    finally{s.busy=false;if(this.state===s)this.render();this.actions.changed();}
  }
  update(){if(this.state&&(!this.current()||!this.available()))this.pause();else this.render();}
  pause(){
    const s=this.state;if(!s)return;
    if(!s.preparing)this.remember();
    this.state=null;if(this.$("dialog").open)this.$("dialog").close();this.$("text").value="";this.$("original").textContent="";
  }
};
