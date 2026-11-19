"use strict";
// This document has only an exit-only native handler. All examples stay here.
(() => {
  const env=window.__bibimerEnvironment;
  let workspace=null,alive=true,epoch=0,clipboard="";
  const timers=new Map(), blocked=()=>false;
  const local=()=>workspace ||= new window.BibimerReviewWorkspace(window.BibimerReviewSamples.samples,env.language);
  function dispose(){alive=false;++epoch;for(const timer of timers.keys())clearTimeout(timer);timers.clear();workspace=null;clipboard="";}
  window.BibimerReviewDispose=dispose;window.addEventListener("pagehide",dispose);
  const store=(key,value)=>{env[key]=value;return true;};
  const request=(identifier,method,path,body)=>{
    const revision=epoch;let data,response;
    try{data=JSON.parse(body);response={ok:true,status:200,data:local().request(method,path,data)};}
    catch(error){response={ok:false,status:400,data:{code:error.key||"error_demo_request"}};}
    const timer=setTimeout(()=>{timers.delete(timer);if(alive&&revision===epoch)window.BibimerNativeReply?.(identifier,response);},path.includes("wait=20")?250:0);timers.set(timer,{identifier,poll:method==="GET"&&path.includes("/events?")});
  };
  window.Bibimer=Object.freeze({
    environment:()=>JSON.stringify(env),request,
    setDemoMode:enabled=>{if(enabled!==false||!alive)return;dispose();window.webkit.messageHandlers.bibimerReview.postMessage({action:"exitReview"});},
    setLanguage:value=>{if(!["system","en","ko","pt-BR","es","id","zh-Hans","ja","zh-Hant","fr","de"].includes(value))return false;env.language=value==="system"?env.systemLanguage:value;if(workspace)workspace.language=env.language;return store("languagePreference",value);},
    setEnterBehavior:value=>["send","newline"].includes(value)&&store("enterBehavior",value),
    setResponseDelivery:value=>["queue","steer"].includes(value)&&store("responseDelivery",value),
    setContextDisplay:value=>["used","remaining"].includes(value)&&store("contextDisplay",value),
    setAgentOptions:(agent,value)=>{if(!["shell","codex","claude","opencode"].includes(agent))return false;try{env.agentOptions[agent]=JSON.parse(value);return true;}catch(_){return false;}},
    copyText:text=>{clipboard=String(text);},readClipboard:()=>Promise.resolve(clipboard),
    saveNormalDraftViews:blocked,takeNormalDraftViews:()=>"{}",setProjectLocation:blocked,
    setBackHandling(){},cancelPoll:()=>{
      for(const [timer,request] of timers)if(request.poll){
        clearTimeout(timer);timers.delete(timer);
        // Settle the old document's await so shared activePoll/finally can
        // start the newly selected sample session. Never deliver stale data.
        if(alive)window.BibimerNativeReply?.(request.identifier,{ok:false,status:409,data:{code:"error_connection_failed"}});
      }
    },
    setDebugMode:enabled=>typeof enabled==="boolean"&&store("debugMode",enabled),recordDebugEvent(){},requestDebugDiagnostics(){},clearDebugDiagnostics(){},copyDebugDiagnostics(){},
    setSpeechContext(){},stopSpeechOutput(){},readSpeechMessage:blocked,readSpeechOutput:blocked,refreshSpeechVoices(){},
    startVoiceInput:(identifier)=>window.BibimerVoiceResult?.(identifier,"cancelled",""),cancelVoiceInput(){},configureVoiceInput:blocked,configureSpeechOutput:blocked,voiceKeyAction:blocked,speechKeyAction:blocked,
    openLink:blocked,openGuide:blocked,openTermux:blocked,openBrowserWindow:blocked,openAccountLink:()=>Promise.reject({key:"demo_disabled"}),closeAccountLink(){},cancelAccountLinkOpening(){},requestAccountSecret:()=>Promise.reject({key:"demo_disabled"}),watchAccountCode:()=>Promise.reject({key:"demo_disabled"}),cancelAccountCodeWatch(){},
    setBackgroundWork:blocked,setScreenBehavior:blocked,setResponseNotifications:blocked,openNotificationSettings:blocked,notificationsConnected(){},takeNotificationTarget:()=>"{}",
    startAgentAction:blocked,reconnect:()=>window.BibimerResume?.(),startQuickSetup:blocked,copyConnectionDiagnostics:blocked,checkAppUpdate(){},dismissAppUpdate(){},bridgeMaintenanceStatus:()=>JSON.stringify({phase:"unsupported"})
  });
  document.addEventListener("DOMContentLoaded",()=>{
    for(const id of ["ios-screen-settings","ios-background-settings","ios-data-settings","ios-connection-diagnostics"]) {const node=document.getElementById(id);if(node)node.hidden=true;}
  });
})();
