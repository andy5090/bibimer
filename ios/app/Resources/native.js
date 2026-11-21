"use strict";
(() => {
  const defaults = window.__bibimerEnvironment;
  const message = (action, values = {}) => window.webkit.messageHandlers.bibimer.postMessage({action, ...values});
  const reconnect = () => { window.BibimerIOSReconnectRequested?.(); message("reconnect"); };
  const clipboardRequests = new Map();
  const clipboardDocument = Array.from(crypto.getRandomValues(new Uint8Array(16)),byte=>byte.toString(16).padStart(2,"0")).join("");
  let clipboardSequence = 0;
  const accountRequests = new Map();
  const codeWatchRequests = new Map();
  window.BibimerAccountProgress = id => accountRequests.get(id)?.progress?.();
  const browserRequests = new Map();
  const reviewRequests = new Map();
  window.BibimerReviewReply = (id, accepted) => {
    const request=reviewRequests.get(id);if(!request)return false;
    const current=!request.guard || request.guard();
    reviewRequests.delete(id);clearTimeout(request.timer);request.resolve(accepted===true && current);
    return accepted===true && current;
  };
  window.BibimerAccountBrowserReply = (id, reason) => {
    const request = browserRequests.get(id); if (!request) return;
    browserRequests.delete(id); clearTimeout(request.timer);
    if (reason === 0) request.resolve();
    else request.reject({key:"error_agent_connection",browserReason:reason});
  };
  window.BibimerAccountReply = (id, response) => {
    const request = accountRequests.get(id);
    if (!request) return;
    accountRequests.delete(id); clearTimeout(request.timer);
    if(request.job&&codeWatchRequests.get(request.job)===id)codeWatchRequests.delete(request.job);
    if (response?.ok) request.resolve(response.data);
    else request.reject({key:response?.data?.code || "error_agent_connection",status:response?.status});
  };
  window.BibimerClipboardReply = (id, response) => {
    const request = clipboardRequests.get(id);
    if (!request) return;
    clipboardRequests.delete(id); clearTimeout(request.timer);
    if (response?.ok && typeof response.text === "string") request.resolve(response.text);
    else request.reject(new Error(response?.code || "clipboard_failed"));
  };
  window.addEventListener("pagehide", () => {
    for(const request of reviewRequests.values()){clearTimeout(request.timer);request.resolve(false);}reviewRequests.clear();
    for (const request of browserRequests.values()) {
      clearTimeout(request.timer); message("closeAccountBrowser",{job:request.job});
      request.reject({key:"error_connection_failed"});
    }
    browserRequests.clear();
    for (const [id, request] of accountRequests) {
      clearTimeout(request.timer); message("cancelAccountSecret",{id});
      request.reject({key:"error_connection_failed"});
    }
    accountRequests.clear();
    codeWatchRequests.clear();
    for (const request of clipboardRequests.values()) { clearTimeout(request.timer); request.reject(new Error("clipboard_changed")); }
    clipboardRequests.clear();
  });
  let pendingVoice = null, activeVoice = null, speechGeneration = 0, speechContext = "";
  const permitVoice = (purpose, provider, scope, guard) => {
    const recipient = provider === "openai" ? "OpenAI" : provider === "elevenlabs" ? "ElevenLabs" : "Apple";
    return window.BibimerDataConsent?.ensure({purpose,recipient,scope,guard}) || Promise.resolve(false);
  };
  const readSpeech = async (context,text,messageID,mode) => {
    const generation=++speechGeneration,provider=defaults.speechOutput?.provider || "android";
    if(provider === "elevenlabs" && !await permitVoice("voiceOutput",provider,provider,()=>generation===speechGeneration && context===speechContext))return;
    if(generation!==speechGeneration || context!==speechContext)return;
    message("speechRead",{context,text:window.BibimerSpeechText(text,mode),messageID});
  };
  const store = (key, value) => { defaults[key] = value; message("preference", {key, value}); return true; };
  window.Bibimer = Object.freeze({
    accountLoginWithoutProject: true,
    enterReviewDemo: (code,guard) => new Promise(resolve => {
      if(!defaults.reviewAccessConfigured || typeof code!=="string" || !code || code.length>128 || reviewRequests.size){resolve(false);return;}
      const id=clipboardDocument+":"+(++clipboardSequence);
      const timer=setTimeout(()=>{reviewRequests.delete(id);resolve(false);},5000);
      reviewRequests.set(id,{resolve,timer,guard});
      try{message("reviewEnter",{id,code});}catch(_){reviewRequests.delete(id);clearTimeout(timer);resolve(false);}
    }),
    cancelReviewEntry: () => {for(const request of reviewRequests.values()){clearTimeout(request.timer);request.resolve(false);}reviewRequests.clear();},
    watchAccountCode: (body, url, progress) => new Promise((resolve,reject) => {
      const id=clipboardDocument+":"+(++clipboardSequence),job=body.id;
      const timer=setTimeout(()=>{accountRequests.delete(id);codeWatchRequests.delete(job);message("cancelAccountSecret",{id});resolve({cancelled:true});},600000);
      accountRequests.set(id,{resolve,reject,timer,job,progress});codeWatchRequests.set(job,id);
      try{message("accountCodeWatch",{id,body,url});}
      catch(_){clearTimeout(timer);accountRequests.delete(id);codeWatchRequests.delete(job);reject({key:"error_agent_connection"});}
    }),
    cancelAccountCodeWatch: job => {
      const id=codeWatchRequests.get(job),request=accountRequests.get(id);if(!request)return;
      clearTimeout(request.timer);codeWatchRequests.delete(job);accountRequests.delete(id);
      message("cancelAccountSecret",{id});request.resolve({cancelled:true});
    },
    requestAccountSecret: (body, labels) => new Promise((resolve,reject) => {
      window.BibimerDataConsent?.invalidate();
      const id = clipboardDocument + ":" + (++clipboardSequence);
      const timer = setTimeout(() => {
        accountRequests.delete(id); message("cancelAccountSecret",{id});
        reject({key:"error_timeout"});
      },180000);
      accountRequests.set(id,{resolve,reject,timer});
      try { message("accountSecret",{id,body,labels}); }
      catch (_) { clearTimeout(timer); accountRequests.delete(id); reject({key:"error_agent_connection"}); }
    }),
    environment: () => JSON.stringify(defaults),
    setDebugMode: enabled => { if(typeof enabled !== "boolean")return false;defaults.debugMode=enabled;message("debugMode",{enabled});return true; },
    requestDebugDiagnostics: id => message("debugDiagnosticsRead",{id}),
    clearDebugDiagnostics: () => message("debugDiagnosticsClear"),
    copyDebugDiagnostics: () => message("debugDiagnosticsCopy"),
    recordDebugEvent: event => { if(["ui_error","ui_rejection"].includes(event))message("debugEvent",{event}); },
    request: (id, method, path, body) => message("request", {id, method, path, body}),
    setLanguage: value => {
      if (!["system","en","ko","pt-BR","es","id","zh-Hans","ja","zh-Hant","fr","de"].includes(value)) return false;
      defaults.language = value === "system" ? defaults.systemLanguage : value;
      return store("languagePreference", value);
    },
    setEnterBehavior: value => ["send", "newline"].includes(value) && store("enterBehavior", value),
    setResponseDelivery: value => ["queue", "steer"].includes(value) && store("responseDelivery", value),
    setContextDisplay: value => ["used", "remaining"].includes(value) && store("contextDisplay", value),
    setScreenBehavior: (key, value) => {
      if (!["keepAwake", "deferHomeGesture"].includes(key) || typeof value !== "boolean") return false;
      defaults.screenBehavior = {...defaults.screenBehavior, [key]:value};
      message("screenPreference", {key, value}); return true;
    },
    setBackgroundWork: enabled => {
      if (typeof enabled !== "boolean") return false;
      defaults.backgroundWork = {...defaults.backgroundWork, enabled};
      message("backgroundConfigure", {enabled}); return true;
    },
    setProjectLocation: (parent, folder) => {
      if (![parent, folder].every(path => typeof path === "string" && path.startsWith("/") && !/[\x00-\x1f]/.test(path))) return false;
      store("lastProjectParent", parent); return store("lastProjectFolder", folder);
    },
    setAgentOptions: (agent, value) => {
      if (!["codex","claude","opencode","gemini","shell"].includes(agent)) return false;
      try { defaults.agentOptions[agent] = JSON.parse(value); return store("agentOptions", defaults.agentOptions); } catch (_) { return false; }
    },
    copyText: text => message("copy", {text}),
    readClipboard: () => new Promise((resolve,reject) => {
      const id = clipboardDocument + ":" + (++clipboardSequence);
      const timer = setTimeout(() => { clipboardRequests.delete(id); reject(new Error("clipboard_failed")); },15000);
      clipboardRequests.set(id,{resolve,reject,timer});
      try { message("readClipboard",{id}); }
      catch (_) { clearTimeout(timer); clipboardRequests.delete(id); reject(new Error("clipboard_failed")); }
    }),
    openBrowserWindow: tag => message("browserWindow",{tag}),
    openAccountLink: (url, job) => new Promise((resolve,reject) => {
      const id = clipboardDocument + ":" + (++clipboardSequence);
      const timer = setTimeout(() => {
        browserRequests.delete(id);message("cancelAccountBrowserOpening",{job});
        reject({key:"error_timeout"});
      },5000);
      browserRequests.set(id,{job,resolve,reject,timer});
      try { message("accountBrowser",{id,url,job}); }
      catch (_) { clearTimeout(timer);browserRequests.delete(id);reject({key:"error_agent_connection"}); }
    }),
    closeAccountLink: job => message("closeAccountBrowser",{job}),
    cancelAccountLinkOpening: job => message("cancelAccountBrowserOpening",{job}),
    openLink: url => message("link", {url}),
    openGuide: guide => message("guide", {guide}),
    openTermux: () => window.BibimerOpenLocalTerminal?.(),
    startAgentAction: (agent, action) => window.BibimerIOSAgentAction?.(agent, action),
    reconnect,
    copyConnectionDiagnostics: () => message("connectionDiagnostics"),
    startQuickSetup: reconnect,
    takeNotificationTarget: () => { const target=defaults.notificationTarget || {};defaults.notificationTarget={};message("notificationTaken");return JSON.stringify(target); },
    setResponseNotifications: enabled => { if(typeof enabled!=="boolean")return false; defaults.notifications={...defaults.notifications,enabled};message("notificationConfigure",{enabled});return true; },
    openNotificationSettings: () => message("notificationSettings"),
    startVoiceInput: (id, labels) => {
      const provider=defaults.voiceInput?.provider || "device";
      pendingVoice=id;
      void permitVoice(provider === "device" ? "voiceDevice" : "voiceInput",provider,provider,()=>pendingVoice===id && (defaults.voiceInput?.provider || "device")===provider).then(allowed=>{
        if(pendingVoice!==id)return;
        pendingVoice=null;
        if(allowed){activeVoice=id;message("voiceStart",{id,labels});}
        else window.BibimerVoiceResult?.(id,"cancelled","");
      });
    },
    revokeDataSharing: () => {
      const id=pendingVoice || activeVoice;pendingVoice=null;activeVoice=null;++speechGeneration;
      if(id){message("voiceCancel",{id});window.BibimerVoiceResult?.(id,"cancelled","");}
      message("speechStop");
    },
    cancelVoiceInput: id => { if(activeVoice===id)activeVoice=null;if(pendingVoice===id){pendingVoice=null;window.BibimerDataConsent?.cancel();window.BibimerVoiceResult?.(id,"cancelled","");}message("voiceCancel",{id}); },
    configureVoiceInput: (provider, language) => {
      if(!["device","openai","elevenlabs"].includes(provider) || !["","en","ko","pt","es","id","zh","ja","fr","de"].includes(language))return false;
      if(defaults.voiceInput?.provider!==provider)window.BibimerDataConsent?.invalidate();
      defaults.voiceInput={...defaults.voiceInput,provider,language};message("voiceConfigure",{provider,language});return true;
    },
    voiceKeyAction: (provider, operation, labels) => { if(operation!=="check")window.BibimerDataConsent?.invalidate();message("voiceKey",{purpose:"input",provider,operation,labels}); },
    speechKeyAction: (provider, operation, labels) => { window.BibimerDataConsent?.invalidate();message("voiceKey",{purpose:"output",provider,operation,labels}); },
    configureSpeechOutput: value => {
      let settings;try {settings=JSON.parse(value);}catch(_){return false;}
      if(!settings || typeof settings!=="object" || Array.isArray(settings))return false;
      for(const [key,value] of Object.entries(settings)){
        if(key==="enabled" && typeof value==="boolean")continue;
        if(key==="provider" && ["android","elevenlabs"].includes(value))continue;
        if(key==="mode" && ["full","summary"].includes(value))continue;
        if(key==="voice" && typeof value==="string" && value.length<=256)continue;
        if(key==="engine" && value==="")continue;return false;
      }
      ++speechGeneration;if(settings.provider && settings.provider!==defaults.speechOutput?.provider)window.BibimerDataConsent?.invalidate();
      defaults.speechOutput={...defaults.speechOutput,...settings};message("speechConfigure",{settings});return true;
    },
    setSpeechContext: context => { if(speechContext!==context){++speechGeneration;window.BibimerDataConsent?.cancel();}speechContext=context;message("speechContext",{context}); },
    readSpeechMessage: (context,text,messageID) => { void readSpeech(context,text,messageID,defaults.speechOutput?.mode); },
    readSpeechOutput: (context,text) => { void readSpeech(context,text,"","full"); },
    stopSpeechOutput: () => { ++speechGeneration;window.BibimerDataConsent?.cancel();message("speechStop"); },
    refreshSpeechVoices: more => message("speechVoices",{more:more===true}),
    saveNormalDraftViews: value => { try { sessionStorage.setItem("bibimerDrafts", value); return true; } catch (_) { return false; } },
    takeNormalDraftViews: () => sessionStorage.getItem("bibimerDrafts") || "{}",
    cancelPoll: () => message("cancelPoll"),
    setBackHandling: () => {},
    notificationsConnected: supported => message("notificationConnected",{supported:supported===true}),
    checkAppUpdate: () => {},
    dismissAppUpdate: () => {},
    bridgeMaintenanceStatus: () => JSON.stringify({phase:"unsupported"})
  });
  window.addEventListener("error", event => message("javascriptError", {message:String(event.message).slice(0,500)}));
  window.addEventListener("unhandledrejection", event => message("javascriptError", {message:String(event.reason?.message || event.reason).slice(0,500)}));
})();
