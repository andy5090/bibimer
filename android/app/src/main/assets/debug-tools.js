"use strict";
window.BibimerDebugTools = class BibimerDebugTools {
  constructor(t, native, environment) {
    this.t=t;this.native=native;this.environment=environment;this.visible=false;
    const $=id=>document.getElementById(id);this.$=$;
    $("debug-mode").addEventListener("change",()=>{
      try { if(!native.setDebugMode?.($("debug-mode").checked))throw Error(); }
      catch(_){$("debug-status").textContent=t("debug_save_failed");this.render();return;}
      $("debug-status").textContent="";this.render();
    });
    $("debug-logs-open").addEventListener("click",()=>this.open());
    $("debug-logs-close").addEventListener("click",()=>$("debug-logs-dialog").close());
    $("debug-logs-dialog").addEventListener("close",()=>{this.visible=false;$("debug-logs-text").value="";});
    $("debug-logs-refresh").addEventListener("click",()=>this.refresh());
    $("debug-logs-clear").addEventListener("click",()=>{if(!this.enabled())return;native.clearDebugDiagnostics?.();$("debug-logs-text").value="";this.refresh();});
    $("debug-logs-copy").addEventListener("click",()=>{if(this.enabled())native.copyDebugDiagnostics?.();});
    window.BibimerDebugDiagnostics=(id,text)=>{if(id===this.requestId&&this.enabled()&&this.visible&&typeof text==="string"&&text.length<=65536)$("debug-logs-text").value=text;};
    window.BibimerDebugCopied=()=>{if(this.enabled()&&this.visible)$("debug-logs-status").textContent=t("copied");};
    window.BibimerDebugModeChanged=()=>this.render();
    window.addEventListener("error",()=>{if(this.enabled())native.recordDebugEvent?.("ui_error",0);});
    window.addEventListener("unhandledrejection",()=>{if(this.enabled())native.recordDebugEvent?.("ui_rejection",0);});
    window.addEventListener("pagehide",()=>this.pause());
    document.addEventListener("visibilitychange",()=>{if(document.hidden)this.pause();});
    this.render();
  }
  enabled(){return this.environment().debugMode===true;}
  render(){
    const enabled=this.enabled(),supported=!!this.native.setDebugMode;
    this.$("debug-mode").checked=enabled;this.$("debug-mode").disabled=!supported;
    this.$("debug-tools").hidden=!enabled;this.$("debug-tools").disabled=!enabled;
    document.body.classList.toggle("debug-mode",enabled);
    if(!enabled){this.pause();window.getSelection?.()?.removeAllRanges();}
  }
  open(){if(!this.enabled())return;this.visible=true;this.$("debug-logs-text").value="";this.$("debug-logs-status").textContent="";this.$("debug-logs-dialog").showModal();this.refresh();}
  refresh(){if(this.enabled()&&this.visible){this.requestId=crypto.randomUUID();this.native.requestDebugDiagnostics?.(this.requestId);}}
  pause(){this.requestId=null;this.visible=false;if(this.$("debug-logs-dialog").open)this.$("debug-logs-dialog").close();this.$("debug-logs-text").value="";}
};
