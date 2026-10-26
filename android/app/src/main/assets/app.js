"use strict";
(() => {
  const $ = id => document.getElementById(id);
  const native = window.Bibimer;
  const i18n = window.BibimerI18n;
  const t = i18n.t;
  const pending = new Map();
  let serial = 0, online = false, paused = false, session = null, cursor = 0;
  let instance = null, activePoll = false, retryTimer = null, generation = 0, busy = false;
  let bridgeVersion = "";
  let project = null, inputQueue = Promise.resolve(), currentTab = "work";
  let quickTimer = null, quickHandled = environment().quickSetup?.phase === "connected" ? environment().quickSetup.id : null, quickSubmitting = false;
  let projectInitialized = false, connectionError = null;
  let noticeData = null, knownAgents = [];
  const sending = new Set(), views = new Map();
  let knownProjects = [], selectedProjectId = null, multipleProjects = false, switchingProject = false;
  let stopTarget = null, catalogRequest = false;
  let canBrowse = false, folderListing = null, folderPath = "~", folderLoading = false;
  let folderTicket = 0, folderError = null, folderSelection = null;
  let canGitHub = false, termuxHome = "~";
  let canImport = false, multiImport = false, persistentCodex = false, importProject = null, importEntries = [], importSelection = null;
  let importCursor = null, importSearch = "", importTicket = 0, importLoading = false, importError = null;
  let canOptions = false, canLiveOptions = false, settingsBusy = false, pendingOptions = null;
  let canCreateWorktrees = false;
  let canQueue = false, canBatchQueue = false, canSteer = false, canClaudeSteer = false, canQueueSteer = false, queued = [], queueRevision = -1, queueSignature = "";
  let canCommands = false, canHandoff = false, handoff = null;
  let canModels = false, canSwitchAgents = false, selectedAgent = "shell";
  let canLibrary = false, canWorktrees = false, activeViewKey = null, draftPath = null, importPath = null;
  let canInitialMessage = false;
  const launchAttempts = new Map();
  let actionTarget = null, deleteTarget = null, libraryBusy = false, worktreeLoading = false, worktreeError = null;
  let canResponseNotifications = false, notificationNavigating = false, notificationRetry, pendingNotification;
  let canDragProjects = false, canOrderProjects = false, canManageProjects = false, projectActionTarget = null, projectDeleteTarget = null, projectActionError = null;
  let canInspect = false, canOpenFiles = false, openingFile = false;
  let canBrowser = false, browserState = null, browserEnabled = true;
  const worktrees = {};
  const worktreeChecks = new Map();
  let workspaceDetails = null;
  const modelCatalogs = new Map();
  const sessionTitles = new Map(), titleChecks = new Map();
  let canSessionTitles = false, titleLoading = false;
  const lastOptions = environment().agentOptions || {};
  const demo = environment().demo === true;
  let projectLocation = {parent:demo ? "" : absoluteFolder(environment().lastProjectParent),
    folder:demo ? "" : absoluteFolder(environment().lastProjectFolder)};
  let projectPathEdited = false;
  restoreNormalDraftViews();
  function restoreNormalDraftViews() {
    if (demo || !native.takeNormalDraftViews) return;
    try {
      const restored = JSON.parse(native.takeNormalDraftViews()).views;
      for (const [key, view] of restored || []) views.set(key, view);
    } catch (_) { noticeData = {key:"demo_drafts_failed", suffix:null}; }
  }
  let languagePreference = "system";
  let enterBehavior = environment().enterBehavior === "send" ? "send" : "newline";
  let contextDisplay = environment().contextDisplay === "remaining" ? "remaining" : "used";
  const permissionModes = {codex:["inherit","read-only","workspace-write","yolo"],
    claude:["inherit","default","acceptEdits","plan","bypassPermissions"], opencode:["inherit","ask","allow"]};
  const pickers = new BibimerSelect(t, {
    description: (select, option) => select.id.includes("permission") ? t("permission_hint_" + option.value) :
      select.id === "project-switch" ? knownProjects.find(item => item.id === option.value)?.path || "" :
      select.id === "enter-behavior" ? t("enter_" + option.value + "_hint") :
      select.id === "context-display" ? t("context_display_" + option.value + "_hint") : option.dataset.description || "",
    context: select => ["language", "enter-behavior", "context-display", "browser-agent-tools"].includes(select.id) ? "app" :
      select.id === "project-switch" ? "projects/" + projectKey() :
      select.id.startsWith("worktree-") ? [instance, select.dataset.context].join("/") :
      select.id.startsWith("import-") ? [projectKey(), importProject, $("import-agent").value].join("/") :
      [projectKey(), session?.id, session?.state, select.dataset.agent].join("/")
  });
  const conversation = new BibimerConversation($("conversation"), $("chat-requests"), (key, values) => key === "chat_assistant" ? t("agent_" + (session?.agent || "codex")) : t(key, values), async data => {
    const id = session?.id;
    try {
      await api("POST", `/v1/sessions/${id}/respond`, data);
    } catch (error) { if (session?.id === id) notice(error.key || "error_request_failed"); }
  });
  const term = new Terminal({fontSize:13, fontFamily:"monospace", cursorBlink:true,
    scrollback:2000, drawBoldTextInBrightColors:true, theme:{background:"#0e1215", foreground:"#e3e9db", cursor:"#d7e8aa",
      black:"#1c211d", red:"#ed7777", green:"#a8d18d", yellow:"#e3c878", blue:"#80aeee", magenta:"#c999e5", cyan:"#79cbd2", white:"#d5decf",
      brightBlack:"#778373", brightRed:"#ff9b91", brightGreen:"#d7e8aa", brightYellow:"#ffdfa0", brightBlue:"#aac9ff", brightMagenta:"#ebbcff", brightCyan:"#a1edf0", brightWhite:"#ffffff"}});
  const fit = new FitAddon.FitAddon();
  term.loadAddon(fit);
  term.open($("terminal"));
  const sidebar = new BibimerSidebar(t, {
    refresh:refreshSidebar, manage:openSessionActions, manageProject:openProjectSettings,
    moveProject:(id, position) => manageProject(id, "move_to", position),
    import:async (id, path) => { await newSession(id, path); if (projectKey() === id) $("import-session").click(); },
    project:async id => { await changeProject({project_id:id}); sidebar.close(); tab("work"); },
    session:selectSession, create:newSession, worktree:id=>worktreeCreator.open(id)
  });
  const fileContext = () => ({instance, project:projectKey(),
    path:session?.project?.path || draftPath || project?.path, online:online && !paused && !switchingProject,
    supported:canInspect, filesSupported:canOpenFiles, demo});
  const fileViewer = new BibimerFileViewer(t, fileContext, data => api("POST", "/v1/inspect", data), openAndroidFile);
  const inspector = new BibimerInspector(t, fileContext, data => api("POST", "/v1/inspect", data), path => fileViewer.open(path));

  const github = new BibimerGitHub(t, () => ({online:online && !paused, supported:canGitHub, home:termuxHome}),
    data => api("POST", "/v1/github", data), {
      copy:text => native.copyText(text), link:url => native.openLink(url), termux:() => native.openTermux(), refresh:refreshSidebar,
      browse:(path, callback) => openFolderBrowser(path, callback),
      parent:() => projectLocation.parent,
      rememberClone:path => rememberProjectLocation(parentFolder(path), true),
      open:async id => { const changed = await changeProject({project_id:id}, true); if (changed) { projectForm(false); sidebar.close(); tab("work"); await refreshSidebar(); } return changed; }
    });

  const worktreeCreator = new BibimerWorktreeCreate(t, () => ({instance,view:viewKey(),projects:knownProjects,agents:knownAgents,
    online:online && !paused,supported:canCreateWorktrees}), data=>api("POST","/v1/worktrees/manage",data), {
    id:uuid,options:(agent,mode)=>({...savedOptions(agent),...(agent==="opencode" && mode==="terminal"?{effort:""}:{})}),
    refresh:refreshSidebar,open:async(id,sessionId)=>{await refreshCatalog();await selectSession(id,sessionId);}
  });

  const bridgeMaintenance = new BibimerMaintenance(t, () => ({instance,online,paused,reopen:!!native.maintainBridgeWithRecovery,allowed:canMaintainBridge}), api, {
    changed:renderBridgeUpdate,title:sessionTitle,status:sessionStatus,start:runBridgeMaintenance,id:uuid,
    find:id=>knownProjects.flatMap(project=>project.sessions || []).find(row=>row.id===id)
  });

  const commands = new BibimerCommands($("input"), $("commands"), t, () => {
    const agent = session?.agent || $("agent").value, path = session?.project?.path || draftPath || project?.path;
    return {agent, path, project:projectKey(), view:viewKey(), key:[instance, projectKey(), agent, path].join("/"),
      mode:session?.mode || $("mode").value, supported:canCommands, enabled:!$("input").disabled && ["codex", "claude", "opencode"].includes(agent)};
  }, data => api("POST", "/v1/commands", data));

  function environment() {
    try { return JSON.parse(native.environment()); }
    catch (_) { return {paired:false, termuxInstalled:false}; }
  }
  function absoluteFolder(path) {
    return typeof path === "string" && path.startsWith("/") && path.length <= 4096 && !/[\x00-\x1f\x7f]/.test(path) ? path.replace(/\/+$/, "") || "/" : "";
  }
  function parentFolder(path) {
    const folder = absoluteFolder(path);
    return folder ? folder.slice(0, folder.lastIndexOf("/")) || "/" : "";
  }
  function newProjectPath() {
    return (projectLocation.parent || (demo ? "/demo/projects" : "~/projects")).replace(/\/$/, "") + "/";
  }
  function rememberProjectLocation(path, isParent = false) {
    const folder = absoluteFolder(path), parent = isParent ? folder : parentFolder(folder);
    if (!parent || !folder) return;
    if (parent === projectLocation.parent && folder === projectLocation.folder) return;
    if (!demo && native.setProjectLocation) {
      try { if (!native.setProjectLocation(parent, folder)) return; } catch (_) { return; }
    }
    projectLocation = {parent, folder};
  }
  function savedOptions(agent) {
    const value = lastOptions[agent] || {};
    return {permission:permissionModes[agent]?.includes(value.permission) ? value.permission : "inherit",
      ...(agent === "codex" ? {fast:value.fast === true} : {}),
      ...(canModels && permissionModes[agent] ? {model:typeof value.model === "string" ? value.model : "", effort:typeof value.effort === "string" ? value.effort : ""} : {})};
  }
  function modelContext(prefix = "") {
    const live = !prefix && session && ["running", "stopping"].includes(session.state);
    const agent = prefix ? $("import-agent").value : live ? session.agent : $("agent").value;
    const path = prefix ? importPath || project?.path : live ? session.project.path : draftPath || project?.path;
    const key = (prefix ? importProject : projectKey()) + "/" + agent + (canWorktrees ? "/" + path : "");
    return {agent, key, path, live, chat:live && isChat(), mode:prefix ? "chat" : live ? session.mode : $("mode").value, project:prefix ? importProject : projectKey()};
  }
  async function loadModels(prefix = "", refresh = false) {
    const ctx = modelContext(prefix);
    if (!canModels || !online || !ctx.project || !permissionModes[ctx.agent]) return;
    if (modelCatalogs.get(ctx.key)?.loading) return;
    const state = {loading:true, models:modelCatalogs.get(ctx.key)?.models || [], error:null};
    modelCatalogs.set(ctx.key, state);
    const sourceInstance = instance;
    try {
      const result = await api("POST", "/v1/models", {project_id:ctx.project, agent:ctx.agent, ...(canWorktrees ? {worktree_path:ctx.path} : {}), refresh});
      if (instance !== sourceInstance || modelCatalogs.get(ctx.key) !== state) return;
      state.models = result.models; state.ready = true;
    } catch (error) {
      state.error = error.key || "error_models";
    } finally { state.loading = false; renderSession(); }
  }
  function renderModels(prefix = "") {
    const ctx = modelContext(prefix), source = prefix || "quick-", state = modelCatalogs.get(ctx.key);
    const pending = pendingOptions?.prefix === prefix && pendingOptions.agent === ctx.agent && pendingOptions.id === (ctx.chat ? session.id : null);
    const options = pending ? pendingOptions.value : ctx.chat ? session.options || {} : savedOptions(ctx.agent);
    const rows = state?.models || [], model = rows.find(row => row.id === options.model);
    const disabled = !canModels || !online || busy || switchingProject || settingsBusy || !state?.ready || state.loading ||
      (ctx.chat && (!session.ready || session.state !== "running"));
    function choices(id, entries, selected, empty) {
      const select = $(id), list = [{id:"", name:t(empty)}, ...entries];
      if (selected && !list.some(row => row.id === selected)) list.push({id:selected, name:selected, disabled:true});
      const signature = JSON.stringify(list);
      if (select.dataset.choices !== signature) {
        select.replaceChildren(...list.map(row => {
          const option = new Option(row.name || t("effort_" + row.id) || row.id, row.id);
          option.disabled = !!row.disabled; option.dataset.description = row.description || ""; return option;
        })); select.dataset.choices = signature;
      }
      select.dataset.agent = ctx.agent; select.value = selected || ""; select.disabled = disabled;
    }
    choices(source + "model", rows, options.model, "model_default");
    $(source + "model").options[0].disabled = !!(ctx.chat && ctx.agent === "opencode" && options.model);
    $(source + "model").options[0].dataset.description = ctx.chat && ctx.agent === "opencode" && options.model ? t("error_model_default") : "";
    choices(source + "effort", (model?.efforts || []).map(row => ({...row,name:i18n.has?.("effort_"+row.id) ? t("effort_"+row.id) : row.id})), options.effort, "effort_default");
    $(source + "effort").disabled = disabled || !model?.efforts?.length;
    if (ctx.agent === "opencode" && ctx.mode === "terminal") {
      $(source + "effort").disabled = true; $(source + "effort").value = "";
    }
    const supported = !!permissionModes[ctx.agent];
    $(source + "model").hidden = !supported;
    $(source + "effort").hidden = !supported;
    $(prefix + "models-refresh").hidden = !supported;
    $(prefix + "models-refresh").disabled = !canModels || !online || busy || state?.loading || switchingProject;
    const hint = !supported ? null : !canModels ? "models_update" : state?.loading ? "models_loading" : state?.error ||
      (state?.ready && !rows.length ? "models_empty" : state?.ready && options.model && !model ? "error_model_selection" : ctx.agent === "opencode" && ctx.mode === "terminal" ? "error_effort_terminal" : null);
    $(prefix + "models-hint").textContent = hint ? t(hint) : "";
    $(prefix + "models-hint").hidden = !hint;
    if (!state && canModels && online && ctx.project && supported && (!prefix || $("import-dialog").open)) void loadModels(prefix);
  }
  function renderSettings(prefix = "") {
    const live = !prefix && session && ["running","stopping"].includes(session.state);
    const chat = live && isChat();
    const agent = prefix ? $("import-agent").value : live ? session.agent : $("agent").value;
    $(prefix ? "import-settings" : "agent-settings").hidden = !permissionModes[agent];
    if (!permissionModes[agent]) return;
    $(prefix + "settings-title").textContent = t("agent_" + agent) + " · " + t("agent_settings");
    const pending = pendingOptions?.prefix === prefix && pendingOptions.agent === agent && pendingOptions.id === (chat ? session.id : null);
    const options = pending ? pendingOptions.value : chat ? session.options || {permission:"inherit"} : savedOptions(agent);
    const updateNeeded = !canOptions || (chat && !canLiveOptions);
    const disabled = updateNeeded || busy || settingsBusy || (chat && (!online || !session.ready || session.state !== "running"));
    for (const id of prefix ? [prefix + "permission"] : ["permission", "quick-permission"]) {
      const select = $(id);
      // Keep the option model stable during status polling.
      if (select.dataset.agent !== agent || select.dataset.language !== i18n.language()) {
        select.replaceChildren(...permissionModes[agent].map(mode => new Option(t("permission_" + mode), mode)));
        select.dataset.agent = agent; select.dataset.language = i18n.language();
      }
      select.value = options.permission; select.disabled = disabled;
      for (const option of select.options) option.disabled = !!(chat && agent === "opencode" && option.value === "inherit" && options.permission !== "inherit");
    }
    for (const name of prefix ? [prefix] : ["", "quick-"]) {
      $(name + "fast-label").hidden = agent !== "codex";
      $(name + "fast").checked = options.fast === true;
      $(name + "fast").disabled = disabled;
    }
    $(prefix + "settings-summary").textContent = updateNeeded ? t("settings_update_short") : t("permission_" + options.permission) + (agent === "codex" ? " · " + t(options.fast ? "fast_on" : "fast_off") : "");
    $(prefix + "permission-hint").textContent = t("permission_hint_" + options.permission);
    $(prefix + "settings-hint").textContent = updateNeeded ? t("settings_update") :
      t(chat ? "settings_live_chat" : live ? "settings_live_terminal" : "settings_saved") +
      (chat && agent === "opencode" && options.permission !== "inherit" ? " " + t("error_permission_default") : "") +
      (agent === "codex" ? " " + t("fast_hint") : "");
    if (!prefix) {
      const hint = settingsBusy ? "settings_saving" : updateNeeded ? "settings_update_short" : null;
      $("quick-hint").textContent = hint ? t(hint) : "";
      $("quick-hint").hidden = !hint;
    }
    pickers.sync();
  }
  async function saveOptions(prefix, quick = false, changed = null) {
    if (settingsBusy) return;
    const live = !prefix && session && ["running","stopping"].includes(session.state);
    const chat = live && isChat();
    const agent = prefix ? $("import-agent").value : live ? session.agent : $("agent").value;
    const source = quick ? "quick-" : prefix;
    const base = chat ? session.options || {} : savedOptions(agent);
    const value = {...base, permission:$(source + "permission").value,
      ...(agent === "codex" ? {fast:$(source + "fast").checked} : {})};
    if (changed === "model") { value.model = $(source + "model").value; value.effort = ""; }
    if (changed === "effort") value.effort = $(source + "effort").value;
    const id = chat ? session.id : null;
    pendingOptions = {prefix, agent, id, value};
    settingsBusy = true; renderSession();
    try {
      if (id) {
        const result = await api("POST", `/v1/sessions/${id}/options`, {options:value, request_id:uuid()});
        if (session?.id === id) setSession(result.session);
      }
      if (!native.setAgentOptions(agent, JSON.stringify(value))) throw appError(id ? "error_settings_default_save" : "error_settings_save");
      lastOptions[agent] = value;
    } catch (error) {
      $(prefix + "settings-dialog").close();
      if (prefix) $("import-dialog").close();
      if (!id || session?.id === id) notice(error.key || "error_settings_save");
    } finally { pendingOptions = null; settingsBusy = false; renderSession(); }
  }
  for (const prefix of ["", "import-"]) {
    $(prefix + "settings-toggle").addEventListener("click", () => { renderSettings(prefix); $(prefix + "settings-dialog").showModal(); });
    $(prefix + "settings-done").addEventListener("click", () => $(prefix + "settings-dialog").close());
    $(prefix + "permission").addEventListener("change", () => saveOptions(prefix));
    $(prefix + "fast").addEventListener("change", () => saveOptions(prefix));
  }
  $("quick-permission").addEventListener("change", () => saveOptions("", true));
  $("quick-fast").addEventListener("change", () => saveOptions("", true));
  for (const prefix of ["", "import-"]) {
    for (const field of ["model", "effort"]) $( (prefix || "quick-") + field).addEventListener("change", () => saveOptions(prefix, !prefix, field));
    $(prefix + "models-refresh").addEventListener("click", () => { void loadModels(prefix, true); renderSession(); });
  }
  function renderNotice() {
    $("notice").textContent = noticeData ? t(noticeData.key) + (noticeData.suffix ? " " + t(noticeData.suffix) : "") : "";
    $("notice").hidden = !noticeData;
    const error = noticeData?.key?.startsWith("error_") ? $("notice").textContent : "";
    $("session-action-error").textContent = error;
    $("session-action-error").hidden = !error;
    if ($("sidebar").open && error) $("sidebar-status").textContent = error;
  }
  function notice(key, suffix = null) { noticeData = key ? {key, suffix} : null; renderNotice(); }
  function appError(key, status = 0) { return Object.assign(new Error(t(key)), {key, status}); }
  function api(method, path, data = {}) {
    return new Promise((resolve, reject) => {
      const id = String(++serial);
      const timeout = setTimeout(() => {
        pending.delete(id);
        reject(appError("error_timeout"));
      }, path === "/native/open-file" ? 120000 : 35000);
      pending.set(id, {resolve, reject, timeout});
      try { native.request(id, method, path, JSON.stringify(data)); }
      catch (_) {
        clearTimeout(timeout); pending.delete(id);
        reject(appError("error_android_required"));
      }
    });
  }
  async function openAndroidFile(path, ctx = fileContext()) {
    if (demo) throw appError("demo_file");
    if (!ctx.online || !online || paused || switchingProject || !ctx.project || fileViewer.key(ctx) !== fileViewer.key(fileContext())) throw appError("error_connection_failed");
    if (!canOpenFiles) throw appError("file_links_update");
    if (openingFile) throw appError("error_file_busy");
    const data = {project_id:ctx.project, path, worktree_path:ctx.path};
    openingFile = true;
    try { await api("POST", "/native/open-file", data); }
    finally { openingFile = false; }
  }
  window.BibimerOpenFile = async path => {
    const source = viewKey(), bridgeInstance = instance;
    notice("file_opening");
    try {
      await openAndroidFile(path);
      if (viewKey() === source && instance === bridgeInstance && ["file_opening", "error_file_busy"].includes(noticeData?.key)) notice(null);
    } catch (error) {
      if (viewKey() === source && instance === bridgeInstance) notice(error.key || "error_file_open");
    }
  };
  window.BibimerNativeReply = (id, response) => {
    const item = pending.get(id);
    if (!item) return;
    clearTimeout(item.timeout); pending.delete(id);
    if (response.ok) item.resolve(response.data);
    else item.reject(appError(i18n.errorKey(response.data), response.status));
  };
  function uuid() { return crypto.randomUUID(); }
  function connected(value) {
    online = value;
    $("connection").textContent = t(demo ? "demo_connection" : value ? "connection_on" : "connection_off");
    $("connection").className = "badge" + (value ? " connected" : "");
    renderSession();
    renderQuickSetup();
  }
  function updateEnvironment() {
    renderNotificationSettings();
    renderAppUpdates(); renderBridgeUpdate();
    const env = environment();
    $("demo-banner").hidden = !demo;
    $("demo-settings-card").hidden = !demo;
    $("review-access-open").hidden = demo;
    for (const id of ["forget", "open-termux", "setup-open-termux", "quick-open-termux", "quick-app-permissions", "export-installer", "pair"]) $(id).disabled = demo;
    $("termux-status").textContent = t(env.termuxInstalled ? "installed" : "install_needed");
    $("termux-status").className = "badge" + (env.termuxInstalled ? " connected" : "");
    $("reconnect-welcome").hidden = !env.paired;
    for (const button of document.querySelectorAll("[data-agent-action]")) button.disabled = demo;
    renderQuickSetup(env);
  }
  function renderSetupConnection() {
    const complete = online && !demo, steps = $("setup-connection-steps");
    const moveFocus = complete && currentTab === "setup" && steps.contains(document.activeElement);
    steps.hidden = complete;
    steps.disabled = complete;
    $("setup-connection-complete").hidden = !complete;
    $("setup-intro").hidden = complete;
    if (complete) {
      $("manual-setup").open = false;
      $("quick-permissions").open = false;
      if (moveFocus) $("setup-open-work").focus({preventScroll:true});
    }
    return complete;
  }
  function renderQuickSetup(env = environment()) {
    const complete = renderSetupConnection();
    const supported = typeof native.startQuickSetup === "function";
    $("quick-setup").hidden = !supported;
    if (!supported) { if (!complete) $("manual-setup").open = true; return; }
    const setup = env.quickSetup || {phase:"idle"}, waiting = ["running", "connecting"].includes(setup.phase);
    const phase = complete ? "connection_on" : !env.termuxInstalled ? "quick_termux_missing" :
      env.paired && setup.phase === "connected" ? "connection_off" : setup.phase.startsWith("quick_") ? setup.phase : "quick_" + setup.phase;
    $("quick-status").textContent = t(i18n.has(phase) ? phase : "quick_start_failed");
    $("quick-connect").disabled = demo || complete || !env.termuxInstalled || waiting || quickSubmitting;
    $("quick-connect").setAttribute("aria-busy", String(waiting || quickSubmitting));
    if (!complete && ["quick_external", "quick_permission"].includes(setup.phase)) $("quick-permissions").open = true;
    if (setup.phase === "connected" && setup.id && quickHandled !== setup.id && env.paired) {
      quickHandled = setup.id;
      $("pair-code").value = "";
      if (!paused) { notice(""); tab("work"); void connect(); }
    }
    clearTimeout(quickTimer);
    if (!paused && (waiting || quickSubmitting || currentTab === "setup")) quickTimer = setTimeout(updateEnvironment, 1000);
  }
  function renderAgents() {
    const selected = $("agent").value;
    $("agent").replaceChildren();
    for (const agent of (knownAgents.length ? [...knownAgents].sort((a,b) => (a.id === "shell") - (b.id === "shell")) : [{id:"shell", installed:true}])) {
      const option = document.createElement("option");
      option.value = agent.id;
      option.textContent = t("agent_" + agent.id) + (!agent.installed ? t("install_required_suffix") : agent.available === false ? t("repair_required_suffix") : "");
      option.disabled = !agent.installed || agent.available === false;
      if (agent.id === "shell") option.dataset.description = t("terminal_secondary");
      $("agent").append(option);
    }
    if ([...$("agent").options].some(option => option.value === selected && !option.disabled)) $("agent").value = selected;
    updateMode();
    $("agent-diagnostics").replaceChildren(...knownAgents.filter(agent => agent.id !== "shell").map(agent => {
      const row = document.createElement("p"); row.className = "hint";
      row.textContent = t("agent_" + agent.id) + " · " + t(demo ? "demo_title" : !agent.installed ? "install_needed" : agent.issue || "installed");
      return row;
    }));
  }
  function importable(agent) {
    const owned = agent.id === session?.agent ? session : knownProjects.find(item => item.id === projectKey())?.sessions?.find(item => item.agent === agent.id);
    return canImport && (multiImport || agent.id === "codex") && agent.installed && agent.available !== false && agent.modes?.includes("chat") &&
      (canLibrary || !canSwitchAgents || !owned || !["running", "stopping"].includes(owned.state));
  }
  function supportsChat() { return !!knownAgents.find(agent => agent.id === $("agent").value)?.modes?.includes("chat"); }
  function newSessionAgent(preferred = selectedAgent) {
    const agents = knownAgents.filter(agent => agent.id !== "shell");
    const available = agent => agent.installed && agent.available !== false;
    return agents.find(agent => agent.id === preferred && available(agent))?.id ||
      agents.find(agent => available(agent) && agent.modes?.includes("chat"))?.id ||
      agents.find(available)?.id || agents[0]?.id || "shell";
  }
  function projectKey(value = project) { return value?.id || value?.path || null; }
  function viewKey() { return canLibrary ? activeViewKey : canSwitchAgents ? projectKey() + "/" + selectedAgent : projectKey(); }
  function rememberView() {
    const key = viewKey();
    if (!projectKey() || !key) return;
    const questions = {...views.get(key)?.questions};
    for (const [id, request] of conversation.requests) {
      questions[id] = Object.fromEntries([...request.fields].map(([name,input]) => [name,{value:input.value,selections:input.bibimerSelections || []}]));
    }
    views.set(key, {text:$("input").value, start:$("input").selectionStart, end:$("input").selectionEnd,
      agent:selectedAgent, mode:$("mode").value, questions});
  }
  function keepNormalDraftViews() {
    try {
      rememberView();
      const snapshot = JSON.stringify({views:[...views].filter(([key]) => typeof key === "string").map(([key, view]) => [key, {
        text:view.text || "", start:view.start || 0, end:view.end || 0, agent:view.agent || "shell", mode:view.mode || "terminal", questions:view.questions || {}
      }])});
      if (native.saveNormalDraftViews?.(snapshot)) return true;
    } catch (_) { }
    notice("demo_drafts_failed"); return false;
  }
  function restoreQuestions(event) {
    const view = views.get(viewKey());
    if (!view) return;
    for (const [id, request] of conversation.requests) {
      for (const [name, input] of request.fields) {
        const value = view.questions?.[id]?.[name];
        if (value !== undefined) {
          input.value = typeof value === "string" ? value : value.value;
          input.bibimerSelections = value.selections || [];
          input.bibimerRefresh?.();
        }
      }
    }
    view.questions = Object.fromEntries(Object.entries(view.questions || {}).filter(([id]) =>
      (event.requests || []).some(request => request.id === id)));
  }
  function renderProjects() {
    const picker = $("project-switch");
    picker.hidden = true;
    $("project-name").hidden = false;
    $("edit-project-label").textContent = t(multipleProjects ? "add_project" : "edit_project");
    $("cancel-project").hidden = !project;
    const entries = knownProjects.map(item => {
      const state = item.session?.state;
      const label = state === "running" && item.session?.turn_state === "waiting" ? t("chat_state_waiting") :
        state === "running" ? t("process_running") : state === "stopping" ? t("process_stopping") :
        state === "lost" ? t("process_lost") : state === "exited" ? t("process_exited", {code:item.session.exit_code}) : t("process_idle");
      const name = knownProjects.some(other => other.id !== item.id && other.name === item.name) ? item.path : item.name;
      return {id:item.id, label:name + " · " + label};
    });
    const signature = JSON.stringify(entries);
    if (picker.dataset.entries !== signature) {
      picker.replaceChildren(...entries.map(item => new Option(item.label, item.id)));
      picker.dataset.entries = signature;
    }
    picker.value = selectedProjectId || "";
    renderSidebar();
    pickers.sync();
  }
  function findSession(id) {
    if (session?.id === id) return session;
    for (const entry of knownProjects) {
      const found = entry.sessions?.find(row => row.id === id) || (entry.session?.id === id ? entry.session : null);
      if (found) return found;
    }
    return null;
  }
  function cacheSession(value) {
    const entry = knownProjects.find(row => row.id === value?.project?.id);
    if (!entry) return;
    const previous = entry.sessions?.find(row => row.id === value.id);
    value = {...previous, ...value};
    entry.sessions = [...(entry.sessions || []).filter(row => row.id !== value.id), value];
    if (entry.session?.id === value.id) entry.session = value;
  }
  function sessionTitle(value) {
    if (value.title) return value.title;
    if (value.kind === "browser") return t("browser_title");
    if (value.display_title || sessionTitles.get(value.id)) return value.display_title || sessionTitles.get(value.id);
    const date = new Date(value.started_at * 1000);
    return t("agent_" + value.agent) + " · " + (Number.isNaN(date.getTime()) ? value.id.slice(0,8) :
      date.toLocaleString(i18n.language() === "en" ? "en-US" : i18n.language(), {month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})) + " · " + value.id.slice(0,4);
  }
  function sessionStatus(value) {
    return t(value.state === "running" ? value.mode === "chat" ? "chat_state_" + value.turn_state : "process_running" :
      value.state === "stopping" ? "process_stopping" : value.state === "lost" ? "process_lost" : "process_exited", {code:value.exit_code});
  }
  function isResponding(value) {
    return online && value?.mode === "chat" && value.state === "running" && value.turn_state === "running";
  }
  function renderSidebar() {
    sidebar.render({projects:knownProjects, projectId:projectKey(), sessionId:session?.id,
      worktrees, online, creation:canCreateWorktrees, dragOrdering:canDragProjects, library:canLibrary, disabled:!online || busy || switchingProject || settingsBusy || libraryBusy,
      loading:worktreeLoading, error:worktreeError || (noticeData?.key?.startsWith("error_") ? noticeData.key : null), title:sessionTitle, status:sessionStatus, responding:isResponding});
  }
  async function refreshSidebar() {
    await refreshCatalog();
    refreshSessionTitles();
    if (!online || !canWorktrees || worktreeLoading) { renderSidebar(); return; }
    worktreeLoading = true; worktreeError = null; renderSidebar();
    const sourceInstance = instance;
    try {
      for (const entry of [...knownProjects]) {
        if (sourceInstance !== instance) return;
        await refreshProjectWorktrees(entry, true);
      }
    } catch (error) { worktreeError = error.key || "error_request_failed"; }
    finally { worktreeLoading = false; renderSidebar(); }
  }
  async function refreshProjectWorktrees(entry, force = false) {
    if (!entry?.id || !online || paused || !canWorktrees) return;
    const previous = worktreeChecks.get(entry.id);
    if (previous?.path === entry.path && (previous.loading || (!force && Date.now() - previous.time < 10000))) return;
    const check = {path:entry.path, time:Date.now(), loading:true}, sourceInstance = instance;
    worktreeChecks.set(entry.id, check);
    const current = () => instance === sourceInstance && worktreeChecks.get(entry.id) === check &&
      knownProjects.some(row => row.id === entry.id && row.path === entry.path);
    try {
      const result = await api("POST", "/v1/worktrees", {project_id:entry.id});
      if (current()) { worktrees[entry.id] = result.worktrees; worktreeError = null; }
    } catch (error) {
      if (current()) { delete worktrees[entry.id]; worktreeError = error.key || "error_request_failed"; }
    } finally {
      check.loading = false;
      if (current()) { renderWorkspaceSummary(); renderWorkspaceDetails(); renderSidebar(); }
    }
  }
  function currentWorkspaceInfo() {
    const path = session?.project?.path || draftPath || project?.path || "";
    return window.BibimerWorkspaceInfo(path, worktrees[projectKey()] || []);
  }
  function renderWorkspaceSummary() {
    const info = currentWorkspaceInfo(), button = $("project-path");
    button.textContent = info.label || t("project_location");
    button.title = [info.branch, info.path].filter(Boolean).join("\n");
    button.disabled = !info.path;
    button.setAttribute("aria-label", t("workspace_details") + (info.label ? ": " + info.label : ""));
  }
  function renderWorkspaceDetails() {
    if (!workspaceDetails) return;
    const info = window.BibimerWorkspaceInfo(workspaceDetails.path, worktrees[workspaceDetails.id] || []);
    $("workspace-branch-section").hidden = !info.branch;
    $("workspace-branch").textContent = info.branch;
    $("workspace-path").textContent = info.path;
  }
  $("project-path").addEventListener("click", () => {
    const info = currentWorkspaceInfo();
    if (!info.path) return;
    workspaceDetails = {id:projectKey(), path:info.path};
    renderWorkspaceDetails(); $("workspace-details-dialog").showModal();
    void refreshProjectWorktrees(project, true);
  });
  $("workspace-details-close").addEventListener("click", () => $("workspace-details-dialog").close());
  $("workspace-details-dialog").addEventListener("click", event => {
    if (event.target !== event.currentTarget) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) event.currentTarget.close();
  });
  $("workspace-details-dialog").addEventListener("close", () => { workspaceDetails = null; });
  $("workspace-copy-path").addEventListener("click", () => {
    if (workspaceDetails) native.copyText(workspaceDetails.path);
  });
  $("workspace-copy-branch").addEventListener("click", () => {
    if (!workspaceDetails) return;
    const info = window.BibimerWorkspaceInfo(workspaceDetails.path, worktrees[workspaceDetails.id] || []);
    if (info.branch) native.copyText(info.branch);
  });
  async function refreshSessionTitles() {
    if (!online || paused || !canSessionTitles || titleLoading || !sidebar.dialog.open) return;
    titleLoading = true;
    const sourceInstance = instance;
    try {
      const rows = knownProjects.flatMap(entry => entry.sessions || []);
      for (const row of rows) {
        if (sourceInstance !== instance || paused || !online || !sidebar.dialog.open) break;
        if (row.title || row.mode !== "chat" || !row.external_thread_id || Date.now() - (titleChecks.get(row.id) || 0) < 60000) continue;
        titleChecks.set(row.id, Date.now());
        try {
          const result = await api("GET", `/v1/sessions/${row.id}/title`);
          if (sourceInstance !== instance) break;
          // Only merge the title: status/drafts may have changed during the lookup.
          const current = findSession(row.id);
          if (current && result.session?.display_title) {
            sessionTitles.set(row.id, result.session.display_title);
            current.display_title = result.session.display_title;
            if (session?.id === row.id) session.display_title = result.session.display_title;
            renderSession(); renderSidebar();
          }
        } catch (_) { /* Keep the existing label; a later refresh can retry. */ }
      }
    } finally { titleLoading = false; }
  }
  async function selectSession(projectId, id, path = null, draftAgent = null) {
    if (!online || busy || switchingProject || settingsBusy || libraryBusy) return;
    if (!canLibrary) { await changeProject({project_id:projectId}); sidebar.close(); tab("work"); return; }
    switchingProject = true; ++generation; clearTimeout(retryTimer); native.cancelPoll?.(); renderSession();
    try {
      const entry = knownProjects.find(row => row.id === projectId);
      const preferred = projectId === projectKey() ? selectedAgent : entry?.agent || "shell";
      const agent = id === null ? draftAgent || newSessionAgent(preferred) : preferred;
      const result = await api("POST", "/v1/project-session", {project_id:projectId, session_id:id, agent});
      selectedProjectId = projectId; adoptProject(entry); rememberView();
      selectedAgent = result.agent; draftPath = path || result.session?.project?.path || entry.path;
      entry.agent = result.agent; entry.session = result.session;
      setSession(result.session); projectInitialized = true;
      $("project-name").textContent = entry.name;
      projectForm(false); notice(""); sidebar.close(); tab("work"); resize();
    } catch (error) { notice(error.key || "error_request_failed"); }
    finally { switchingProject = false; renderSession(); renderProjects(); startPoll(); }
  }
  async function newSession(projectId = projectKey(), path = session?.project?.path || draftPath || project?.path) {
    if (!canLibrary) {
      if (session && ["running", "stopping"].includes(session.state)) { notice("sidebar_update"); return; }
      setSession(null); sidebar.close(); return;
    }
    await selectSession(projectId, null, path);
  }
  function openSessionActions(id) {
    const target = findSession(id);
    if (!target) return;
    notice(""); actionTarget = id; $("session-name").value = target.title || "";
    $("session-name").placeholder = sessionTitle(target);
    renderSessionActions(); $("session-dialog").showModal();
  }
  function openProjectSettings(id) {
    const target = knownProjects.find(row => row.id === id);
    if (!target || libraryBusy) return;
    projectActionTarget = id; projectDeleteTarget = null; projectActionError = null;
    $("project-settings-name").value = target.name;
    renderProjectSettings(); $("project-settings-dialog").showModal();
  }
  function projectHasActiveSessions(target) {
    return (target?.sessions || (target?.session ? [target.session] : [])).some(row => ["running", "stopping"].includes(row.state));
  }
  function renderProjectSettings() {
    const target = knownProjects.find(row => row.id === projectActionTarget);
    const disabled = !online || !canManageProjects || !target || libraryBusy || busy || switchingProject;
    const position = knownProjects.findIndex(row => row.id === projectActionTarget);
    const orderDisabled = !online || !canOrderProjects || !target || libraryBusy || busy || switchingProject;
    $("project-order-position").textContent = target ? t("project_order_position", {position:position + 1, count:knownProjects.length}) : "";
    $("project-move-up").disabled = orderDisabled || position <= 0;
    $("project-move-down").disabled = orderDisabled || position >= knownProjects.length - 1;
    $("project-order-update").hidden = canOrderProjects;
    const live = projectHasActiveSessions(target);
    $("project-settings-path").textContent = target?.path || "";
    $("project-settings-name").disabled = $("project-rename").disabled = disabled;
    $("project-copy-path").disabled = !target;
    $("project-remove").disabled = disabled || live;
    $("project-remove-hint").textContent = t(live ? "error_project_delete_active" : "project_remove_hint");
    $("project-management-update").hidden = canManageProjects;
    const deleting = knownProjects.find(row => row.id === projectDeleteTarget);
    $("project-delete-name").textContent = deleting?.name || "";
    $("project-delete-confirm").disabled = disabled || !deleting || projectHasActiveSessions(deleting);
    for (const id of ["project-settings-error", "project-delete-error"]) {
      $(id).textContent = projectActionError ? t(projectActionError) : "";
      $(id).hidden = !projectActionError;
    }
  }
  async function manageProject(id, action, name) {
    const reordering = action === "move_up" || action === "move_down" || action === "move_to";
    if (action === "move_to" && !canDragProjects) return;
    if (!(reordering ? canOrderProjects : canManageProjects) || !online || libraryBusy || busy || switchingProject) return;
    libraryBusy = true; projectActionError = null;
    const ticket = ++generation; clearTimeout(retryTimer); native.cancelPoll?.(); renderSession();
    try {
      const result = await api("POST", "/v1/project/manage", {project_id:id, action, ...(name !== undefined ? action === "move_to" ? {position:name} : {name} : {})});
      if (ticket !== generation) return;
      if (reordering) {
        const ranks = new Map(result.project_order.map((key, index) => [key, index]));
        knownProjects.sort((a, b) => (ranks.get(a.id) ?? ranks.size) - (ranks.get(b.id) ?? ranks.size));
        return;
      }
      if (result.project) {
        knownProjects = knownProjects.map(row => row.id === id ? {...row, ...result.project} : row);
        if (projectKey() === id) project = {...project, ...result.project};
      } else {
        knownProjects = knownProjects.filter(row => row.id !== id);
        delete worktrees[id]; worktreeChecks.delete(id); modelCatalogs.clear();
        if (projectKey() === id) {
          const next = knownProjects.find(row => row.id === result.active_project_id) || knownProjects[0] || null;
          selectedProjectId = next?.id || null; adoptProject(next); setSession(next?.session || null);
          projectInitialized = false;
        }
        for (const key of views.keys()) if (key === id || key?.startsWith(id + "/")) views.delete(key);
      }
      $("project-name").textContent = project?.name || t("project_empty");
      $("project-delete-dialog").close(); $("project-settings-dialog").close();
      notice(""); await connect();
    } catch (error) {
      if (ticket !== generation) return;
      projectActionError = error.key || "error_request_failed";
      if (!$("project-settings-dialog").open) notice(projectActionError);
    } finally { libraryBusy = false; renderProjects(); renderSession(); startPoll(); }
  }
  $("project-settings-close").addEventListener("click", () => $("project-settings-dialog").close());
  $("project-settings-dialog").addEventListener("close", () => {
    const key = "project-settings/" + projectActionTarget;
    [...$("sidebar-projects").querySelectorAll("[data-key]")].find(node => node.dataset.key === key)?.focus({preventScroll:true});
  });
  $("project-rename-form").addEventListener("submit", event => { event.preventDefault(); manageProject(projectActionTarget, "rename", $("project-settings-name").value); });
  for (const action of ["move_up", "move_down"]) {
    $("project-" + action.replace("_", "-")).addEventListener("click", () => manageProject(projectActionTarget, action));
  }
  $("project-copy-path").addEventListener("click", () => {
    const target = knownProjects.find(row => row.id === projectActionTarget);
    if (target) native.copyText(target.path);
  });
  $("project-remove").addEventListener("click", () => {
    projectDeleteTarget = projectActionTarget; projectActionError = null;
    renderProjectSettings(); $("project-delete-dialog").showModal();
  });
  $("project-delete-cancel").addEventListener("click", () => $("project-delete-dialog").close());
  $("project-delete-confirm").addEventListener("click", () => manageProject(projectDeleteTarget, "delete"));
  function renderSessionActions() {
    const target = findSession(actionTarget);
    const disabled = !online || libraryBusy || busy || switchingProject || !target;
    const live = target && ["running", "stopping"].includes(target.state);
    $("session-action-name").textContent = target ? sessionTitle(target) : "";
    $("session-action-status").textContent = target ? sessionStatus(target) : "";
    $("session-action-status").classList.toggle("response-progress", isResponding(target));
    $("session-rename-form").hidden = !canLibrary;
    for (const id of ["session-name", "session-rename", "session-archive", "session-delete", "session-continue"]) $(id).disabled = disabled;
    $("session-archive").hidden = $("session-archive-hint").hidden = $("session-delete").hidden = $("session-delete-hint").hidden = !canLibrary;
    $("session-archive").textContent = t(target?.archived ? "session_restore" : "session_archive");
    $("session-delete").disabled = disabled || live;
    $("session-handoff").hidden = target?.mode !== "chat";
    $("session-handoff").disabled = disabled;
    $("session-continue").hidden = !canLibrary || live || target?.mode !== "chat" || !target?.external_thread_id;
    $("stop").hidden = !live; $("stop").disabled = disabled || target?.state !== "running";
    $("copy-resume").hidden = !(target?.agent === "codex" && target.history_persisted && target.external_thread_id);
    $("copy-resume").disabled = disabled;
  }
  async function manageSession(id, action, title) {
    if (!canLibrary || libraryBusy || !online) return;
    libraryBusy = true; ++generation; clearTimeout(retryTimer); native.cancelPoll?.(); renderSession();
    try {
      const result = await api("POST", `/v1/sessions/${id}/manage`, {action, ...(title !== undefined ? {title} : {})});
      if (result.session) {
        cacheSession(result.session);
        if (session?.id === id) setSession(result.session);
      } else {
        for (const entry of knownProjects) {
          entry.sessions = (entry.sessions || []).filter(row => row.id !== id);
          if (entry.session?.id === id) entry.session = null;
        }
        if (session?.id === id) { ++generation; native.cancelPoll?.(); setSession(null); }
        for (const key of views.keys()) if (key?.endsWith("/" + id)) views.delete(key);
      }
      $("session-dialog").close(); notice("");
    } catch (error) { notice(error.key || "error_request_failed"); }
    finally { libraryBusy = false; renderSession(); renderProjects(); startPoll(); }
  }
  $("new-session").addEventListener("click", () => newSession());
  $("session-more").addEventListener("click", () => openSessionActions(session?.id));
  $("session-actions-close").addEventListener("click", () => $("session-dialog").close());
  $("session-rename-form").addEventListener("submit", event => { event.preventDefault(); manageSession(actionTarget, "rename", $("session-name").value); });
  $("session-archive").addEventListener("click", () => manageSession(actionTarget, findSession(actionTarget)?.archived ? "restore" : "archive"));
  $("session-delete").addEventListener("click", () => {
    deleteTarget = actionTarget; $("delete-name").textContent = sessionTitle(findSession(deleteTarget)); $("delete-dialog").showModal();
  });
  $("cancel-delete").addEventListener("click", () => $("delete-dialog").close());
  $("confirm-delete").addEventListener("click", () => { $("delete-dialog").close(); manageSession(deleteTarget, "delete"); });
  $("session-continue").addEventListener("click", async () => {
    const target = findSession(actionTarget);
    if (!target || libraryBusy || !online) return;
    libraryBusy = true; renderSession();
    try {
      const result = await api("POST", "/v1/sessions", {project_id:target.project.id, worktree_path:target.project.path,
        agent:target.agent, mode:"chat", options:target.options, source_thread_id:target.external_thread_id,
        import_mode:"resume", new_session:true, request_id:uuid()});
      cacheSession(result.session); $("session-dialog").close(); libraryBusy = false;
      await selectSession(target.project.id, result.session.id);
    } catch (error) { notice(error.key || "error_request_failed"); }
    finally { libraryBusy = false; renderSession(); }
  });
  function adoptProject(next) {
    if (canLibrary) {
      if (projectKey(next) !== projectKey()) {
        $("import-dialog").close(); rememberView(); project = next;
        draftPath = next?.path || null; selectedAgent = newSessionAgent(next?.agent); setSession(null);
      } else project = next;
      return;
    }
    if (projectKey(next) !== projectKey()) {
      $("import-dialog").close();
      rememberView();
      project = next;
      selectedAgent = newSessionAgent(next?.agent);
      setSession(null);
      const view = views.get(viewKey());
      $("input").value = view?.text || "";
      $("input").setSelectionRange(view?.start || 0, view?.end || 0);
      $("agent").value = view?.agent || selectedAgent;
      updateMode();
      $("mode").value = supportsChat() && view?.mode !== "terminal" ? "chat" : "terminal";
      resizeInput();
    } else project = next;
  }
  function adoptAgent(agent) {
    if (!agent || agent === selectedAgent) return;
    if (canLibrary) { selectedAgent = agent; return; }
    rememberView(); selectedAgent = agent;
    const view = views.get(viewKey());
    $("input").value = view?.text || "";
    $("input").setSelectionRange(view?.start || 0, view?.end || 0);
    $("agent").value = agent; updateMode();
    $("mode").value = view?.mode || (supportsChat() ? "chat" : "terminal");
    resizeInput();
  }
  function resetTerminal() { term.write("", () => term.reset()); }
  function updateMode() {
    $("mode").querySelector('[value="chat"]').disabled = !supportsChat();
    if (!supportsChat()) $("mode").value = "terminal";
    $("mode-hint").textContent = t($("agent").value === "codex" && !persistentCodex ? "codex_storage_update" : supportsChat() ? "mode_hint" : "mode_terminal_hint") +
      (!session && supportsChat() && !canInitialMessage ? " " + t("new_chat_update") : "");
    pickers.sync();
  }
  function isChat() { return session?.mode === "chat"; }
  function refreshLanguage(force = false) {
    const env = environment();
    const previous = i18n.language(), previousPreference = languagePreference;
    languagePreference = env.languagePreference || env.language || "system";
    i18n.setLanguage(env.language);
    if (force || previous !== i18n.language() || previousPreference !== languagePreference) renderLanguage();
  }
  function renderLanguage() {
    i18n.apply();
    $("language").value = languagePreference;
    $("language-hint").textContent = t(languagePreference === "system" ? "language_system_hint" : "language_hint");
    renderInputPreferences();
    $("connection").textContent = t(demo ? "demo_connection" : online ? "connection_on" : instance ? "connection_off" : "connection_initial");
    $("project-name").textContent = project ? project.name : t("project_empty");
    $("project-path").textContent = project ? project.path : t("project_location");
    $("version").textContent = t("version_note", {version:environment().version || "—"});
    $("install-command").textContent = (i18n.language() === "ko" ? "BIBIMER_LANGUAGE=ko " : "") + "bash ~/storage/downloads/bibimer-setup.sh";
    renderAgents(); renderProjects(); updateEnvironment(); renderSession(); renderNotice();
    conversation.localize();
    renderFolderBrowser(); github.render();
    renderImport(true);
    setTimeout(resize, 30);
  }
  function tab(name) {
    closeUsageDetails();
    pickers.close();
    sidebar.close();
    currentTab = name;
    updateBackState();
    for (const page of ["work", "setup", "settings"]) {
      $(page).hidden = name !== page;
      $("tab-" + page).classList.toggle("selected", name === page);
      if (name === page) $("tab-" + page).setAttribute("aria-current", "page");
      else $("tab-" + page).removeAttribute("aria-current");
    }
    if (name === "work") setTimeout(resize, 30);
    else updateEnvironment();
  }
  function browserKey() {
    const ctx = fileContext();
    return [ctx.instance, ctx.project, ctx.path].join("/");
  }
  function renderBrowser() {
    const supported = canBrowser && !demo && !!native.openBrowserWindow;
    $("browser-preference").hidden = demo || !native.openBrowserWindow;
    $("browser-agent-tools").disabled = !supported || !online || paused || !project;
    $("browser-agent-tools").value = browserEnabled ? "on" : "off";
    $("browser-settings-open").disabled = !supported || !online || paused || !project;
    $("browser-open").hidden = !supported;
    $("browser-open").disabled = !online || paused || !project || switchingProject;
    pickers.sync();
    const state = browserState;
    if (!state) return;
    const valid = state.key === browserKey() && online && !paused && !switchingProject;
    const installed = environment().termuxX11Installed === true && state.installed && Object.values(state.installed).every(Boolean);
    const running = state.session && ["running", "stopping"].includes(state.session.state);
    $("browser-workspace").textContent = state.path;
    $("browser-status").textContent = t(state.busy ? "browser_starting" : state.loading ? "inspect_loading" : running ? (state.session.browser_manual !== false ? "browser_manual_status" : browserEnabled ? "browser_control_status" : "browser_tools_off") : installed ? "browser_ready" : "error_browser_setup");
    $("browser-start").disabled = !valid || !installed || state.busy || state.loading || !!running;
    $("browser-url").disabled = !valid || state.busy || !!running;
    $("browser-start").textContent = t(state.busy ? "browser_starting" : "browser_start");
    for (const [id, show] of [["browser-manual", running && state.session.browser_manual === false], ["browser-allow", running && state.session.browser_manual !== false]]) {
      $(id).hidden = !show;
      $(id).disabled = !valid || state.busy || state.loading || state.session?.state !== "running";
    }
    $("browser-view").hidden = !running;
    $("browser-view").disabled = !valid || state.session?.state !== "running";
    $("browser-refresh").disabled = !valid || state.busy || state.loading;
    $("browser-error").hidden = !state.error && valid;
    $("browser-error").textContent = t(state.error || (!valid ? "error_connection_failed" : ""));
  }
  async function browserStatus(state) {
    state.loading = true; state.error = null; renderBrowser();
    try {
      const result = await api("POST", "/v1/browser", {action:"status", project_id:state.project, worktree_path:state.path});
      if (browserState !== state || state.key !== browserKey()) return;
      state.installed = result.installed; state.session = result.session;
      browserEnabled = result.enabled !== false;
    } catch (error) { if (browserState === state) state.error = error.key || "error_request_failed"; }
    finally { if (browserState === state) { state.loading = false; renderBrowser(); } }
  }
  async function openBrowser() {
    if (!canBrowser || !online || demo || !native.openBrowserWindow) return;
    const ctx = fileContext(), key = browserKey();
    if (!ctx.project || !ctx.online) return;
    if (!browserState || browserState.key !== key) {
      browserState = {key, project:ctx.project, path:ctx.path, installed:null, session:null, error:null, payload:null, busy:false};
      $("browser-url").value = "";
    }
    if (!$("browser-dialog").open) $("browser-dialog").showModal();
    if (!browserState.busy) await browserStatus(browserState);
  }
  $("browser-settings-open").addEventListener("click", () => void openBrowser());
  for (const button of document.querySelectorAll("[data-browser-guide]")) button.addEventListener("click", () => native.openLink("https://github.com/termux/termux-x11/releases/tag/nightly"));
  $("browser-agent-tools").addEventListener("change", async () => {
    const enabled = $("browser-agent-tools").value === "on";
    $("browser-agent-tools").disabled = true;
    $("browser-preference-error").hidden = true;
    try {
      const result = await api("POST", "/v1/browser", {action:"configure", project_id:project.id, enabled});
      browserEnabled = result.enabled === true;
    } catch (error) {
      $("browser-preference-error").textContent = t(error.key || "error_request_failed");
      $("browser-preference-error").hidden = false;
    } finally { renderBrowser(); }
  });
  for (const action of ["manual", "allow"]) $("browser-" + action).addEventListener("click", async () => {
    const state = browserState;
    if (!state || state.key !== browserKey() || state.busy || !state.session) return;
    state.busy = true; state.error = null; renderBrowser();
    try {
      const result = await api("POST", "/v1/browser", {action, project_id:state.project, worktree_path:state.path, session_id:state.session.id});
      if (browserState !== state) return;
      state.session = result.session; cacheSession(result.session);
      if (action === "manual" && state.key === browserKey() && online && !paused && $("browser-dialog").open) native.openBrowserWindow(result.session.browser_tag);
    } catch (error) { if (browserState === state) state.error = error.key || "error_browser_control"; }
    finally { if (browserState === state) { state.busy = false; renderBrowser(); } }
  });
  $("browser-open").addEventListener("click", () => void openBrowser());
  $("browser-close").addEventListener("click", () => $("browser-dialog").close());
  $("browser-refresh").addEventListener("click", () => { if (browserState && !browserState.busy) void browserStatus(browserState); });
  $("browser-guide").addEventListener("click", () => native.openLink("https://github.com/termux/termux-x11/releases/tag/nightly"));
  $("browser-copy").addEventListener("click", () => native.copyText(document.querySelector(".browser-command").textContent));
  $("browser-view").addEventListener("click", () => {
    if (browserState?.key === browserKey() && online && !paused && browserState.session?.state === "running") native.openBrowserWindow(browserState.session.browser_tag);
  });
  $("browser-url").addEventListener("input", () => { if (browserState && !browserState.busy) browserState.payload = null; });
  $("browser-form").addEventListener("submit", async event => {
    event.preventDefault();
    const state = browserState;
    if (!state || $("browser-start").disabled || state.busy || state.key !== browserKey()) return;
    state.payload ||= {action:"start", project_id:state.project, worktree_path:state.path, url:$("browser-url").value.trim(), request_id:uuid()};
    state.busy = true; state.error = null; renderBrowser();
    try {
      const result = await api("POST", "/v1/browser", state.payload);
      if (browserState !== state) return;
      state.session = result.session;
      cacheSession(result.session);
      // Re-check the workspace and visible dialog after asynchronous startup.
      if (state.key === browserKey() && online && !paused && $("browser-dialog").open && result.session.state === "running") native.openBrowserWindow(result.session.browser_tag);
      await refreshSidebar();
    } catch (error) { if (browserState === state) state.error = error.key || "error_browser_start"; }
    finally { if (browserState === state) { state.busy = false; renderBrowser(); } }
  });
  function renderContextUsage() {
    const root = $("context-usage"), meter = $("context-meter");
    root.hidden = !isChat();
    if (root.hidden) root.open = false;
    const usage = session?.context_usage;
    const valid = usage && Number.isSafeInteger(usage.used_tokens) && usage.used_tokens >= 0;
    const limited = valid && Number.isSafeInteger(usage.limit_tokens) && usage.limit_tokens > 0;
    const format = value => value.toLocaleString(i18n.language());
    const remainingMode = contextDisplay === "remaining";
    meter.hidden = !limited;
    let summary = t("context_unknown"), detail = t("context_unavailable"), compact = "—";
    if (valid) {
      const used = format(usage.used_tokens);
      summary = remainingMode ? t("context_unknown") : t("context_tokens", {used});
      detail = t("context_limit_unknown");
      if (limited) {
        const percent = Math.round(usage.used_tokens / usage.limit_tokens * 100);
        summary = t("context_percent_" + contextDisplay, {used:format(percent), remaining:format(Math.max(0, 100 - percent))});
        detail = t("context_counts_" + contextDisplay, {used, limit:format(usage.limit_tokens), remaining:format(Math.max(0, usage.limit_tokens - usage.used_tokens))});
        meter.value = remainingMode ? Math.max(0, 100 - percent) : Math.min(100, percent);
        compact = (usage.estimated ? "≈" : "") + format(remainingMode ? Math.max(0, 100 - percent) : percent) + "%";
        meter.setAttribute("aria-valuetext", summary);
        root.dataset.level = percent >= 90 ? "high" : percent >= 75 ? "medium" : "normal";
      }
      if (usage.estimated && (!remainingMode || limited)) summary = "≈ " + summary;
    }
    if (!limited) { delete root.dataset.level; meter.value = 0; meter.removeAttribute("aria-valuetext"); }
    $("context-summary").textContent = summary;
    $("context-overview").textContent = summary;
    $("context-detail").textContent = detail;
    $("context-note").textContent = valid ? t(usage.estimated ? "context_estimate_note" : "context_note") +
      ((!online || session.state !== "running") ? " " + t("context_stale") : "") : "";
    const stale = !!valid && (!online || session?.state !== "running");
    root.dataset.known = String(!!limited); root.dataset.stale = String(stale);
    root.style.setProperty("--usage-progress", String(meter.value));
    $("context-compact").textContent = compact;
    const label = t("context_label") + " · " + summary + (stale ? " · " + t("context_stale") : "");
    $("context-toggle").setAttribute("aria-label", label); $("context-toggle").title = label;
  }
  function subscriptionWindowLabel(row) {
    const number = value => value.toLocaleString(i18n.language());
    const minutes = row.window_minutes;
    const kind = typeof row.kind === "string" ? row.kind : "window";
    let label = t("subscription_window");
    if (kind === "overage") label = t("subscription_extra");
    else if (minutes === 10080 || kind.startsWith("seven_day") || kind.startsWith("weekly_")) label = t("subscription_week");
    else if (Number.isInteger(minutes) && minutes > 0) {
      label = minutes % 1440 === 0 ? t("subscription_days", {count:number(minutes / 1440)}) :
        minutes % 60 === 0 ? t("subscription_hours", {count:number(minutes / 60)}) : t("subscription_minutes", {count:number(minutes)});
    }
    if (row.kind === "seven_day_opus") label += " · Opus";
    if (row.kind === "seven_day_sonnet") label += " · Sonnet";
    if (row.kind === "seven_day_overage_included") label += " · " + t("subscription_extra");
    if (typeof row.label === "string" && row.label) label += " · " + row.label;
    return label;
  }
  function renderSubscriptionUsage() {
    const root = $("subscription-usage"), meter = $("subscription-meter");
    root.hidden = !isChat();
    if (root.hidden) root.open = false;
    const report = session?.subscription_usage;
    const now = Date.now() / 1000;
    const rows = Array.isArray(report?.windows) ? report.windows.filter(row => row && typeof row.id === "string").slice(0,16) : [];
    const percent = row => typeof row.used_percent === "number" && Number.isFinite(row.used_percent) && row.used_percent >= 0 ? row.used_percent : null;
    const expired = row => Number.isFinite(row.resets_at) && row.resets_at > 0 && row.resets_at <= now;
    const outdated = row => Number.isFinite(row.updated_at) && now - row.updated_at > 300;
    const display = row => {
      const used = percent(row);
      if (expired(row)) return t("subscription_waiting");
      if (used === null) return ["allowed_warning", "rejected"].includes(row.status) ? t("subscription_status_" + row.status) : t("context_unknown");
      return t("context_percent_" + contextDisplay, {used:Math.round(used).toLocaleString(i18n.language()),
        remaining:Math.max(0, 100 - Math.round(used)).toLocaleString(i18n.language())});
    };
    const priority = row => expired(row) ? -1 : row.status === "rejected" ? 100000 : row.status === "allowed_warning" ? 10000 : percent(row) ?? -1;
    const selected = [...rows].sort((a,b) => priority(b) - priority(a))[0];
    const measured = selected && percent(selected) !== null && !expired(selected);
    const observed = rows.reduce((latest,row) => Math.max(latest, Number.isFinite(row.updated_at) ? row.updated_at : 0), 0);
    const stale = !!rows.length && (!online || session?.state !== "running" || report?.state === "stale" || (selected && outdated(selected)));
    let summary = selected ? subscriptionWindowLabel(selected) + " · " + display(selected) : t("context_unknown");
    if (rows.length > 1) summary += " · +" + (rows.length - 1).toLocaleString(i18n.language());
    if (stale) summary = t("subscription_last", {value:summary});
    $("subscription-summary").textContent = summary;
    meter.hidden = !measured;
    meter.value = measured ? Math.min(100, contextDisplay === "remaining" ? Math.max(0, 100 - percent(selected)) : percent(selected)) : 0;
    if (measured) meter.setAttribute("aria-valuetext", display(selected));
    else meter.removeAttribute("aria-valuetext");
    root.dataset.known = String(!!measured); root.dataset.stale = String(stale);
    root.style.setProperty("--usage-progress", String(meter.value));
    $("subscription-compact").textContent = measured ? (contextDisplay === "remaining" ? Math.max(0, 100 - Math.round(percent(selected))) : Math.round(percent(selected))).toLocaleString(i18n.language()) + "%" :
      selected && expired(selected) ? "↻" : selected && ["allowed_warning", "rejected"].includes(selected.status) ? "!" : "—";
    const label = t("subscription_label") + " · " + summary;
    $("subscription-toggle").setAttribute("aria-label", label); $("subscription-toggle").title = label;
    $("subscription-detail").textContent = summary;
    const level = selected && !expired(selected) ? selected.status === "rejected" ? 100 : selected.status === "allowed_warning" ? 90 : percent(selected) ?? 0 : 0;
    root.dataset.level = level >= 90 ? "high" : level >= 75 ? "medium" : "normal";
    const entries = rows.map(row => {
      const entry = document.createElement("li"), heading = document.createElement("div"), name = document.createElement("span"), value = document.createElement("strong");
      name.textContent = subscriptionWindowLabel(row);
      value.textContent = outdated(row) && !expired(row) ? t("subscription_last", {value:display(row)}) : display(row);
      heading.append(name, value); entry.append(heading);
      entry.className = "usage-window";
      const used = percent(row), known = used !== null && !expired(row);
      const risk = row.status === "rejected" ? 100 : row.status === "allowed_warning" ? 90 : used ?? 0;
      entry.dataset.level = !expired(row) && risk >= 90 ? "high" : !expired(row) && risk >= 75 ? "medium" : "normal";
      entry.dataset.stale = String(!online || session?.state !== "running" || report?.state === "stale" || outdated(row));
      const bar = document.createElement("meter");
      bar.className = "usage-meter"; bar.min = 0; bar.max = 100; bar.hidden = !known;
      bar.value = known ? Math.min(100, contextDisplay === "remaining" ? Math.max(0, 100 - used) : used) : 0;
      bar.setAttribute("aria-label", subscriptionWindowLabel(row));
      if (known) bar.setAttribute("aria-valuetext", value.textContent);
      entry.append(bar);
      const reset = document.createElement("small");
      if (expired(row)) reset.textContent = t("subscription_reset_passed");
      else if (Number.isFinite(row.resets_at) && row.resets_at > 0 && row.resets_at <= 253402300799) {
        const minutes = Math.ceil((row.resets_at - now) / 60);
        const unit = minutes >= 1440 ? "day" : minutes >= 60 ? "hour" : "minute";
        const count = unit === "day" ? Math.ceil(minutes / 1440) : unit === "hour" ? Math.ceil(minutes / 60) : minutes;
        reset.textContent = t("subscription_resets", {time:new Intl.RelativeTimeFormat(i18n.language(), {numeric:"always"}).format(count, unit)});
        reset.title = new Date(row.resets_at * 1000).toLocaleString(i18n.language());
      } else reset.textContent = t("subscription_reset_unknown");
      entry.append(reset);
      if (["allowed", "allowed_warning", "rejected"].includes(row.status)) {
        const status = document.createElement("small");status.textContent = t("subscription_status_" + row.status);entry.append(status);
      }
      return entry;
    });
    $("subscription-windows").replaceChildren(...entries);
    $("subscription-note").textContent = t(rows.length ? "subscription_note" : "subscription_unavailable") + (stale ? " " + t("subscription_stale") : "");
    $("subscription-updated").textContent = observed > 0 && observed <= 253402300799 ? t("subscription_updated", {time:new Date(observed * 1000).toLocaleString(i18n.language())}) : "";
  }
  function renderSession() {
    renderBrowser();
    renderContextUsage();
    renderSubscriptionUsage();
    worktreeCreator.render();
    renderBridgeUpdate();
    const live = session && ["running", "stopping"].includes(session.state);
    $("workspace").classList.toggle("launch-mode", !live);
    let label = t("process_idle");
    if (session) {
      if (session.state === "running") label = t("process_running");
      else if (session.state === "stopping") label = t("process_stopping");
      else if (session.state === "lost") label = t("process_lost");
      else label = t("process_exited", {code:session.exit_code});
      if (!online) label = t("process_last_seen", {state:label});
    }
    $("process").textContent = label;
    $("process").dataset.state = session ? session.state : "idle";
    $("process").className = "badge " + (session ? session.state : "");
    $("launch-controls").hidden = !!live;
    $("mode-controls").hidden = !!live;
    $("mode-hint").hidden = !!live;
    renderSettings(); renderSettings("import-");
    renderModels(); renderModels("import-");
    const agentSessions = knownProjects.find(item => item.id === projectKey())?.sessions || [];
    const choices = [...$("agent").options].map(option => {
      const owned = option.value === session?.agent ? session : agentSessions.find(item => item.agent === option.value);
      return {id:option.value, label:option.label, disabled:option.disabled && !owned,
        description:owned?.state === "running" ? t(owned.mode === "chat" ? "chat_state_" + owned.turn_state : "process_running") : ""};
    });
    const agentSignature = JSON.stringify(choices);
    if ($("quick-agent").dataset.choices !== agentSignature) {
      $("quick-agent").replaceChildren(...choices.map(row => {
        const option = new Option(row.label, row.id); option.disabled = row.disabled; option.dataset.description = row.description; return option;
      })); $("quick-agent").dataset.choices = agentSignature;
    }
    $("quick-agent").value = live ? session.agent : $("agent").value;
    $("quick-agent").disabled = !online || !project || busy || switchingProject || settingsBusy || (!!live && !canSwitchAgents);
    $("agent").disabled = $("quick-agent").disabled;
    $("launch").disabled = !online || !project || busy || switchingProject || settingsBusy;
    $("mode").disabled = !online || busy || switchingProject || settingsBusy;
    $("import-session").disabled = $("launch").disabled || !knownAgents.some(importable);
    if ($("agent").value === "codex" && $("mode").value === "chat" && !persistentCodex) $("launch").disabled = true;
    if ($("agent").value !== "shell" && !canOptions) $("launch").disabled = true;
    if (!canOptions) $("import-session").disabled = true;
    const selectedOption = $("agent").selectedOptions[0];
    if (!selectedOption || selectedOption.disabled) $("launch").disabled = true;
    $("import-update").hidden = !online || !!live || (canImport && multiImport);
    renderImport();
    $("edit-project").disabled = (!multipleProjects && !!live) || !online || switchingProject || busy;
    $("project-switch").disabled = !online || switchingProject || busy;
    $("browse-project").disabled = !online || switchingProject || busy;
    renderFolderBrowser(); github.render();
    $("project-update").hidden = !online || multipleProjects;
    const newChat = !session && supportsChat() && $("mode").value === "chat";
    const chatDisplay = isChat() || newChat;
    $("input").disabled = newChat ? !online || !project || busy || switchingProject :
      !online || !session || session.kind === "browser" || session.state !== "running" || (isChat() && !session.ready);
    $("input-form").hidden = session?.kind === "browser";
    const responding = isChat() && !["ready", "failed"].includes(session.turn_state);
    const enqueue = isChat() && canQueue && (responding || session.queued_count > 0);
    const steerable = isChat() && supportsSteer() && !!session.active_turn_id && ["running", "waiting"].includes(session.turn_state);
    $("send").textContent = t(enqueue ? "queue_send" : "send");
    $("send").disabled = $("input").disabled || settingsBusy || sending.has(session?.id) || (responding && !canQueue) ||
      (newChat && (!canInitialMessage || $("launch").disabled));
    $("steer").hidden = !steerable;
    $("steer").disabled = $("input").disabled || settingsBusy || sending.has(session?.id);
    $("delivery-warning").hidden = !isChat() || !responding || canQueue;
    $("delivery-hint").textContent = t(!canQueue ? "delivery_update" : (supportsSteer() ? "delivery_steer" : "delivery_queue") + (canBatchQueue ? "_batch" : ""));
    renderQueue(); commands.render(); renderHandoff();
    $("new-session").disabled = !online || !project || busy || switchingProject || settingsBusy || (!canLibrary && !!live);
    $("session-more").hidden = !session;
    $("session-more").disabled = !online || libraryBusy;
    $("handoff-source").hidden = !session?.handoff;
    $("handoff-source").textContent = session?.handoff ? t("handoff_from", {agent:t("agent_" + session.handoff.source_agent)}) : "";
    $("handoff-source").disabled = !online || !findSession(session?.handoff?.source_session_id);
    $("session-title").textContent = session ? sessionTitle(session) : t("session_new");
    renderWorkspaceSummary(); renderWorkspaceDetails();
    void refreshProjectWorktrees(project);
    renderSessionActions(); renderProjectSettings(); renderSidebar();
    for (const button of document.querySelectorAll("#terminal-keys [data-key]")) button.disabled = !session || $("input").disabled;
    $("terminal-empty").hidden = !!session;
    $("terminal-area").hidden = chatDisplay;
    $("terminal-keys").hidden = chatDisplay || session?.kind === "browser";
    $("chat-panel").hidden = !chatDisplay;
    $("chat-empty").textContent = t(newChat ? canInitialMessage ? "new_chat_hint" : "new_chat_update" : "chat_empty");
    $("chat-state").hidden = !isChat();
    $("chat-empty").hidden = conversation.items.size > 0;
    $("workspace").classList.toggle("chat-mode", chatDisplay);
    $("workspace").classList.toggle("has-requests", isChat() && conversation.requests.size > 0);
    $("turn-status").textContent = isChat() ? (session.state === "running" ? t("chat_state_" + session.turn_state) : label) : "";
    $("turn-status").classList.toggle("response-progress", isResponding(session));
    $("interrupt-turn").hidden = !isChat() || !["running", "waiting"].includes(session.turn_state);
    $("interrupt-turn").disabled = !online || !live;
    $("input").placeholder = t(chatDisplay ? "chat_placeholder" : "input_placeholder");
    conversation.enable(online && live);
    $("session-note").textContent = t(!online && session ? "session_unknown" :
      session && session.state === "lost" ? "session_lost_note" : session?.kind === "browser" ? "browser_running" : "session_kept");
    pickers.sync();
    inspector.update();
    fileViewer.update();
    positionUsageDetails();
  }
  $("copy-resume").addEventListener("click", () => {
    const target = findSession(actionTarget);
    if (!target?.history_persisted || target.agent !== "codex" || !target.external_thread_id) return;
    const quote = value => "'" + String(value).replace(/'/g, "'\"'\"'") + "'";
    window.Bibimer.copyText("codex resume " + quote(target.external_thread_id) + " --cd " + quote(target.project.path));
    $("session-dialog").close();
    notice("codex_resume_copied");
  });
  function setSession(value) {
    if (value?.id !== session?.id) closeUsageDetails();
    if (value) value = {...findSession(value.id), ...value};
    if (isChat() && value?.id === session.id && value.output_end < session.output_end) return;
    if (canLibrary) {
      const agent = value?.agent || selectedAgent;
      const nextKey = projectKey() + "/" + (value?.id || "new/" + agent + "/" + (draftPath || project?.path || ""));
      if (activeViewKey !== nextKey) {
        rememberView(); activeViewKey = nextKey;
        const view = views.get(nextKey);
        $("input").value = view?.text || "";
        $("input").setSelectionRange(view?.start || 0, view?.end || 0);
        $("agent").value = agent; updateMode();
        $("mode").value = view?.mode || (supportsChat() ? "chat" : "terminal"); resizeInput();
      }
    }
    if (value) adoptAgent(value.agent);
    if ((session && session.id) !== (value && value.id)) {
      cursor = 0;
      resetTerminal();
      conversation.clear();
      queued = []; queueRevision = -1; queueSignature = "";
    }
    session = value;
    const entry = knownProjects.find(item => item.id === value?.project?.id);
    if (entry && value) entry.sessions = [...(entry.sessions || []).filter(item => canLibrary ? item.id !== value.id : item.agent !== value.agent), value];
    if (value && ["running", "stopping"].includes(value.state)) {
      $("agent").value = value.agent; updateMode(); $("mode").value = value.mode || "terminal";
    }
    renderSession();
  }
  function projectForm(visible) {
    $("project-form").hidden = !visible;
    if (visible) { sidebar.open(); $("path").focus(); }
  }
  async function connect() {
    if (paused || (!environment().paired && !demo)) return;
    const ticket = ++generation;
    clearTimeout(retryTimer);
    try {
      const health = await api("GET", "/v1/health");
      if (ticket !== generation || paused) return;
      if (health.protocol !== 1) throw appError("error_protocol");
      if (instance && health.instance !== instance) {
        const lostQueue = queued.length > 0 || session?.queued_count > 0;
        setSession(null);
        modelCatalogs.clear();
        launchAttempts.clear();
        sessionTitles.clear(); titleChecks.clear();
        worktreeChecks.clear();
        for (const key of Object.keys(worktrees)) delete worktrees[key];
        notice(lostQueue ? "queue_lost" : "bridge_restarted");
      }
      instance = health.instance;
      bridgeMaintenance.setRecovery(health);
      bridgeVersion = typeof health.version === "string" ? health.version : "";
      multipleProjects = health.features?.includes("multiple_projects") === true;
      canBrowse = health.features?.includes("browse_folders") === true;
      canGitHub = health.features?.includes("github_import") === true;
      termuxHome = health.home || "~";
      canImport = health.features?.includes("import_codex_session") === true;
      multiImport = health.features?.includes("import_agent_session") === true;
      persistentCodex = health.features?.includes("persistent_codex_sessions") === true;
      canOptions = health.features?.includes("agent_options") === true;
      canLiveOptions = health.features?.includes("live_agent_options") === true;
      canHandoff = health.features?.includes("agent_handoff") === true;
      canCommands = health.features?.includes("slash_commands") === true;
      canQueue = health.features?.includes("chat_queue") === true;
      canBatchQueue = health.features?.includes("queue_batch") === true;
      canSteer = health.features?.includes("codex_steer") === true;
      canClaudeSteer = health.features?.includes("claude_steer") === true;
      canQueueSteer = health.features?.includes("queue_steer") === true;
      canModels = health.features?.includes("model_options") === true;
      canSwitchAgents = health.features?.includes("agent_sessions") === true;
      canLibrary = health.features?.includes("session_library") === true;
      canInitialMessage = health.features?.includes("initial_chat_message") === true;
      canSessionTitles = health.features?.includes("session_titles") === true;
      canWorktrees = health.features?.includes("git_worktrees") === true;
      canCreateWorktrees = health.features?.includes("worktree_creation") === true;
      canManageProjects = health.features?.includes("project_management") === true;
      canOrderProjects = health.features?.includes("project_ordering") === true;
      canDragProjects = health.features?.includes("project_drag_ordering") === true;
      canInspect = health.features?.includes("workspace_inspector") === true;
      canBrowser = health.features?.includes("browser_tools_x11") === true;
      browserEnabled = health.browser_enabled !== false;
      canOpenFiles = health.features?.includes("file_links") === true;
      canResponseNotifications = health.features?.includes("response_notifications") === true;
      if (JSON.stringify(knownAgents) !== JSON.stringify(health.agents)) {
        knownAgents = health.agents; renderAgents();
      }
      knownProjects = health.projects || [];
      if (multipleProjects && !knownProjects.some(item => item.id === selectedProjectId)) selectedProjectId = health.project?.id || knownProjects[0]?.id || null;
      const entry = multipleProjects ? knownProjects.find(item => item.id === selectedProjectId) : null;
      const nextProject = entry ? {id:entry.id, name:entry.name, path:entry.path, agent:entry.agent} : health.project;
      const selectedChanged = !projectInitialized || projectKey(nextProject) !== projectKey();
      adoptProject(nextProject);
      $("project-name").textContent = project ? project.name : t("project_empty");
      $("project-path").textContent = project ? project.path : t("project_location");
      if (selectedChanged) {
        $("path").value = project ? project.path : projectLocation.parent ? newProjectPath() : demo ? "/demo/projects/my-project" : "~/projects/my-project";
        projectPathEdited = false;
        projectForm(!project);
        projectInitialized = true;
      }
      updateMode();
      $("welcome").hidden = true;
      $("workspace").hidden = false;
      if (canSwitchAgents && entry && !canLibrary) adoptAgent(entry.agent);
      setSession(entry ? entry.session : health.session);
      renderProjects();
      connected(true);
      if (sidebar.dialog.open && canWorktrees && !worktreeLoading && knownProjects.some(row => !worktrees[row.id])) void refreshSidebar();
      native.notificationsConnected?.(canResponseNotifications);
      renderNotificationSettings();
      if (connectionError && noticeData && noticeData.key === connectionError) notice("");
      connectionError = null;
      resize();
      startPoll();
      window.BibimerOpenNotification();
    } catch (error) {
      if (ticket !== generation || paused) return;
      connected(false); connectionError = error.key || "error_request_failed"; notice(connectionError);
      if (error.status === 401) { tab("setup"); return; }
      retryTimer = setTimeout(connect, 3000);
    }
  }
  async function startPoll() {
    if (activePoll || paused || !online || switchingProject || libraryBusy) return;
    if (!session || session.state === "lost") {
      clearTimeout(retryTimer); retryTimer = setTimeout(connect, 3000); return;
    }
    activePoll = true;
    const id = session.id;
    const ticket = generation;
    try {
      const event = await api("GET", `/v1/sessions/${id}/events?cursor=${cursor}&wait=20`);
      if (ticket !== generation || paused || !session || id !== session.id) return;
      if (event.gap) {
        resetTerminal();
        conversation.clear(true);
        notice("output_gap");
      }
      if (event.items) { rememberView(); conversation.update(event); restoreQuestions(event); }
      if (event.data) {
        const bytes = Uint8Array.from(atob(event.data), c => c.charCodeAt(0));
        await new Promise(resolve => term.write(bytes, resolve));
      }
      if (ticket !== generation || paused || !session || id !== session.id) return;
      cursor = event.cursor;
      setSession(event.session);
      updateQueue(event);
      const entry = knownProjects.find(item => item.id === projectKey());
      if (entry) entry.session = event.session;
      renderProjects();
      if (session.state === "exited" && cursor >= session.output_end) {
        retryTimer = setTimeout(connect, 3000);
      } else {
        retryTimer = setTimeout(startPoll, 0);
      }
    } catch (error) {
      if (ticket !== generation || paused) return;
      connected(false); connectionError = error.key || "error_request_failed"; notice(connectionError);
      retryTimer = setTimeout(connect, 2000);
    } finally {
      activePoll = false;
      if (ticket !== generation && !paused && online) setTimeout(startPoll, 0);
    }
  }
  async function refreshCatalog() {
    if (!multipleProjects || !online || paused || busy || switchingProject || libraryBusy || catalogRequest) return;
    catalogRequest = true;
    const ticket = generation;
    try {
      const health = await api("GET", "/v1/health");
      if (ticket !== generation || paused || switchingProject) return;
      if (health.instance !== instance) { await connect(); return; }
      knownProjects = health.projects || [];
      const entry = knownProjects.find(item => item.id === selectedProjectId);
      if (entry && (entry.session?.id || null) !== (session?.id || null)) {
        ++generation;
        if (native.cancelPoll) native.cancelPoll();
      }
      if (entry) { if (canSwitchAgents && !canLibrary) adoptAgent(entry.agent); setSession(entry.session); }
      renderProjects(); startPoll(); refreshSessionTitles();
    } catch (_) { /* The session poll handles connection loss and reconnects. */ }
    finally { catalogRequest = false; }
  }
  setInterval(refreshCatalog, 5000);
  function resize() {
    if (currentTab !== "work" || $("workspace").hidden || isChat()) return;
    fit.fit();
    if (online && session && session.state === "running") {
      api("POST", `/v1/sessions/${session.id}/resize`, {
        cols:Math.max(20, Math.min(300, term.cols)), rows:Math.max(4, Math.min(200, term.rows))
      }).catch(() => {});
    }
  }
  let resizeTimer;
  new ResizeObserver(() => { clearTimeout(resizeTimer); resizeTimer = setTimeout(resize, 180); }).observe($("terminal-area"));
  function sendRaw(text) {
    if (!online || !session || session.state !== "running" || isChat() || !text) return Promise.resolve(false);
    const id = session.id;
    const bytes = new TextEncoder().encode(text);
    if (bytes.length > 16384) { notice("paste_too_large"); return Promise.resolve(false); }
    const request = {data:btoa(String.fromCharCode(...bytes)), request_id:uuid()};
    const job = inputQueue.then(async () => {
      if (!online || !session || session.id !== id) return false;
      try {
        await api("POST", `/v1/sessions/${id}/input`, request);
        return true;
      } catch (error) {
        if (session?.id === id) {
          notice(error.key || "error_request_failed", "check_delivery");
          if (!error.status) connected(false);
        }
        return false;
      }
    });
    inputQueue = job.catch(() => false);
    return job;
  }
  term.onData(sendRaw);
  function updateQueue(event) {
    if (event.session?.id !== session?.id || !Array.isArray(event.queue) || event.session.output_end < queueRevision) return;
    queued = event.queue;
    queueRevision = event.session.output_end;
    renderQueue();
  }
  function supportsSteer() {
    return session?.can_steer && (session.agent === "claude" ? canClaudeSteer : session.agent === "codex" && canSteer);
  }
  function renderQueue() {
    $("chat-queue").hidden = !isChat() || !queued.length;
    $("queue-count").textContent = t(session?.queue_paused ? "queue_paused" : "queue_count", {count:queued.length});
    $("queue-resume").hidden = !session?.queue_paused;
    $("queue-resume").disabled = !online || session?.state !== "running" || sending.has(session?.id) ||
      queued.some(entry => ["steering", "uncertain"].includes(entry.state));
    const steerable = isChat() && supportsSteer() && !!session.active_turn_id && ["running", "waiting"].includes(session.turn_state);
    const signature = JSON.stringify([session?.id, queued, online, session?.state, session?.active_turn_id, steerable, canQueueSteer, canSteer, canClaudeSteer, session?.can_steer,
      settingsBusy, switchingProject, sending.has(session?.id), i18n.language()]);
    if (signature === queueSignature) return;
    queueSignature = signature;
    const target = session?.id, turn = session?.active_turn_id;
    $("queue-list").replaceChildren(...queued.map(entry => {
      const row = document.createElement("li"), body = document.createElement("div"), text = document.createElement("p");
      row.className = "queue-entry"; row.dataset.id = entry.id;
      text.textContent = entry.text; body.append(text);
      if (entry.state !== "queued") {
        const state = document.createElement("small");
        state.textContent = t("queue_" + entry.state); body.append(state);
      }
      row.append(body);
      if (canQueueSteer && supportsSteer()) {
        const steer = document.createElement("button");
        steer.type = "button"; steer.className = "quiet"; steer.dataset.queueAction = "steer";
        steer.textContent = t("steer"); steer.title = t(steerable ? "queue_steer_hint" : "queue_steer_wait");
        steer.disabled = !online || session?.state !== "running" || !steerable || !["queued", "failed"].includes(entry.state) ||
          settingsBusy || switchingProject || sending.has(target);
        steer.addEventListener("click", () => changeQueue(target, "steer", entry.id, turn));
        row.append(steer);
      }
      const remove = document.createElement("button");
      remove.type = "button"; remove.className = "quiet"; remove.textContent = t("queue_remove");
      remove.dataset.queueAction = "remove";
      remove.disabled = !online || session?.state !== "running" || ["sending", "steering"].includes(entry.state) || sending.has(target);
      remove.addEventListener("click", () => changeQueue(target, "remove", entry.id));
      row.append(remove); return row;
    }));
  }
  async function changeQueue(id, action, entryId, turn) {
    if (!id || sending.has(id)) return;
    sending.add(id); renderSession();
    try {
      const result = await api("POST", `/v1/sessions/${id}/queue`, {action, ...(entryId ? {entry_id:entryId} : {}),
        ...(action === "steer" ? {turn_id:turn} : {}), request_id:uuid()});
      if (session?.id === id) {
        setSession(result.session); updateQueue(result);
        if (["error_queue_steer_rejected", "error_steer_unavailable", "error_queue_entry", "error_input_uncertain"].includes(noticeData?.key)) notice("");
      }
    } catch (error) { if (session?.id === id) notice(error.key || "error_request_failed"); }
    finally { sending.delete(id); renderSession(); }
  }
  $("queue-resume").addEventListener("click", () => changeQueue(session?.id, "resume"));
  $("input-form").addEventListener("submit", event => { event.preventDefault(); submitInput(false); });
  $("steer").addEventListener("click", () => submitInput(true));
  async function submitInput(steer) {
    const text = $("input").value;
    if (!text.trim() || sending.has(session?.id) || $(steer ? "steer" : "send").disabled) return;
    if (steer && $("steer").hidden) return;
    if (!session) { if (!steer) await launchSession(text); return; }
    const id = session.id, key = viewKey();
    const turn = session.active_turn_id;
    rememberView();
    sending.add(id); renderSession();
    let ok = false;
    const chat = isChat();
    try {
      const invocation = demo ? {} : await commands.invocation(text);
      if (chat) {
        const action = steer ? "steer" : canQueue ? "queue" : "message";
        const result = await api("POST", `/v1/sessions/${id}/${action}`, {text, ...invocation, request_id:uuid(),
          ...(steer ? {turn_id:turn} : canQueue ? {action:"add"} : {})});
        if (session?.id === id) { setSession(result.session); updateQueue(result); }
        ok = true;
      } else if (session?.id === id) ok = await sendRaw((invocation.terminalText || text).replace(/\r?\n/g, "\r") + "\r");
      if (ok && views.get(key)?.text === text) Object.assign(views.get(key), {text:"", start:0, end:0});
      if (ok && key === viewKey() && $("input").value === text) $("input").value = "";
      if (ok && session?.id === id && ["error_steer_rejected", "error_steer_unavailable", "error_queue_full", "error_input_uncertain"].includes(noticeData?.key)) notice("");
    } catch (error) {
      if (session?.id === id) notice(error.key || "error_request_failed",
        !error.key || ["error_chat_transport", "error_input_uncertain", "error_connection_failed", "error_timeout"].includes(error.key) ? "check_delivery" : null);
    }
    finally { sending.delete(id); resizeInput(); renderSession(); }
  }
  function resizeInput() {
    const input = $("input");
    input.style.height = "auto";
    // A wrapping placeholder must not increase the empty, one-row input height.
    if (input.value) input.style.height = Math.min(parseFloat(getComputedStyle(input).maxHeight) || 100, input.scrollHeight) + "px";
  }
  let composerWidth = 0;
  new ResizeObserver(entries => {
    const width = entries[0].contentRect.width;
    if (width !== composerWidth) { composerWidth = width; resizeInput(); }
  }).observe($("input-form"));
  matchMedia("(min-width:700px) and (min-height:650px)").addEventListener("change", resizeInput);
  $("input").addEventListener("input", () => { resizeInput(); rememberView(); });
  let composing = false;
  $("input").addEventListener("compositionstart", () => { composing = true; });
  $("input").addEventListener("compositionend", () => { composing = false; });
  $("input").addEventListener("keydown", event => {
    if (event.isComposing || composing || event.keyCode === 229) return;
    if (commands.keydown(event) || event.key !== "Enter") return;
    event.preventDefault();
    const send = enterBehavior === "newline" ? event.ctrlKey : !event.ctrlKey;
    if (!send || event.shiftKey || event.metaKey || event.altKey) {
      const input = $("input");
      input.setRangeText("\n", input.selectionStart, input.selectionEnd, "end");
      input.dispatchEvent(new Event("input", {bubbles:true}));
    } else if (!event.repeat) {
      $("input-form").requestSubmit();
    }
  });
  $("delivery-help").addEventListener("click", () => {
    if (!isChat() || $("delivery-help-dialog").open) return;
    $("delivery-help-dialog").showModal();
    $("delivery-help").setAttribute("aria-expanded", "true");
    $("delivery-help-close").focus();
  });
  $("delivery-help-close").addEventListener("click", () => $("delivery-help-dialog").close());
  $("delivery-help-dialog").addEventListener("close", () => $("delivery-help").setAttribute("aria-expanded", "false"));
  $("interrupt-turn").addEventListener("click", async () => {
    if (!isChat() || !online) return;
    try { await api("POST", `/v1/sessions/${session.id}/interrupt`); }
    catch (error) { notice(error.key || "error_request_failed"); }
  });
  function openHandoff(id, agent) {
    const source = findSession(id);
    if (!source || source.mode !== "chat" || handoff?.busy) return;
    const agents = knownAgents.filter(row => row.id !== source.agent && row.installed && row.available !== false && row.modes?.includes("chat"));
    $("handoff-agent").replaceChildren(...agents.map(row => new Option(t("agent_" + row.id), row.id)));
    if (agents.some(row => row.id === agent)) $("handoff-agent").value = agent;
    handoff = {id, source, target:$("handoff-agent").value, loading:false, busy:false, preview:null, error:null};
    handoff.options = savedOptions(handoff.target);
    $("handoff-context").value = "";
    $("handoff-instruction").value = session?.id === id ? $("input").value : "";
    $("handoff-context-details").open = false;
    $("session-dialog").close(); renderHandoff();
    if (!$("handoff-dialog").open) $("handoff-dialog").showModal();
    void loadHandoff();
  }
  async function loadHandoff() {
    const state = handoff;
    if (!state || state.busy || state.loading || state.uncertain) return;
    if (!canHandoff) { state.error = "handoff_update"; renderHandoff(); return; }
    state.loading = true; state.error = null; state.preview = null; state.attempt = null; renderHandoff();
    try {
      const preview = await api("POST", `/v1/sessions/${state.id}/handoff`, {action:"preview"});
      if (handoff !== state) return;
      state.preview = preview; $("handoff-context").value = preview.context;
    } catch (error) { if (handoff === state) state.error = error.key || "error_request_failed"; }
    finally { if (handoff === state) { state.loading = false; renderHandoff(); } }
  }
  function renderHandoff() {
    if (!handoff) return;
    const state = handoff, locked = state.busy || state.uncertain;
    $("handoff-path").textContent = state.source.project.path;
    const options = state.options;
    $("handoff-options").textContent = t("handoff_settings") + " " + [t("permission_" + options.permission),
      options.model || t("model_default"), options.effort, state.target === "codex" ? t(options.fast ? "fast_on" : "fast_off") : ""].filter(Boolean).join(" · ");
    $("handoff-summary").textContent = state.loading ? t("handoff_loading") : state.preview ?
      t(state.preview.truncated ? "handoff_partial" : "handoff_count", {count:state.preview.message_count}) : "";
    $("handoff-error").textContent = state.error ? t(state.error) : ""; $("handoff-error").hidden = !state.error;
    $("handoff-agent").disabled = locked;
    $("handoff-context").disabled = locked || state.loading || !state.preview;
    $("handoff-instruction").disabled = locked;
    $("handoff-close").disabled = state.busy;
    $("handoff-refresh").disabled = locked || state.loading || !online || !canHandoff;
    $("handoff-existing").textContent = t("handoff_existing", {agent:t("agent_" + state.target)});
    $("handoff-existing").disabled = state.busy || !online || !state.target;
    const bytes = value => new TextEncoder().encode(value).length;
    $("handoff-send").disabled = !online || state.busy || state.loading || !state.preview || !state.target ||
      !$("handoff-context").value.trim() || bytes($("handoff-context").value) > 12000 ||
      !$("handoff-instruction").value.trim() || bytes($("handoff-instruction").value) > 4000;
    $("handoff-send").textContent = t(state.uncertain ? "handoff_retry" : "handoff_send");
    pickers.sync();
  }
  $("handoff-agent").addEventListener("change", () => {
    if (!handoff || handoff.busy || handoff.uncertain) return;
    handoff.target = $("handoff-agent").value; handoff.options = savedOptions(handoff.target); handoff.attempt = null; renderHandoff();
  });
  for (const id of ["handoff-context", "handoff-instruction"]) $(id).addEventListener("input", () => {
    if (handoff && !handoff.uncertain) handoff.attempt = null;
    renderHandoff();
  });
  $("handoff-refresh").addEventListener("click", loadHandoff);
  $("handoff-close").addEventListener("click", () => { if (!handoff?.busy) $("handoff-dialog").close(); });
  $("handoff-dialog").addEventListener("cancel", event => { if (handoff?.busy) event.preventDefault(); });
  $("handoff-dialog").addEventListener("close", () => { if (!handoff?.busy) handoff = null; });
  $("handoff-existing").addEventListener("click", async () => {
    if (!handoff || handoff.busy) return;
    const state = handoff; $("handoff-dialog").close();
    if (projectKey() !== state.source.project.id) await changeProject({project_id:state.source.project.id});
    await changeAgent(state.target, true);
  });
  $("session-handoff").addEventListener("click", () => openHandoff(actionTarget));
  $("handoff-source").addEventListener("click", () => {
    const source = findSession(session?.handoff?.source_session_id);
    if (source) void selectSession(source.project.id, source.id);
  });
  $("handoff-send").addEventListener("click", async () => {
    const state = handoff;
    if (!state || $("handoff-send").disabled) return;
    if (!state.attempt) state.attempt = {action:"start", agent:state.target, options:{...state.options},
      context:$("handoff-context").value, instruction:$("handoff-instruction").value,
      revision:state.preview.revision, request_id:uuid()};
    state.busy = true; state.error = null; renderHandoff();
    try {
      const result = await api("POST", `/v1/sessions/${state.id}/handoff`, state.attempt);
      cacheSession(result.session); state.busy = false; $("handoff-dialog").close();
      await selectSession(state.source.project.id, result.session.id);
    } catch (error) {
      if (handoff === state) {
        state.uncertain = !error.status || error.status >= 500;
        state.error = state.uncertain ? "handoff_uncertain" : error.key || "error_request_failed";
        if (!state.uncertain) state.attempt = null;
      }
    } finally { state.busy = false; renderHandoff(); renderSession(); }
  });

  async function changeAgent(agent, openExisting = false) {
    if (!session && canLibrary && !openExisting) {
      await selectSession(projectKey(), null, draftPath || project?.path, agent); return;
    }
    if (!openExisting && session?.mode === "chat" && agent !== session.agent && ["codex", "claude", "opencode"].includes(agent)) {
      if (busy || switchingProject || settingsBusy) { renderSession(); return; }
      openHandoff(session.id, agent); renderSession(); return;
    }
    if (busy || switchingProject || settingsBusy) { $("agent").value = selectedAgent; renderSession(); return; }
    if (!canSwitchAgents) {
      $("agent").value = agent; selectedAgent = agent;
      updateMode(); $("mode").value = supportsChat() ? "chat" : "terminal";
      rememberView(); renderSession(); return;
    }
    $("agent").value = selectedAgent;
    switchingProject = true; ++generation; clearTimeout(retryTimer); renderSession();
    native.cancelPoll?.();
    try {
      const key = projectKey();
      const result = await api("POST", "/v1/project-agent", {project_id:key, agent});
      if (canLibrary) rememberView();
      adoptAgent(agent); setSession(result.session);
      const entry = knownProjects.find(item => item.id === key);
      if (entry) { entry.agent = agent; entry.session = result.session; }
      notice(""); resize();
    } catch (error) { notice(error.key || "error_request_failed"); }
    finally { switchingProject = false; renderSession(); renderProjects(); startPoll(); }
  }
  $("agent").addEventListener("change", () => changeAgent($("agent").value));
  $("quick-agent").addEventListener("change", () => changeAgent($("quick-agent").value));
  $("mode").addEventListener("change", () => { rememberView(); renderSession(); });
  function renderFolderBrowser() {
    $("folder-path").textContent = folderPath;
    $("folder-home").disabled = !online;
    $("folder-hidden").disabled = !online;
    $("folder-select").disabled = !online || folderLoading || !!folderError || !folderListing?.writable;
    $("folder-more").hidden = !folderListing?.next || !!folderError;
    $("folder-more").disabled = !online || folderLoading;
    $("folder-retry").hidden = !folderError;
    $("folder-retry").disabled = !online || folderLoading;
    for (const button of $("folder-entries").querySelectorAll("button")) button.disabled = !online || folderLoading;
    $("folder-up").hidden = !folderListing?.parent;
    $("folder-up").disabled = !online || folderLoading || !folderListing?.parent;
    $("folder-up").title = folderListing?.parent || "";
    for (const button of $("folder-entries").querySelectorAll(".folder-pick")) {
      button.textContent = t("folder_pick");
      button.setAttribute("aria-label", t("folder_pick_named", {name:button.dataset.name}));
    }
    const status = folderError || (folderLoading ? "folder_loading" :
      folderListing && !folderListing.writable ? "folder_readonly" :
      folderListing && !folderListing.entries.length ? "folder_empty" : null);
    $("folder-status").textContent = status ? t(status) : "";
    $("folder-status").hidden = !status;
    $("folder-entries").setAttribute("aria-busy", String(folderLoading));
  }
  async function loadFolders(path, more = false, fallbackHome = false) {
    const ticket = ++folderTicket;
    const after = more ? folderListing?.next : null;
    folderLoading = true; folderError = null; folderPath = path;
    if (!more) { folderListing = null; $("folder-entries").replaceChildren($("folder-up")); }
    renderFolderBrowser();
    try {
      const result = await api("POST", "/v1/folders", {path, hidden:$("folder-hidden").checked, ...(after ? {after} : {})});
      if (ticket !== folderTicket || !$("folder-dialog").open) return;
      folderListing = {...result, entries:more ? [...folderListing.entries, ...result.entries] : result.entries};
      folderPath = result.path;
      for (const entry of result.entries) {
        const row = document.createElement("div"); row.className = "folder-row";
        const button = document.createElement("button");
        button.type = "button"; button.className = "folder-entry";
        const icon = document.createElement("span");
        icon.setAttribute("aria-hidden", "true"); icon.textContent = "▸ ";
        const name = document.createElement("span"); name.textContent = entry.name;
        button.append(icon, name);
        button.dir = "auto";
        button.addEventListener("click", () => loadFolders(entry.path));
        const select = document.createElement("button");
        select.type = "button"; select.className = "folder-pick";
        select.dataset.name = entry.name; select.title = entry.path;
        select.addEventListener("click", () => selectListedFolder(entry.path));
        row.append(button, select);
        $("folder-entries").append(row);
      }
      if (!more) $("folder-entries").scrollTop = 0;
    } catch (error) {
      if (ticket !== folderTicket || !$("folder-dialog").open) return;
      if (fallbackHome && error.key === "error_folder_access" && path !== "~") return loadFolders("~");
      folderError = error.status === 404 ? "browse_update" : error.key || "error_folder_access";
    } finally {
      if (ticket === folderTicket) { folderLoading = false; renderFolderBrowser(); }
    }
  }
  function openFolderBrowser(path, callback = null) {
    if (!canBrowse) { notice("browse_update"); tab("setup"); return; }
    folderSelection = callback;
    document.activeElement?.blur();
    $("folder-dialog").showModal();
    loadFolders(path.trim() || "~", false, true);
  }
  $("path").addEventListener("input", () => { projectPathEdited = true; });
  $("browse-project").addEventListener("click", () => openFolderBrowser(projectPathEdited ? $("path").value : projectLocation.folder || $("path").value));
  $("folder-home").addEventListener("click", () => loadFolders("~"));
  $("folder-up").addEventListener("click", () => { if (folderListing?.parent) loadFolders(folderListing.parent); });
  $("folder-hidden").addEventListener("change", () => loadFolders(folderPath));
  $("folder-more").addEventListener("click", () => loadFolders(folderPath, true));
  $("folder-retry").addEventListener("click", () => loadFolders(folderPath));
  $("folder-cancel").addEventListener("click", () => $("folder-dialog").close());
  $("folder-dialog").addEventListener("close", () => { ++folderTicket; folderLoading = false; folderSelection = null; });
  function selectFolder(path) {
    rememberProjectLocation(path, !!folderSelection);
    if (folderSelection) { const callback = folderSelection; folderSelection = null; $("folder-dialog").close(); callback(path); return; }
    $("path").value = path;
    $("create-folder").checked = false;
    $("folder-dialog").close();
    $("project-form").querySelector("button[type=submit]").focus();
  }
  async function selectListedFolder(path) {
    if (!online || folderLoading || !$("folder-dialog").open) return;
    const ticket = ++folderTicket;
    folderLoading = true; folderError = null; renderFolderBrowser();
    try {
      // Validate access and resolve links without navigating into the folder.
      const result = await api("POST", "/v1/folders", {path});
      if (ticket !== folderTicket || !$("folder-dialog").open || !online) return;
      if (!result.writable) { folderError = "folder_readonly"; return; }
      selectFolder(result.path);
    } catch (error) {
      if (ticket !== folderTicket || !$("folder-dialog").open) return;
      folderError = error.status === 404 ? "browse_update" : error.key || "error_folder_access";
    } finally {
      if (ticket === folderTicket) { folderLoading = false; renderFolderBrowser(); }
    }
  }
  $("folder-select").addEventListener("click", () => {
    if ($("folder-select").disabled || !folderListing) return;
    selectFolder(folderListing.path);
  });
  async function changeProject(data, rememberLocation = false) {
    if (switchingProject) return;
    switchingProject = true; ++generation; clearTimeout(retryTimer); renderSession();
    if (native.cancelPoll) native.cancelPoll();
    try {
      const result = await api("POST", "/v1/project", data);
      if (rememberLocation) rememberProjectLocation(result.project.path);
      selectedProjectId = result.project.id || null;
      projectInitialized = false;
      notice(""); await connect();
      return true;
    } catch (error) { notice(error.key || "error_request_failed"); }
    finally { switchingProject = false; renderSession(); renderProjects(); startPoll(); }
  }
  $("project-switch").addEventListener("change", () => {
    const id = $("project-switch").value;
    $("project-switch").blur();
    changeProject({project_id:id});
  });
  $("project-switch").addEventListener("blur", renderProjects);
  $("project-form").addEventListener("submit", async event => {
    event.preventDefault();
    if (await changeProject({path:$("path").value, create:$("create-folder").checked, add:multipleProjects}, true)) { projectForm(false); sidebar.close(); tab("work"); await refreshSidebar(); }
  });
  function renderImport(rebuild = false) {
    if (!$("import-dialog").open) return;
    const disabled = importLoading || busy;
    $("import-agent").disabled = disabled;
    $("import-search").disabled = disabled;
    $("import-refresh").disabled = disabled || !online;
    $("import-mode").disabled = busy;
    $("import-cancel").disabled = busy;
    $("import-confirm").disabled = disabled || !online || !importSelection || importProject !== projectKey();
    $("import-confirm").textContent = t(busy ? "import_starting" : "import_selected");
    $("import-more").hidden = !importCursor;
    $("import-more").disabled = disabled || !online;
    pickers.sync();
    $("import-status").textContent = t(importError || (importLoading ? "import_loading" :
      importEntries.length ? "import_count" : importSearch ? "import_no_results" : "import_empty"), {count:importEntries.length});
    if (rebuild) {
      $("import-entries").replaceChildren(...importEntries.map(entry => {
        const button = document.createElement("button");
        button.type = "button"; button.className = "import-entry"; button.dataset.id = entry.id;
        const title = document.createElement("strong");
        title.textContent = entry.title || t("import_untitled"); title.dir = "auto";
        const detail = document.createElement("small");
        const date = Number.isFinite(entry.updated_at) ? new Date(entry.updated_at * 1000) : null;
        detail.textContent = [date && !Number.isNaN(date.getTime()) ? date.toLocaleString(i18n.language() === "en" ? "en-US" : i18n.language(), {dateStyle:"medium",timeStyle:"short"}) : "", entry.id.slice(0,8)].filter(Boolean).join(" · ");
        button.append(title, detail);
        button.addEventListener("click", () => { importSelection = entry.id; renderImport(); });
        return button;
      }));
    }
    for (const button of $("import-entries").children) {
      button.disabled = disabled;
      button.setAttribute("aria-pressed", String(button.dataset.id === importSelection));
    }
  }
  async function loadImports(more = false) {
    if (importLoading || busy || !online) return;
    const ticket = ++importTicket, target = importProject;
    if (!more) {
      importEntries = []; importSelection = null; importCursor = null;
      importSearch = $("import-search").value.trim();
    }
    importLoading = true; importError = null; renderImport(!more);
    try {
      const result = await api("POST", "/v1/session-history", {agent:$("import-agent").value, project_id:target, ...(canWorktrees ? {worktree_path:importPath} : {}), search:importSearch, cursor:more ? importCursor : null});
      if (ticket !== importTicket || !$("import-dialog").open || projectKey() !== target) return;
      const entries = new Map(importEntries.map(entry => [entry.id, entry]));
      for (const entry of result.sessions) entries.set(entry.id, entry);
      importEntries = [...entries.values()]; importCursor = result.next_cursor;
    } catch (error) {
      if (ticket !== importTicket || !$("import-dialog").open) return;
      importError = error.key || "error_history";
    } finally {
      if (ticket === importTicket) { importLoading = false; renderImport(true); }
    }
  }
  $("import-session").addEventListener("click", () => {
    if ($("import-session").disabled) return;
    importProject = projectKey(); importEntries = []; importSelection = null; importCursor = null; importError = null;
    importPath = session?.project?.path || draftPath || project.path;
    $("import-agent").replaceChildren(...knownAgents.filter(agent => ["codex","claude","opencode"].includes(agent.id)).map(agent => {
      const option = new Option(t("agent_" + agent.id), agent.id);
      option.disabled = !importable(agent); return option;
    }));
    $("import-agent").value = knownAgents.find(agent => agent.id === $("agent").value && importable(agent))?.id || knownAgents.find(importable)?.id || "codex";
    $("import-search").value = ""; $("import-mode").value = "resume";
    $("import-project").textContent = importPath;
    renderSettings("import-"); $("import-dialog").showModal(); loadImports();
  });
  $("import-search-form").addEventListener("submit", event => { event.preventDefault(); loadImports(); });
  $("import-agent").addEventListener("change", () => { $("import-search").value = ""; renderSettings("import-"); loadImports(); });
  $("import-more").addEventListener("click", () => loadImports(true));
  $("import-cancel").addEventListener("click", () => $("import-dialog").close());
  $("import-dialog").addEventListener("close", () => { ++importTicket; importLoading = false; });
  $("import-confirm").addEventListener("click", async () => {
    if ($("import-confirm").disabled) return;
    const key = importProject;
    busy = true; renderSession(); notice("");
    try {
      const agent = $("import-agent").value;
      const data = await api("POST", "/v1/sessions", {agent, mode:"chat", project_id:key,
        ...(canLibrary ? {new_session:true, worktree_path:importPath} : {}),
        options:savedOptions(agent),
        source_thread_id:importSelection, import_mode:$("import-mode").value, request_id:uuid()});
      $("import-dialog").close();
      if (projectKey() === key) {
        $("agent").value = agent; updateMode(); $("mode").value = "chat";
        ++generation; setSession(data.session); resize(); startPoll();
      }
    } catch (error) {
      importError = error.key || "error_import_failed";
      notice(importError); await connect();
    } finally { busy = false; renderSession(); }
  });
  async function launchSession(initialText = null) {
    if (busy || $("launch").disabled || (initialText !== null && (!canInitialMessage || session || $("mode").value !== "chat"))) return;
    const key = viewKey(), sourceProject = projectKey(), sourceInstance = instance;
    rememberView(); busy = true; ++generation; clearTimeout(retryTimer); native.cancelPoll?.(); notice("");
    let attempt = launchAttempts.get(key);
    function accepted(value) {
      if (instance !== sourceInstance) return;
      launchAttempts.delete(key);
      if (initialText !== null && views.get(key)?.text === initialText) Object.assign(views.get(key), {text:"", start:0, end:0});
      cacheSession(value);
      if (projectKey() === sourceProject && (viewKey() === key || session?.id === value.id)) {
        ++generation; setSession(value); resize(); startPoll();
      }
    }
    try {
      const invoking = initialText !== null && !demo ? commands.invocation(initialText) : Promise.resolve({});
      renderSession();
      const invocation = await invoking;
      if (instance !== sourceInstance || viewKey() !== key || paused) return;
      const payload = {agent:$("agent").value, mode:$("mode").value,
        ...(canLibrary ? {new_session:true, worktree_path:draftPath || project.path} : {}),
        ...(canOptions ? {options:{...savedOptions($("agent").value),
          ...(canModels && $("agent").value === "opencode" && $("mode").value === "terminal" ? {effort:""} : {})}} : {}),
        ...(multipleProjects ? {project_id:selectedProjectId} : {}),
        ...(initialText !== null ? {initial_message:{text:initialText, ...invocation}} : {})};
      const signature = JSON.stringify([sourceInstance, payload]);
      if (attempt && attempt.signature !== signature) { notice("error_input_uncertain", "check_delivery"); return; }
      if (!attempt) {
        attempt = {signature, payload:{...payload, cols:Math.max(20, term.cols), rows:Math.max(4, term.rows), request_id:uuid()}};
        launchAttempts.set(key, attempt);
      }
      const data = await api("POST", "/v1/sessions", attempt.payload);
      accepted(data.session);
    } catch (error) {
      if (error.status && error.status < 500) launchAttempts.delete(key);
      notice(error.key || "error_request_failed", !error.status || error.status >= 500 ? "check_delivery" : null);
      if (attempt && (!error.status || error.status >= 500)) {
        try {
          const health = await api("GET", "/v1/health");
          const value = health.projects?.flatMap(row => row.sessions || []).find(row => row.launch_id === attempt.payload.request_id);
          if (health.instance === sourceInstance && value) { accepted(value); notice(""); }
        } catch (_) { /* Keep the draft and request ID for an explicit retry. */ }
      }
    } finally { busy = false; resizeInput(); renderSession(); startPoll(); }
  }
  $("launch").addEventListener("click", () => launchSession());
  $("pair-form").addEventListener("submit", async event => {
    event.preventDefault();
    if (demo || paused || online || $("pair").disabled) return;
    const code = $("pair-code").value.trim();
    if (!/^[0-9]{8}$/.test(code)) { notice("pairing_digits"); return; }
    $("pair").disabled = true;
    try {
      await api("POST", "/v1/pair", {code});
      $("pair-code").value = ""; notice(""); tab("work"); await connect();
    } catch (error) { notice(error.key || "error_request_failed"); }
    finally { updateEnvironment(); }
  });
  $("stop").addEventListener("click", () => { stopTarget = actionTarget; $("stop-dialog").showModal(); });
  $("cancel-stop").addEventListener("click", () => $("stop-dialog").close());
  $("confirm-stop").addEventListener("click", async () => {
    $("stop-dialog").close();
    $("session-dialog").close();
    const id = stopTarget; stopTarget = null;
    if (!id) return;
    try {
      const data = await api("POST", `/v1/sessions/${id}/stop`);
      cacheSession(data.session);
      if (session?.id === id) setSession(data.session);
      renderSessionActions(); renderSidebar();
    } catch (error) { if (session?.id === id) notice(error.key || "error_request_failed"); }
  });
  $("forget").addEventListener("click", () => {
    ++generation; clearTimeout(retryTimer); native.forget(); github.reset();
    connected(false); $("workspace").hidden = true; $("welcome").hidden = false;
    setSession(null); instance = null; projectInitialized = false; updateEnvironment();
    views.clear(); launchAttempts.clear(); modelCatalogs.clear(); selectedAgent = "shell"; selectedProjectId = null; knownProjects = []; $("input").value = "";
    sessionTitles.clear(); titleChecks.clear();
    for (const key of Object.keys(worktrees)) delete worktrees[key];
    worktreeChecks.clear(); workspaceDetails = null;
    activeViewKey = null; draftPath = null; sidebar.close(); $("session-dialog").close();
    notice("connection_forgotten");
  });
  for (const name of ["work", "setup", "settings"]) $("tab-" + name).addEventListener("click", () => tab(name));
  $("go-setup").addEventListener("click", () => tab("setup"));
  for (const id of ["demo-settings-exit", "demo-exit-banner"]) $(id).addEventListener("click", () => {
    ++generation; paused = true; clearTimeout(retryTimer); native.cancelPoll?.(); native.setDemoMode?.(false);
  });
  $("review-access-open").addEventListener("click", () => {
    if (demo || currentTab !== "settings") return;
    $("review-access-code").value = ""; $("review-access-status").textContent = "";
    $("review-access-dialog").showModal(); $("review-access-code").focus();
  });
  $("review-access-cancel").addEventListener("click", () => $("review-access-dialog").close());
  $("review-access-dialog").addEventListener("close", () => {
    $("review-access-code").value = ""; $("review-access-status").textContent = "";
    if (!demo && !paused) $("review-access-open").focus({preventScroll:true});
  });
  $("review-access-form").addEventListener("submit", event => {
    event.preventDefault();
    if (demo || currentTab !== "settings") return;
    if (!environment().reviewAccessConfigured) { $("review-access-status").textContent = t("review_access_unavailable"); $("review-access-code").value = ""; return; }
    if (!keepNormalDraftViews()) { $("review-access-status").textContent = t("demo_drafts_failed"); $("review-access-code").value = ""; return; }
    let accepted = false;
    try { accepted = native.enterReviewDemo?.($("review-access-code").value.trim()) === true; } catch (_) { }
    $("review-access-code").value = "";
    if (!accepted) { $("review-access-status").textContent = t("review_access_invalid"); $("review-access-code").focus(); return; }
    ++generation; paused = true; clearTimeout(retryTimer); native.cancelPoll?.(); $("review-access-dialog").close();
  });
  window.BibimerReviewEntryFailed = () => {
    paused = false; notice("review_access_invalid"); if (environment().paired) connect();
  };
  $("edit-project").addEventListener("click", () => {
    const visible = $("project-form").hidden;
    if (visible && multipleProjects) { $("path").value = newProjectPath(); projectPathEdited = false; $("create-folder").checked = true; }
    projectForm(visible);
  });
  $("cancel-project").addEventListener("click", () => { projectForm(false); $("edit-project").focus(); });
  $("project-update").addEventListener("click", () => tab("setup"));
  for (const id of ["reconnect", "reconnect-welcome"]) $(id).addEventListener("click", () => { notice(""); connect(); });
  $("open-termux").addEventListener("click", () => native.openTermux());
  $("setup-open-termux").addEventListener("click", () => native.openTermux());
  $("setup-open-work").addEventListener("click", () => tab("work"));
  $("quick-open-termux").addEventListener("click", () => native.openTermux());
  $("quick-app-permissions").addEventListener("click", () => native.openAppPermissions?.());
  $("quick-connect").addEventListener("click", async () => {
    if (paused || online || quickSubmitting || $("quick-connect").disabled) return;
    quickSubmitting = true; renderQuickSetup();
    try {
      // An existing connection needs no RUN_COMMAND permission or new pairing.
      // Probe even when the last UI status was offline (e.g. returning from DeX).
      if (environment().paired) {
        let reachable = false;
        try {
          const health = await api("GET", "/v1/health");
          if (health.protocol !== 1) { notice("error_protocol"); return; }
          reachable = true;
        } catch (_) { /* A stopped bridge or expired pairing needs setup below. */ }
        if (paused || !environment().paired) return;
        if (reachable) { notice(""); tab("work"); await connect(); return; }
      }
      if (!paused) native.startQuickSetup();
    }
    catch (_) { notice("quick_start_failed"); }
    finally { setTimeout(() => { quickSubmitting = false; updateEnvironment(); }, 500); }
  });
  $("export-installer").addEventListener("click", () => native.exportInstaller());
  for (const button of document.querySelectorAll("[data-guide]")) button.addEventListener("click", () => native.openGuide(button.dataset.guide));
  for (const button of document.querySelectorAll("[data-command]")) button.addEventListener("click", () => native.copyCommand(button.dataset.command));
  for (const button of document.querySelectorAll("[data-agent-copy]")) button.addEventListener("click", () => native.copyText($(button.dataset.agentCopy).textContent));
  window.BibimerAgentActionStatus = (agent, code) => {
    if (demo || !["codex", "claude", "opencode", "gemini", "browser"].includes(agent) || !["agent_action_sent", "quick_permission", "quick_termux_missing", "quick_termux_old", "quick_start_failed"].includes(code)) return;
    if (agent === "opencode" && code === "agent_action_sent") code = "agent_opencode_action_sent";
    if (agent === "browser" && code === "agent_action_sent") code = "browser_install_sent";
    const status = $("agent-action-status-" + agent);
    status.dataset.i18n = code; status.textContent = t(code); status.hidden = false;
  };
  for (const button of document.querySelectorAll("[data-agent-action]")) button.addEventListener("click", () => {
    if (demo || paused || button.disabled) return;
    try {
      if (!native.startAgentAction) throw new Error();
      native.startAgentAction(button.dataset.agent, button.dataset.agentAction);
    } catch (_) { window.BibimerAgentActionStatus(button.dataset.agent, "quick_start_failed"); }
  });
  const keys = {escape:"\x1b", tab:"\t", up:"\x1b[A", down:"\x1b[B", interrupt:"\x03", enter:"\r"};
  for (const button of document.querySelectorAll("#terminal-keys [data-key]")) button.addEventListener("click", () => sendRaw(keys[button.dataset.key]));
  window.BibimerPause = () => { pickers.close(); paused = true; ++generation; clearTimeout(retryTimer); clearTimeout(quickTimer); inspector.update(); };
  $("language").addEventListener("change", () => {
    try {
      if (!native.setLanguage($("language").value)) throw new Error();
      refreshLanguage(true);
    } catch (_) {
      $("language").value = languagePreference;
      pickers.sync();
      notice("language_save_failed");
    }
  });
  function renderNotificationSettings() {
    const env = environment(), settings = env.notifications;
    $("response-notifications").checked = settings?.enabled !== false;
    $("response-notifications").disabled = !native.setResponseNotifications;
    let key = !settings ? "notifications_app_update" : !settings.enabled ? "notifications_off" :
      !env.paired && !demo ? "notifications_connect" : !online ? "notifications_reconnecting" :
      !canResponseNotifications ? "notifications_update" : !settings.allowed ? "notifications_permission" :
      "notifications_" + ({listening:"listening", reconnecting:"reconnecting", failed:"failed", unsupported:"update", unpaired:"connect"}[settings.state] || "stopped");
    $("notifications-status").textContent = t(key);
    $("notification-permission").hidden = !settings?.enabled || settings.allowed || !native.openNotificationSettings;
  }
  $("response-notifications").addEventListener("change", () => {
    native.setResponseNotifications?.($("response-notifications").checked);
    renderNotificationSettings();
  });
  $("notification-permission").addEventListener("click", () => native.openNotificationSettings?.());
  window.BibimerNotificationStatus = renderNotificationSettings;
  function renderAppUpdates() {
    const env = environment(), status = env.appUpdate || {}, supported = !demo && !!native.checkAppUpdate;
    $("app-update-card").hidden = !supported;
    $("app-update-banner").hidden = !supported || status.state !== "available" || status.showNotice !== true;
    $("app-update-version").textContent = t("app_update_version", {version:env.version || "—"});
    const key = {checking:"app_update_checking", available:"app_update_available", current:"app_update_current",
      failed:"app_update_failed", store_failed:"app_update_store_failed", unavailable:"app_update_unavailable"}[status.state];
    $("app-update-status").textContent = key ? t(key) : "";
    $("app-update-check").disabled = !supported || status.state === "checking";
  }
  function compareBridgeVersions(current, bundled) {
    const parse = value => typeof value === "string" && /^\d{1,6}\.\d{1,6}\.\d{1,6}$/.test(value) ? value.split(".").map(Number) : null;
    const a = parse(current), b = parse(bundled);
    if (!a || !b) return null;
    for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
    return 0;
  }
  let maintenancePhase = "", maintenanceRefresh = "", maintenanceRequestedUntil = 0;
  function canMaintainBridge(action) {
    const env=environment(), phase=native.bridgeMaintenanceStatus?.();
    return !demo && !!native.maintainBridge && env.paired && ["update","restart"].includes(action) &&
      phase!=="bridge_maintenance_running" && !bridgeMaintenance.recovering && Date.now()>=maintenanceRequestedUntil &&
      (action!=="update" || !online || compareBridgeVersions(bridgeVersion,env.bundledBridgeVersion)===null || compareBridgeVersions(bridgeVersion,env.bundledBridgeVersion)<0);
  }
  function runBridgeMaintenance(action, recovery=null) {
    if(paused || !canMaintainBridge(action))return;
    maintenanceRequestedUntil=Date.now()+1000;
    if(recovery && native.maintainBridgeWithRecovery)native.maintainBridgeWithRecovery(action,JSON.stringify(recovery));
    else native.maintainBridge(action);
    renderBridgeUpdate();setTimeout(renderBridgeUpdate,1100);
  }
  function renderBridgeUpdate() {
    const bundled = environment().bundledBridgeVersion;
    $("bridge-update-card").hidden = demo || !bundled;
    const comparison = online ? compareBridgeVersions(bridgeVersion, bundled) : null;
    $("bridge-update-version").textContent = bundled ? t("bridge_update_version", {current:online && bridgeVersion || "—", bundled}) : "";
    $("bridge-update-status").textContent = t(comparison === null ? "bridge_update_unknown" : comparison < 0 ? "bridge_update_available" : "bridge_update_current");
    const supported = !demo && !!native.maintainBridge;
    const phase = !demo && native.bridgeMaintenanceStatus ? native.bridgeMaintenanceStatus() : "";
    const allowed = ["bridge_maintenance_running", "bridge_maintenance_done", "bridge_maintenance_busy", "bridge_maintenance_failed", "quick_permission", "quick_termux_missing", "quick_termux_old", "quick_start_failed", "quick_external"];
    maintenancePhase = allowed.includes(phase) ? phase : "";
    const active = online ? (knownProjects.reduce((count, item) => count + (item.sessions || []).filter(row => ["running", "stopping"].includes(row.state)).length, 0) ||
      (session && ["running", "stopping"].includes(session.state) ? 1 : 0)) : 0;
    $("bridge-maintenance-status").textContent = maintenancePhase === "bridge_maintenance_running" ? t(maintenancePhase) : active ? t("bridge_maintenance_active", {count:active}) : maintenancePhase ? t(maintenancePhase) : "";
    $("bridge-update-install").hidden = $("bridge-restart").hidden = !supported;
    $("bridge-update-install").textContent=t(active?"bridge_maintenance_end_update":"bridge_maintenance_update");
    $("bridge-restart").textContent=t(active?"bridge_maintenance_end_restart":"bridge_maintenance_restart");
    $("bridge-update-install").disabled = bridgeMaintenance.busy || !canMaintainBridge("update");
    $("bridge-restart").disabled = bridgeMaintenance.busy || !canMaintainBridge("restart");
    bridgeMaintenance.render();
    bridgeMaintenance.renderRecovery?.();
    if($("settings").hidden===false)void bridgeMaintenance.pollRecovery?.();
    $("bridge-update-guide").hidden = supported || comparison === null || comparison >= 0;
    if (maintenancePhase === "bridge_maintenance_done" && maintenanceRefresh !== maintenancePhase) {
      maintenanceRefresh = maintenancePhase;
      if (!paused && environment().paired) setTimeout(connect, 0);
    } else if (maintenancePhase !== "bridge_maintenance_done") maintenanceRefresh = "";
  }
  $("app-update-check").addEventListener("click", () => { if (!demo) { native.checkAppUpdate?.(); renderAppUpdates(); } });
  $("app-update-later").addEventListener("click", () => { if (!demo) { native.dismissAppUpdate?.(); renderAppUpdates(); } });
  for (const id of ["app-update-open", "app-update-store"]) $(id).addEventListener("click", () => { if (!demo) native.openAppStore?.(); });
  for (const [id, action] of [["bridge-update-install", "update"], ["bridge-restart", "restart"]]) {
    $(id).addEventListener("click", () => {
      if (demo || paused || $(id).disabled || !native.maintainBridge) return;
      void bridgeMaintenance.open(action);
    });
  }
  $("bridge-update-guide").addEventListener("click", () => { if (!demo) tab("setup"); });
  window.BibimerAppUpdateStatus = renderAppUpdates;
  setInterval(() => { if (!paused && currentTab === "settings") { renderNotificationSettings(); renderBridgeUpdate(); } }, 2000);
  function notificationSession(entry, id) {
    const original = entry?.sessions?.find(row => row.id === id);
    if (!original || ["running", "stopping"].includes(original.state) || original.mode !== "chat" || !original.external_thread_id || !original.project?.path) return original;
    // Bridge restarts/resumes create a new execution ID for the same native conversation.
    // Copies, other agents/worktrees, and ambiguous matches must never redirect a tap.
    const resumed = entry.sessions.filter(row => ["running", "stopping"].includes(row.state) &&
      row.mode === "chat" && row.agent === original.agent && row.project?.path === original.project.path &&
      row.external_thread_id === original.external_thread_id);
    return resumed.length === 1 ? resumed[0] : original;
  }
  window.BibimerOpenNotification = async () => {
    clearTimeout(notificationRetry);
    if (notificationNavigating || paused || !online || !native.takeNotificationTarget) return;
    if (busy || switchingProject || settingsBusy || libraryBusy) {
      notificationRetry = setTimeout(window.BibimerOpenNotification, 500); return;
    }
    try { pendingNotification ||= JSON.parse(native.takeNotificationTarget()); } catch (_) { return; }
    const target = pendingNotification;
    if (!target?.project_id || !target?.session_id) { pendingNotification = null; return; }
    notificationNavigating = true;
    try {
      const health = await api("GET", "/v1/health");
      if (paused || busy || switchingProject || settingsBusy || libraryBusy) return;
      if (health.instance !== instance) { await connect(); return; }
      const entry = health.projects?.find(row => row.id === target.project_id);
      const destination = notificationSession(entry, target.session_id);
      pendingNotification = null;
      if (!destination) { notice("notifications_missing"); return; }
      knownProjects = health.projects;
      for (const dialog of document.querySelectorAll("dialog[open]")) dialog.close();
      await selectSession(target.project_id, destination.id);
    } catch (error) { pendingNotification = null; notice(error.key || "error_request_failed"); }
    finally { notificationNavigating = false; notificationRetry = setTimeout(window.BibimerOpenNotification, 500); }
  };
  function renderInputPreferences() {
    $("enter-behavior").value = enterBehavior;
    $("enter-behavior-hint").textContent = t("enter_" + enterBehavior + "_hint");
    $("input").setAttribute("enterkeyhint", enterBehavior === "send" ? "send" : "enter");
    $("context-display").value = contextDisplay;
    $("context-display").disabled = !native.setContextDisplay;
    $("context-display-hint").textContent = t("context_display_" + contextDisplay + "_hint");
    pickers.sync();
  }
  $("enter-behavior").addEventListener("change", () => {
    const value = $("enter-behavior").value;
    try {
      if (!["newline", "send"].includes(value) || !native.setEnterBehavior(value)) throw new Error();
      enterBehavior = value;
      if (noticeData?.key === "enter_save_failed") notice("");
    } catch (_) { notice("enter_save_failed"); }
    renderInputPreferences();
  });
  $("context-display").addEventListener("change", () => {
    const value = $("context-display").value;
    try {
      if (!["used", "remaining"].includes(value) || !native.setContextDisplay?.(value)) throw new Error();
      contextDisplay = value;
      if (noticeData?.key === "context_display_save_failed") notice("");
    } catch (_) { notice("context_display_save_failed"); }
    renderInputPreferences(); renderContextUsage(); renderSubscriptionUsage();
  });
  function positionUsageDetails() {
    if (!document.querySelector(".context-usage[open]")) return;
    const anchor = $("input-form").getBoundingClientRect().top;
    const row = $("agent-settings").getBoundingClientRect().top;
    const room = Math.max(48, anchor - $("workspace").getBoundingClientRect().top - 12);
    for (const id of ["context-usage", "subscription-usage"]) {
      $(id).style.setProperty("--usage-input-offset", Math.max(0, row - anchor) + "px");
      $(id).style.setProperty("--usage-room", room + "px");
    }
  }
  function closeUsageDetails() {
    $("context-usage").open = false; $("subscription-usage").open = false;
  }
  for (const id of ["context-usage", "subscription-usage"]) $(id).addEventListener("toggle", () => {
    if ($(id).open) $(id === "context-usage" ? "subscription-usage" : "context-usage").open = false;
    positionUsageDetails();
  });
  document.addEventListener("pointerdown", event => {
    if (!event.target.closest?.(".usage-indicators")) closeUsageDetails();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && document.querySelector(".context-usage[open]") && !document.querySelector("dialog[open]")) {
      closeUsageDetails(); event.preventDefault(); event.stopPropagation();
    }
  });
  window.BibimerRefreshLanguage = () => refreshLanguage();
  window.BibimerResume = () => {
    paused = false;
    const env = environment();
    enterBehavior = env.enterBehavior === "send" ? "send" : "newline";
    contextDisplay = env.contextDisplay === "remaining" ? "remaining" : "used";
    refreshLanguage(true); connect();
  };
  window.BibimerBack = () => {
    const dialogs = [...document.querySelectorAll("dialog[open]:not(.docked)")];
    if (dialogs.length) {
      if ((dialogs[dialogs.length - 1].id === "handoff-dialog" && handoff?.busy) ||
          (dialogs[dialogs.length - 1].id === "bridge-maintenance-dialog" && bridgeMaintenance.stopping)) return true;
      dialogs[dialogs.length - 1].close(); return true;
    }
    if (document.querySelector(".context-usage[open]")) { closeUsageDetails(); return true; }
    if (!$("commands").hidden && currentTab === "work") { commands.dismiss(); return true; }
    if (currentTab !== "work") { tab("work"); return true; }
    return false;
  };
  function updateBackState() { native.setBackHandling?.(currentTab !== "work" || !$("commands").hidden || !!document.querySelector("dialog[open]:not(.docked), .context-usage[open]")); }
  const backObserver = new MutationObserver(updateBackState);
  backObserver.observe($("commands"), {attributes:true, attributeFilter:["hidden"]});
  for (const dialog of document.querySelectorAll("dialog")) backObserver.observe(dialog, {attributes:true, attributeFilter:["open"]});
  for (const id of ["context-usage", "subscription-usage"]) backObserver.observe($(id), {attributes:true, attributeFilter:["open"]});
  const usageObserver = new ResizeObserver(positionUsageDetails);
  for (const id of ["workspace", "input-form", "agent-settings"]) usageObserver.observe($(id));
  window.visualViewport?.addEventListener("resize", positionUsageDetails);
  refreshLanguage(true);
  if (environment().paired || demo) connect();
})();
