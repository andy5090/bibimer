"use strict";
(async () => {
  const checks = [];
  const $ = id => document.getElementById(id);
  const pause = ms => new Promise(resolve => setTimeout(resolve,ms));
  const snapshot = () => window.BibimerIOSSnapshot?.();
  async function wait(test, label, timeout = 30000) {
    const end = Date.now() + timeout;
    while (Date.now() < end) { const value = test(); if (value) return value; await pause(100); }
    throw new Error(label + " timed out; notice=" + $("notice")?.textContent);
  }
  const passed = (name, details = {}) => checks.push({name,ok:true,...details});
  let terminalEvidence = "";
  try {
    await wait(() => snapshot()?.online,"bridge connection",60000);
    passed("shared_ui_connected");
    for (const route of ["/v1/pair?ignored=1","/v1/../v1/pair","/v1/%2e%2e/v1/pair"]) {
      let rejected = false;
      try { await window.BibimerIOSTestAPI("POST",route,{code:"00000000"}); }
      catch (error) { rejected = error.status === 400; }
      if (!rejected) throw new Error("Pairing route was not rejected by native proxy");
    }
    passed("native_proxy_route_boundary");
    const lateHealth = await window.BibimerIOSTestAPI("GET","/native/test-late-health");
    if (!lateHealth.ignoredLateHealth || !lateHealth.preservedFailure) throw new Error("Late health/navigation callbacks revived a stopped runtime");
    passed("native_late_health_preserves_failure");
    const preferences = JSON.parse(window.Bibimer.environment());
    $("tab-settings").click(); await wait(() => !$("settings").hidden,"settings page");
    $("language-trigger").click(); await wait(() => $("select-dialog").open,"custom language sheet");
    document.querySelector('#select-options [data-value="ko"]').click();
    await wait(() => document.documentElement.lang === "ko","Korean language");
    $("language").value = preferences.languagePreference; $("language").dispatchEvent(new Event("change"));
    $("enter-behavior").value = "send"; $("enter-behavior").dispatchEvent(new Event("change"));
    await wait(() => JSON.parse(window.Bibimer.environment()).enterBehavior === "send","input preference");
    $("enter-behavior").value = preferences.enterBehavior; $("enter-behavior").dispatchEvent(new Event("change"));
    $("context-display").value = "remaining"; $("context-display").dispatchEvent(new Event("change"));
    await wait(() => JSON.parse(window.Bibimer.environment()).contextDisplay === "remaining","context display preference");
    $("context-display").value = preferences.contextDisplay || "used"; $("context-display").dispatchEvent(new Event("change"));
    passed("settings_language_input_custom_sheet");
    $("tab-work").click();
    const path = "/root/projects/ios-ui-smoke-" + Date.now();
    $("path").value = path; $("create-folder").checked = true; $("project-form").requestSubmit();
    await wait(() => snapshot()?.project?.path === path,"project creation");
    passed("project_create",{path});
    await wait(() => !$("launch").disabled,"launch controls ready");
    if ($("agent").value !== "shell") { $("agent").value = "shell"; $("agent").dispatchEvent(new Event("change")); }
    $("mode").value = "terminal"; $("mode").dispatchEvent(new Event("change"));
    await wait(() => !$("launch").disabled,"terminal controls ready");
    $("launch").click();
    await wait(() => snapshot()?.session?.state === "running","terminal launch");
    const sessionId = snapshot().session.id;
    passed("pty_session_launch",{sessionId});
    await wait(() => !$("input").disabled && !$("send").disabled,"composer ready");
    $("input").value = "printf 'BIBIMER_UI_PTY_OK\\n'; printf 'Bibimer native file export\\n' > share.txt; git init -q; git -c user.name=Bibimer -c user.email=lab@example.invalid commit --allow-empty -qm initial; printf 'BIBIMER_GIT_OK\\n'";
    $("input").dispatchEvent(new Event("input"));
    $("input-form").requestSubmit();
    await wait(() => !$("input").value,"input accepted");
    await wait(() => /BIBIMER_UI_PTY_OK[\r\n]+/.test(snapshot()?.terminal || "") && /BIBIMER_GIT_OK[\r\n]+/.test(snapshot()?.terminal || ""),"PTY command output");
    terminalEvidence = snapshot().terminal;
    passed("pty_input_output");
    const health = await window.BibimerIOSTestAPI("GET","/v1/health");
    if (!["codex","claude","opencode","gemini"].every(id=>health.agents.some(agent=>agent.id===id))) throw new Error("Four agent choices are required");
    passed("agent_catalog",{agents:health.agents.map(agent=>({id:agent.id,installed:agent.installed,modes:agent.modes}))});
    $("sidebar-open").click();
    await wait(() => $("sidebar").open,"sidebar open");
    if (!$("sidebar").textContent.includes(snapshot().project.name)) throw new Error("Project missing from sidebar");
    passed("project_session_sidebar");
    $("sidebar").close();
    $("session-more").click();
    await wait(() => $("session-dialog").open,"session actions");
    $("session-name").value = "iOS verified terminal"; $("session-rename-form").requestSubmit();
    await wait(() => snapshot()?.session?.name === "iOS verified terminal" || $("session-title").textContent.includes("iOS verified terminal"),"session rename");
    passed("session_rename");
    for (const dialog of document.querySelectorAll("dialog[open]")) dialog.close();
    $("session-more").click(); await wait(() => $("session-dialog").open,"archive actions");
    $("session-archive").click();
    await wait(() => snapshot()?.session?.archived === true,"session archive");
    passed("session_archive_running");
    await wait(() => !$("session-more").disabled,"restore controls ready");
    $("session-more").click(); await wait(() => $("session-dialog").open,"restore actions");
    $("session-archive").click();
    await wait(() => snapshot()?.session?.archived === false,"session restore");
    passed("session_restore");
    for (const dialog of document.querySelectorAll("dialog[open]")) dialog.close();
    const folders = await window.BibimerIOSTestAPI("POST","/v1/folders",{path});
    if (folders.path !== path) throw new Error("Folder browser returned another workspace");
    passed("folder_browser");
    const inspected = await window.BibimerIOSTestAPI("POST","/v1/inspect",{project_id:snapshot().project.id,worktree_path:path,action:"files"});
    passed("workspace_inspector",{keys:Object.keys(inspected)});
    $("inspector-open").click(); await wait(() => $("inspector").open,"file explorer panel");
    passed("file_explorer_ui"); $("inspector-close").click();
    await window.BibimerIOSTestAPI("POST","/native/open-file",{project_id:snapshot().project.id,worktree_path:path,path:"share.txt"});
    passed("native_file_transfer_and_share");
    const share = await window.BibimerIOSTestAPI("GET","/native/share-state");
    if (!share.busy || !share.presented || !share.exists || !share.size) throw new Error("Shared native file is not retained while its sheet is open");
    let busyRejected = false;
    try { await window.BibimerIOSTestAPI("POST","/native/open-file",{project_id:snapshot().project.id,worktree_path:path,path:"missing.txt"}); }
    catch (error) { busyRejected = error.status === 409 && error.key === "error_file_busy"; }
    const retained = await window.BibimerIOSTestAPI("GET","/native/share-state");
    if (!busyRejected || !retained.busy || !retained.presented || !retained.exists || retained.size !== share.size) throw new Error("A second file request changed the active share");
    passed("native_share_reentry_preserves_file");
    window.webkit.messageHandlers.bibimer.postMessage({action:"dismissShare"}); await pause(300);
    const dismissed = await window.BibimerIOSTestAPI("GET","/native/share-state");
    if (dismissed.busy || dismissed.presented || dismissed.exists) throw new Error("Native share cleanup did not finish");
    await window.BibimerIOSTestOpenWorktree();
    await wait(() => $("worktree-create-dialog").open && !$("worktree-branch").disabled,"worktree options");
    $("worktree-branch").value = "ios-ui-verified"; $("worktree-branch").dispatchEvent(new Event("input"));
    $("worktree-agent").value = "shell"; $("worktree-agent").dispatchEvent(new Event("change"));
    $("worktree-mode").value = "terminal";
    await wait(() => !$("worktree-create-submit").disabled,"worktree submit ready");
    $("worktree-create-form").requestSubmit();
    await wait(() => snapshot()?.session?.state === "running" && snapshot().session.project.path !== path,"worktree session",60000);
    passed("worktree_create_and_session",{path:snapshot().session.project.path});
    $("session-more").click(); await wait(() => $("session-dialog").open,"stop actions");
    $("stop").click(); await wait(() => $("stop-dialog").open,"stop confirmation");
    $("confirm-stop").click();
    await wait(() => snapshot()?.session?.state === "exited","confirmed session stop");
    passed("session_stop_confirmation");
    await window.BibimerIOSTestSelectSession(sessionId);
    await wait(() => snapshot()?.session?.id === sessionId && snapshot().session.state === "running" && (snapshot().terminal || "").includes("BIBIMER_UI_PTY_OK"),"return to running original terminal");
    passed("session_switch_retains_process_output");
    window.webkit.messageHandlers.bibimer.postMessage({action:"smokeResult",result:{ok:true,checks,terminal:terminalEvidence.slice(-12000)}});
  } catch (error) {
    window.webkit.messageHandlers.bibimer.postMessage({action:"smokeResult",result:{ok:false,checks,error:String(error.message || error),snapshot:snapshot()}});
  }
})();
