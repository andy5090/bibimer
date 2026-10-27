  // Appended inside the shared application's closure at packaging time.
  permissionModes.gemini = ["inherit"];
  if (!permissionModes.codex.includes("app-sandbox")) permissionModes.codex.push("app-sandbox");
  for (const id of ["permission","quick-permission","import-permission"]) delete $(id).dataset.agent;
  function iosPermissionIssue(agent,permission,mode) {
    if (agent !== "codex") return null;
    if (["read-only","workspace-write"].includes(permission)) return "error_ios_codex_sandbox";
    if (permission === "app-sandbox" && mode !== "chat") return "error_ios_codex_terminal_policy";
    return null;
  }
  const iosRenderModels = renderModels;
  renderModels = function(prefix = "") {
    if (!prefix && session?.setup_action) {
      for (const id of ["quick-model","quick-effort","models-refresh","models-hint"]) $(id).hidden = true;
      return;
    }
    iosRenderModels(prefix);
  };
  const iosRenderSettings = renderSettings;
  renderSettings = function(prefix = "") {
    iosRenderSettings(prefix);
    if (!prefix && session?.setup_action) { $("agent-settings").hidden = true; return; }
    const context = modelContext(prefix);
    if (context.agent !== "codex") return;
    for (const id of prefix ? [prefix + "permission"] : ["permission","quick-permission"]) {
      for (const option of $(id).options) {
        if (iosPermissionIssue("codex",option.value,context.mode)) option.disabled = true;
      }
    }
    const selected = context.chat ? session.options?.permission || "inherit" : savedOptions("codex").permission;
    const issue = iosPermissionIssue("codex",selected,context.mode);
    $(prefix + "permission-hint").textContent = t(issue || (selected === "inherit" ? "ios_codex_inherit_hint" : "permission_hint_" + selected));
    pickers.sync();
  };
  const iosRenderSession = renderSession;
  const iosTerminalTools = window.BibimerTerminalTools?.create({terminal:term,input:$("input"),native,send:text=>sendRaw(text.replace(/\r?\n/g,"\r") + "\r"),language:()=>i18n.language(),context:()=>({
    generation,instance,project:projectKey(),session:session?.id || null,tab:currentTab,
    terminal:currentTab === "work" && !!session && !isChat() && !$("workspace").classList.contains("project-editing"),
    paste:currentTab === "work" && !!session && !isChat() && !$("workspace").classList.contains("project-editing") && !$("input").disabled
  })});
  if (iosTerminalTools) {
    const iosTab = tab;
    tab = function(name) { iosTab(name); iosTerminalTools.update(); };
  }
  const iosSetupRefreshed = new Set(), iosSetupRefreshing = new Set();
  async function iosRefreshSetupAgents(id) {
    if (iosSetupRefreshed.has(id) || iosSetupRefreshing.has(id)) return;
    iosSetupRefreshing.add(id);
    try {
      const health = await api("GET","/v1/health");
      if (health.instance !== instance || !Array.isArray(health.agents)) return;
      const selected = $("agent").value, mode = $("mode").value;
      knownAgents = health.agents;
      renderAgents();
      if ([...$("agent").options].some(option=>option.value === selected)) $("agent").value = selected;
      if ([...$("mode").options].some(option=>option.value === mode)) $("mode").value = mode;
      iosSetupRefreshed.add(id);
      renderSession(); pickers.sync();
    } catch (_) { /* A later session render retries without interrupting the active selection. */ }
    finally { iosSetupRefreshing.delete(id); }
  }
  renderSession = function() {
    iosRenderSession();
    const context = modelContext();
    const selected = context.chat ? session.options?.permission || "inherit" : savedOptions(context.agent).permission;
    const issue = iosPermissionIssue(context.agent,selected,context.mode);
    const hint = $("mode-hint");
    if (issue) {
      $("launch").disabled = true;
      if (context.chat) { $("send").disabled = true; $("steer").disabled = true; }
      hint.dataset.iosPermission = "true"; hint.textContent = t(issue); hint.hidden = false;
    } else if (hint.dataset.iosPermission) { delete hint.dataset.iosPermission; updateMode(); }
    if (iosPermissionIssue($("import-agent").value,savedOptions($("import-agent").value).permission,"chat")) $("import-confirm").disabled = true;
    if (online && session?.id && session.setup_action?.action === "install" && session.state === "exited" && session.exit_code === 0) void iosRefreshSetupAgents(session.id);
    iosTerminalTools?.update();
  };
  const iosWorktreeRender = worktreeCreator.render.bind(worktreeCreator);
  worktreeCreator.render = function() {
    iosWorktreeRender();
    if (!this.state) return;
    const agent = $("worktree-agent").value;
    const issue = iosPermissionIssue(agent,savedOptions(agent).permission,$("worktree-mode").value);
    if (issue) { $("worktree-create-submit").disabled = true; $("worktree-create-status").textContent = t(issue); }
  };
  $("worktree-mode").addEventListener("change",()=>worktreeCreator.render());
  // CLI sign-in URLs stay terminal text; a deliberate tap opens the browser.
  term.registerLinkProvider({provideLinks(number,callback) {
    const buffer = term.buffer.active;
    let first = number - 1, last = first;
    if (!buffer.getLine(first)) { callback(undefined); return; }
    while (first > 0 && last - first < 64 && buffer.getLine(first).isWrapped) first--;
    while (last + 1 < buffer.length && last - first < 64 && buffer.getLine(last + 1).isWrapped) last++;
    const rows = []; let text = "";
    for (let index = first; index <= last; index++) {
      const line = buffer.getLine(index);
      rows.push({line,index,start:text.length}); text += line.translateToString(index === last);
    }
    const point = offset => {
      const row = [...rows].reverse().find(row=>row.start <= offset) || rows[0];
      let characters = row.start;
      for (let x = 0; x < row.line.length; x++) {
        if (characters >= offset) return {x:x + 1,y:row.index + 1};
        const cell = row.line.getCell(x);
        characters += (cell?.getChars() || (cell?.getWidth() === 0 ? "" : " ")).length;
      }
      return {x:row.line.length,y:row.index + 1};
    };
    const links = [];
    for (const match of text.matchAll(/https?:\/\/[^\s<>"'\[\])]+/g)) {
      const url = match[0].replace(/[.,;!?]+$/,"");
      const range = {start:point(match.index),end:point(match.index + url.length - 1)};
      if (range.start.y <= number && range.end.y >= number) links.push({text:url,range,activate:(_event,value)=>native.openLink(value)});
    }
    callback(links);
  }});
  window.BibimerIOSAgentAction = async (agent, action) => {
    if (!online || !["codex","claude","opencode","gemini"].includes(agent) || !["install","version","login"].includes(action)) return;
    try {
      const result = await api("POST", "/v1/ios/agents", {agent,action,project_id:projectKey(),request_id:uuid()});
      await refreshCatalog();
      const destination = result.session;
      if (destination?.project?.id && destination.id) await selectSession(destination.project.id,destination.id);
      else if (destination?.id) await selectSession(projectKey(),destination.id);
      window.BibimerAgentActionStatus(agent,"agent_action_sent");
      tab("work");
    } catch (error) { notice(error.key || "error_request_failed"); }
  };
  window.BibimerOpenLocalTerminal = async () => {
    if (!online) return;
    tab("work"); await newSession();
    await changeAgent("shell");
    $("mode").value = "terminal"; $("mode").dispatchEvent(new Event("change"));
    $("launch").click();
  };
  if (environment().selfTest) {
    window.BibimerIOSSnapshot = () => ({online,project,session,knownProjects,knownAgents,busy,settingsBusy,switchingProject,sending:[...sending],
      terminal:Array.from({length:term.buffer.active.length},(_,index)=>term.buffer.active.getLine(index)?.translateToString(true) || "").join("\n")});
    window.BibimerIOSTestAPI = api;
    window.BibimerIOSTestOpenWorktree = () => worktreeCreator.open(projectKey());
    window.BibimerIOSTestSelectSession = id => selectSession(projectKey(),id);
  }
