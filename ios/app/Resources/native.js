"use strict";
(() => {
  const defaults = window.__bibimerEnvironment;
  const message = (action, values = {}) => window.webkit.messageHandlers.bibimer.postMessage({action, ...values});
  const clipboardRequests = new Map();
  const clipboardDocument = Array.from(crypto.getRandomValues(new Uint8Array(16)),byte=>byte.toString(16).padStart(2,"0")).join("");
  let clipboardSequence = 0;
  window.BibimerClipboardReply = (id, response) => {
    const request = clipboardRequests.get(id);
    if (!request) return;
    clipboardRequests.delete(id); clearTimeout(request.timer);
    if (response?.ok && typeof response.text === "string") request.resolve(response.text);
    else request.reject(new Error(response?.code || "clipboard_failed"));
  };
  window.addEventListener("pagehide", () => {
    for (const request of clipboardRequests.values()) { clearTimeout(request.timer); request.reject(new Error("clipboard_changed")); }
    clipboardRequests.clear();
  });
  const store = (key, value) => { defaults[key] = value; message("preference", {key, value}); return true; };
  window.Bibimer = Object.freeze({
    environment: () => JSON.stringify(defaults),
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
    openLink: url => message("link", {url}),
    openGuide: guide => message("guide", {guide}),
    openTermux: () => window.BibimerOpenLocalTerminal?.(),
    startAgentAction: (agent, action) => window.BibimerIOSAgentAction?.(agent, action),
    reconnect: () => message("reconnect"),
    startQuickSetup: () => message("reconnect"),
    takeNotificationTarget: () => { const target=defaults.notificationTarget || {};defaults.notificationTarget={};message("notificationTaken");return JSON.stringify(target); },
    setResponseNotifications: enabled => { if(typeof enabled!=="boolean")return false; defaults.notifications={...defaults.notifications,enabled};message("notificationConfigure",{enabled});return true; },
    openNotificationSettings: () => message("notificationSettings"),
    startVoiceInput: (id, labels) => message("voiceStart",{id,labels}),
    cancelVoiceInput: id => message("voiceCancel",{id}),
    configureVoiceInput: (provider, language) => {
      if(!["device","openai","elevenlabs"].includes(provider) || !["","en","ko","pt","es","id","zh","ja","fr","de"].includes(language))return false;
      defaults.voiceInput={...defaults.voiceInput,provider,language};message("voiceConfigure",{provider,language});return true;
    },
    voiceKeyAction: (provider, operation, labels) => message("voiceKey",{purpose:"input",provider,operation,labels}),
    speechKeyAction: (provider, operation, labels) => message("voiceKey",{purpose:"output",provider,operation,labels}),
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
      defaults.speechOutput={...defaults.speechOutput,...settings};message("speechConfigure",{settings});return true;
    },
    setSpeechContext: context => message("speechContext",{context}),
    readSpeechMessage: (context,text,messageID) => message("speechRead",{context,text:window.BibimerSpeechText(text,defaults.speechOutput?.mode),messageID}),
    readSpeechOutput: (context,text) => message("speechRead",{context,text:window.BibimerSpeechText(text,"full"),messageID:""}),
    stopSpeechOutput: () => message("speechStop"),
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
