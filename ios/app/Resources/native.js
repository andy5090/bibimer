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
    openLink: url => message("link", {url}),
    openGuide: guide => message("guide", {guide}),
    openTermux: () => window.BibimerOpenLocalTerminal?.(),
    startAgentAction: (agent, action) => window.BibimerIOSAgentAction?.(agent, action),
    startQuickSetup: () => window.BibimerResume?.(),
    takeNotificationTarget: () => "{}",
    saveNormalDraftViews: value => { try { sessionStorage.setItem("bibimerDrafts", value); return true; } catch (_) { return false; } },
    takeNormalDraftViews: () => sessionStorage.getItem("bibimerDrafts") || "{}",
    cancelPoll: () => message("cancelPoll"),
    setBackHandling: () => {},
    notificationsConnected: () => {},
    checkAppUpdate: () => {},
    dismissAppUpdate: () => {},
    bridgeMaintenanceStatus: () => JSON.stringify({phase:"unsupported"})
  });
  window.addEventListener("error", event => message("javascriptError", {message:String(event.message).slice(0,500)}));
  window.addEventListener("unhandledrejection", event => message("javascriptError", {message:String(event.reason?.message || event.reason).slice(0,500)}));
})();
