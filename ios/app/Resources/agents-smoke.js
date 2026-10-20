"use strict";
(async () => {
  const checks = [], results = [];
  const $ = id => document.getElementById(id);
  const snapshot = () => window.BibimerIOSSnapshot?.();
  const pause = ms => new Promise(resolve => setTimeout(resolve,ms));
  const progress = stage => window.webkit.messageHandlers.bibimer.postMessage({action:"smokeProgress",progress:{stage,checks:checks.length}});
  async function wait(test,label,timeout = 30000) {
    const end = Date.now() + timeout;
    while (Date.now() < end) { const result = test(); if (result) return result; await pause(250); }
    throw new Error(label + " timed out; notice=" + $("notice")?.textContent);
  }
  async function action(agent,action,timeout) {
    const previous = snapshot()?.session?.id;
    $("tab-setup").click(); $(agent + "-install").open = true;
    const button = document.querySelector(`[data-agent="${agent}"][data-agent-action="${action}"]`);
    await wait(() => button && !button.disabled,agent + " action ready");
    progress(agent + ":" + action); button.click();
    await wait(() => snapshot()?.session?.id !== previous && snapshot()?.session?.setup_action?.agent === agent && snapshot().session.setup_action.action === action,agent + " setup session");
    const sessionId = snapshot().session.id;
    await wait(() => snapshot()?.session?.id === sessionId && snapshot().session.state === "exited",agent + " " + action,timeout);
    const current = snapshot();
    if (current.session.exit_code !== 0) throw new Error(agent + " " + action + " exit " + current.session.exit_code + ": " + current.terminal.slice(-3000));
    await wait(() => (snapshot().terminal || "").trim().length > 0,agent + " output");
    return {sessionId,output:snapshot().terminal.slice(-18000),exitCode:current.session.exit_code};
  }
  try {
    await wait(() => snapshot()?.online,"local bridge",60000);
    checks.push({name:"agents_shared_ui_connected",ok:true});
    for (const agent of ["codex","claude","opencode","gemini"]) {
      try {
        const installed = await action(agent,"install",900000);
        if (agent === "opencode") {
          const proof = installed.output.replace(/\s+/g,"");
          const compatibility = {compatibilityPatch:"ios-shell-output-drain-v1",sourceSha256:"37c7de554c2ba7bf456e4fe6faf7705141b0ccb3a7b1dd6e1046d52cd8269ecd",patchedSha256:"04023b8024bdab3cde5c84ca509c7a9ec9492b7a308175740449fd62e6e438d6",size:195014520,alreadyPatched:false};
          for (const [key,value] of Object.entries(compatibility)) if (!proof.includes(JSON.stringify(key) + ":" + JSON.stringify(value))) throw new Error("OpenCode fixed-build patch receipt missing: " + key);
          installed.compatibility = compatibility;
        }
        await wait(() => snapshot()?.knownAgents?.some(row=>row.id === agent && row.installed && row.available !== false),agent + " installed UI catalog");
        checks.push({name:agent + "_install_ui",ok:true});
        const version = await action(agent,"version",120000);
        if (!/\d+\.\d+\.\d+/.test(version.output)) throw new Error(agent + " version did not contain a semantic version");
        checks.push({name:agent + "_version_ui",ok:true});
        results.push({agent,install:installed,version});
      } catch (error) {
        results.push({agent,error:String(error.message || error),terminal:(snapshot()?.terminal || "").slice(-18000)});
        checks.push({name:agent + "_failed",ok:false});
        const current = snapshot()?.session;
        if (current?.setup_action?.agent === agent && current.state === "running") {
          await window.BibimerIOSTestAPI("POST",`/v1/sessions/${current.id}/stop`,{});
          await wait(() => snapshot()?.session?.state === "exited",agent + " timed-out installer cleanup",15000);
        }
      }
    }
    const health = await window.BibimerIOSTestAPI("GET","/v1/health");
    const agents = health.agents.filter(agent=>agent.id !== "shell");
    const available = ["codex","claude","opencode","gemini"].every(id=>agents.some(agent=>agent.id===id && agent.installed && agent.available !== false));
    checks.push({name:"four_agents_available",ok:available,agents});
    progress("completed");
    window.webkit.messageHandlers.bibimer.postMessage({action:"smokeResult",result:{ok:checks.every(check=>check.ok),checks,results}});
  } catch (error) {
    window.webkit.messageHandlers.bibimer.postMessage({action:"smokeResult",result:{ok:false,checks,results,error:String(error.message || error)}});
  }
})();
