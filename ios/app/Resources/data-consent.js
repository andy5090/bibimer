"use strict";
(() => {
  // Grants are confined to this app document and the exact recipient/use/account
  // revision. They are deliberately not reused after an app/document restart:
  // third-party CLIs may change accounts outside Bibimer's account manager.
  const grants = new Set();
  let revision = 0, pending = null, configuredContext = () => "", dialog, previousFocus;
  const text = key => (window.BibimerIOSDataLocales?.[window.BibimerI18n?.language?.()] || window.BibimerIOSDataLocales?.en || {})[key] || key;
  const finish = accepted => {
    if (!pending) return;
    const request = pending; pending = null;
    const valid = request.revision === revision && request.context === configuredContext() && (!request.guard || request.guard());
    if (accepted && valid && request.remember) grants.add(request.key);
    if (dialog?.open) dialog.close();
    previousFocus?.focus?.({preventScroll:true});
    request.resolve(!!accepted && valid);
  };
  function setup() {
    dialog = document.getElementById("ios-data-consent");
    if (!dialog || dialog.dataset.ready) return;
    dialog.dataset.ready = "true";
    document.getElementById("ios-data-allow").addEventListener("click", () => finish(true));
    document.getElementById("ios-data-cancel").addEventListener("click", () => finish(false));
    dialog.addEventListener("cancel", event => { event.preventDefault(); finish(false); });
    dialog.addEventListener("close", () => { if (!dialog.open) finish(false); });
    document.getElementById("ios-data-revoke").addEventListener("click", () => {
      invalidate(); window.Bibimer?.revokeDataSharing?.(); document.getElementById("ios-data-revoke-status").textContent = text("revoked");
    });
    document.getElementById("ios-legal-open").addEventListener("click", () => document.getElementById("ios-legal").showModal());
    document.getElementById("ios-legal-close").addEventListener("click", () => document.getElementById("ios-legal").close());
    document.getElementById("ios-bibimer-license").textContent = window.BibimerRuntimeNotices?.["BIBIMER-LICENSE.md"] || "";
    document.getElementById("ios-bibimer-exception").textContent = window.BibimerRuntimeNotices?.["BIBIMER-LICENSE.IOS"] || "";
    document.getElementById("ios-runtime-license").textContent = window.BibimerRuntimeNotices?.["LICENSE.md"] || "";
    document.getElementById("ios-runtime-exception").textContent = window.BibimerRuntimeNotices?.["LICENSE.IOS"] || "";
    document.getElementById("ios-runtime-gpl").textContent = window.BibimerRuntimeNotices?.["GPL-3.0"] || "";
    document.getElementById("ios-runtime-gpl2").textContent = window.BibimerRuntimeNotices?.["GPL-2.0"] || "";
    const alpine = document.getElementById("ios-alpine-notices");
    for (const component of window.BibimerAlpineNotices?.components || []) {
      const details = document.createElement("details"), summary = document.createElement("summary"), notice = document.createElement("pre");
      summary.textContent = component.name + " · " + component.license;
      notice.textContent = component.notice;
      details.append(summary, notice);
      for (const limitation of component.limitations || []) {
        const paragraph = document.createElement("p"); paragraph.textContent = limitation; details.append(paragraph);
      }
      alpine.append(details);
    }
    for (const limitation of window.BibimerAlpineNotices?.limitations || []) {
      const paragraph = document.createElement("p"); paragraph.textContent = limitation; alpine.append(paragraph);
    }
    for (const link of document.querySelectorAll("#ios-legal a")) link.addEventListener("click", event => { event.preventDefault();window.Bibimer?.openLink?.(link.href); });
    apply();
  }
  function apply() { for (const node of document.querySelectorAll("[data-ios-data]")) node.textContent = text(node.dataset.iosData); }
  function invalidate() { ++revision; grants.clear(); finish(false); }
  function ensure({purpose,recipient,scope="",guard,remember=true}) {
    setup();
    if (!dialog || typeof recipient !== "string" || !recipient || (guard && !guard())) return Promise.resolve(false);
    const key = JSON.stringify([revision,purpose,recipient,scope]);
    if (grants.has(key)) return Promise.resolve(true);
    // Never let a concurrent/background operation replace a visible question.
    if (pending) return Promise.resolve(false);
    return new Promise(resolve => {
      previousFocus = document.activeElement;
      pending = {key,resolve,revision,context:configuredContext(),guard,remember,purpose};
      document.getElementById("ios-data-recipient").textContent = recipient;
      document.getElementById("ios-data-description").textContent = text(purpose);
      document.getElementById("ios-data-purpose").textContent = text("purpose");
      apply(); dialog.showModal(); document.getElementById("ios-data-cancel").focus();
    });
  }
  window.BibimerDataConsent = Object.freeze({ensure,invalidate,cancel:()=>finish(false),apply,
    configure: context => { configuredContext=context;setup(); },
    invalidateChat: () => { for(const key of grants)if(JSON.parse(key)[1]==="chat")grants.delete(key); if(pending?.purpose==="chat")finish(false); },
    recipient: (agent,model="") => {
      if (agent === "shell") return text("terminalRecipient");
      const configured = typeof model === "string" && /^[a-z0-9_.-]{1,80}\//i.test(model) ? model.split("/")[0] : "";
      const names={openai:"OpenAI",anthropic:"Anthropic",google:"Google",google_vertex:"Google Cloud",bedrock:"Amazon Bedrock",azure:"Microsoft Azure"};
      const provider=configured ? (names[configured] || configured) : ({codex:"OpenAI",claude:"Anthropic",gemini:"Google"}[agent]);
      return provider ? text("defaultRecipient").replace("{provider}",provider).replace("{agent}",agent) : text("configuredRecipient");
    }
  });
  window.addEventListener("pagehide", invalidate);
  document.addEventListener("visibilitychange", () => { if (document.hidden) finish(false); });
})();
