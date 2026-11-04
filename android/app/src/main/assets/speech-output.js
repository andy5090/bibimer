"use strict";
// Completion detection consumes structured turn markers, never terminal output or inferred idle state.
class BibimerSpeechOutput {
  constructor(t, native, environment, current, sync) {
    Object.assign(this,{t,native,environment,current,sync});
    this.$=id=>document.getElementById(id);this.seen=new Set();this.latest="";this.context="";this.status="";
    for(const [id,key] of [["tts-enabled","enabled"],["tts-provider","provider"],["tts-mode","mode"],["tts-engine","engine"],["tts-voice","voice"]]) {
      this.$(id).addEventListener("change",()=>{
        if(key!=="enabled"&&!this.environment().speechOutput?.enabled)return;
        const value=key==="enabled"?this.$(id).checked:this.$(id).value;
        try {if(!native.configureSpeechOutput(JSON.stringify({[key]:value})))this.status="tts_failed";else this.status="";}
        catch(_){this.status="tts_failed";}
        this.render();this.sync();
        if(["provider","engine"].includes(key)&&this.environment().speechOutput?.enabled)native.refreshSpeechVoices?.(false);
      });
    }
    this.$("tts-refresh").addEventListener("click",()=>{if(!this.$("tts-refresh").disabled)native.refreshSpeechVoices?.(false);});
    this.$("tts-more").addEventListener("click",()=>{if(!this.$("tts-more").disabled)native.refreshSpeechVoices?.(true);});
    this.$("tts-preview").addEventListener("click",()=>{
      if(this.$("tts-preview").disabled)return;
      this.syncContext();native.readSpeechOutput?.(this.context,t("tts_sample"),true);
    });
    for(const id of ["tts-stop","tts-stop-settings"])this.$(id).addEventListener("click",()=>native.stopSpeechOutput?.());
    this.$("tts-read-latest").addEventListener("click",()=>{this.syncContext();if(this.latest)native.readSpeechOutput?.(this.context,this.latest,false);});
    for(const [id,action] of [["tts-key-edit","edit"],["tts-key-remove","remove"]])this.$(id).addEventListener("click",()=>{
      if(!this.$(id).disabled)native.speechKeyAction?.(this.environment().speechOutput?.provider,action,bibimerVoiceLabels(t));
    });
  }
  syncContext(){
    const now=this.current(),context=now.context;
    if(context!==this.context){this.context=context;this.native.setSpeechContext?.(context);}
    if(now.completionKey!==this.latestContext){this.latest="";this.latestContext=now.completionKey;}
    const state=this.environment().speechOutput||{};
    this.$("tts-playback").hidden=!now.eligible||!state.enabled;
    this.$("tts-read-latest").disabled=!this.latest;
    this.$("tts-stop").disabled=!state.reading;
    this.$("tts-work-status").textContent=state.status?this.t(state.status):"";
  }
  static answer(items,turn){
    const candidates=[...items].filter(row=>row.kind==="assistant"&&row.status==="completed"&&typeof row.text==="string"&&row.id.startsWith(turn+":"));
    const final=candidates.filter(row=>row.phase==="final_answer");
    if(final.length)return final.map(row=>row.text).join("\n\n");
    return candidates.filter(row=>!row.phase).at(-1)?.text||"";
  }
  observe(event,items,initial){
    this.syncContext();
    const now=this.current();
    if(event.session?.mode!=="chat")return;
    const answers=[...items];let speak="";
    for(const row of event.items||[]){
      if(row.kind!=="turn"||!row.id?.startsWith("turn-"))continue;
      const id=now.completionKey+"/"+row.id;
      if(this.seen.has(id))continue;
      this.seen.add(id);if(this.seen.size>2048)this.seen.delete(this.seen.values().next().value);
      if(row.status!=="completed")continue;
      const text=BibimerSpeechOutput.answer(answers,row.id.slice(5));
      if(text)this.latest=text;
      if(initial||event.gap||!now.eligible||!text||!this.environment().speechOutput?.enabled)continue;
      speak=text;
    }
    if(speak)try{this.native.readSpeechOutput?.(this.context,speak,false);}catch(_){this.status="tts_failed";}
    this.syncContext();
  }
  changed(status){this.status=status;this.render();this.sync();}
  options(select,rows,value){
    const signature=JSON.stringify(rows);
    if(select.dataset.signature!==signature){
      select.replaceChildren(...rows.map(row=>{const option=document.createElement("option");option.value=row.id;option.textContent=row.label;option.disabled=!!row.disabled;option.dataset.description=row.description||"";return option;}));select.dataset.signature=signature;
    }
    select.value=value;
  }
  render(){
    const env=this.environment(),s=env.speechOutput||{},supported=!!this.native.configureSpeechOutput&&!env.demo;
    this.$("tts-preference").hidden=!supported;if(!supported)return;
    this.$("tts-enabled").checked=!!s.enabled;
    this.$("tts-settings").disabled=!s.enabled;
    for(const id of ["tts-provider","tts-mode"])this.$(id).disabled=!s.enabled;
    this.$("tts-provider").value=s.provider||"android";this.$("tts-mode").value=s.mode||"full";
    this.$("tts-engine-row").hidden=s.provider!=="android";
    const engineRows=[{id:"",label:this.t("voice_device")},...(s.engines||[])];
    if(s.engine&&!engineRows.some(r=>r.id===s.engine))engineRows.push({id:s.engine,label:this.t("tts_missing"),disabled:true});
    this.options(this.$("tts-engine"),engineRows,s.engine||"");
    const voiceRows=s.provider==="android"?[{id:"",label:this.t("voice_device")},...(s.voices||[]).map(r=>({...r,description:this.t(r.network?"tts_network":"tts_offline")}))]:
      [{id:"",label:this.t("tts_choose_voice"),disabled:true},...(s.voices||[])];
    if(s.voice&&!voiceRows.some(r=>r.id===s.voice))voiceRows.push({id:s.voice,label:s.voicesLoaded?this.t("tts_missing"):s.voice,disabled:!!s.voicesLoaded,description:s.voicesLoaded?"":this.t("tts_refresh")});
    this.options(this.$("tts-voice"),voiceRows,s.voice||"");
    const external=s.provider==="elevenlabs",hasKey=!!s[s.provider+"Key"];
    this.$("tts-api-controls").hidden=!external;
    this.$("tts-key-state").textContent=this.t(hasKey?"voice_key_saved":"voice_key_required");
    this.$("tts-key-remove").disabled=!s.enabled||!hasKey||s.busy||s.reading;
    this.$("tts-key-edit").disabled=!s.enabled||!!s.busy||!!s.reading;
    this.$("tts-more").hidden=s.provider!=="elevenlabs"||!s.more;
    this.$("tts-provider-hint").textContent=this.t(external?"tts_external_hint":"tts_android_hint");
    this.$("tts-status").textContent=this.status?this.t(this.status):s.status?this.t(s.status):"";
    for(const id of ["tts-refresh","tts-more","tts-engine","tts-voice"])this.$(id).disabled=!s.enabled||!!s.busy||!!s.reading;
    this.$("tts-preview").disabled=!s.enabled||!!s.busy||!!s.reading||(external&&(!hasKey||!s.voice));
    this.$("tts-stop-settings").disabled=!s.enabled||!s.reading;
    this.syncContext();
  }
}
