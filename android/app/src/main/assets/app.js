"use strict";
(() => {
  const $ = id => document.getElementById(id);
  const native = window.Bibimer;
  const i18n = window.BibimerI18n;
  const t = i18n.t;
  const pending = new Map();
  let serial = 0, online = false, paused = false, session = null, cursor = 0;
  let instance = null, activePoll = false, retryTimer = null, generation = 0, busy = false;
  let project = null, inputQueue = Promise.resolve(), currentTab = "work";
  let quickTimer = null, quickHandled = environment().quickSetup?.phase === "connected" ? environment().quickSetup.id : null, quickSubmitting = false;
  let projectInitialized = false, connectionError = null;
  let noticeData = null, knownAgents = [];
  const sending = new Set(), views = new Map();
  let knownProjects = [], selectedProjectId = null, multipleProjects = false, switchingProject = false;
  let stopTarget = null, catalogRequest = false;
  let canBrowse = false, folderListing = null, folderPath = "~", folderLoading = false;
  let folderTicket = 0, folderError = null;
  let canImport = false, multiImport = false, persistentCodex = false, importProject = null, importEntries = [], importSelection = null;
  let importCursor = null, importSearch = "", importTicket = 0, importLoading = false, importError = null;
  let canOptions = false, canLiveOptions = false, settingsBusy = false, pendingOptions = null;
  let canQueue = false, canSteer = false, canQueueSteer = false, queued = [], queueRevision = -1, queueSignature = "";
  let canModels = false, canSwitchAgents = false, selectedAgent = "shell";
  let canLibrary = false, canWorktrees = false, activeViewKey = null, draftPath = null, importPath = null;
  let actionTarget = null, deleteTarget = null, libraryBusy = false, worktreeLoading = false, worktreeError = null;
  let canResponseNotifications = false, notificationNavigating = false, notificationRetry, pendingNotification;
  let canManageProjects = false, projectActionTarget = null, projectDeleteTarget = null, projectActionError = null;
  const worktrees = {};
  const modelCatalogs = new Map();
  const sessionTitles = new Map(), titleChecks = new Map();
  let canSessionTitles = false, titleLoading = false;
  const lastOptions = environment().agentOptions || {};
  let enterBehavior = environment().enterBehavior === "send" ? "send" : "newline";
  const permissionModes = {codex:["inherit","read-only","workspace-write","yolo"],
    claude:["inherit","default","acceptEdits","plan","bypassPermissions"], opencode:["inherit","ask","allow"]};
  const pickers = new BibimerSelect(t, {
    description: (select, option) => select.id.includes("permission") ? t("permission_hint_" + option.value) :
      select.id === "project-switch" ? knownProjects.find(item => item.id === option.value)?.path || "" :
      select.id === "enter-behavior" ? t("enter_" + option.value + "_hint") : option.dataset.description || "",
    context: select => ["language", "enter-behavior"].includes(select.id) ? "app" :
      select.id === "project-switch" ? "projects/" + projectKey() :
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
    import:async (id, path) => { await newSession(id, path); if (projectKey() === id) $("import-session").click(); },
    project:async id => { await changeProject({project_id:id}); sidebar.close(); tab("work"); },
    session:selectSession, create:newSession
  });

  function environment() {
    try { return JSON.parse(native.environment()); }
    catch (_) { return {paired:false, termuxInstalled:false}; }
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
      }, 35000);
      pending.set(id, {resolve, reject, timeout});
      try { native.request(id, method, path, JSON.stringify(data)); }
      catch (_) {
        clearTimeout(timeout); pending.delete(id);
        reject(appError("error_android_required"));
      }
    });
  }
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
    $("connection").textContent = t(value ? "connection_on" : "connection_off");
    $("connection").className = "badge" + (value ? " connected" : "");
    renderSession();
  }
  function updateEnvironment() {
    renderNotificationSettings();
    const env = environment();
    $("termux-status").textContent = t(env.termuxInstalled ? "installed" : "install_needed");
    $("termux-status").className = "badge" + (env.termuxInstalled ? " connected" : "");
    $("reconnect-welcome").hidden = !env.paired;
    renderQuickSetup(env);
  }
  function renderQuickSetup(env = environment()) {
    const supported = typeof native.startQuickSetup === "function";
    $("quick-setup").hidden = !supported;
    if (!supported) { $("manual-setup").open = true; return; }
    const setup = env.quickSetup || {phase:"idle"}, waiting = ["running", "connecting"].includes(setup.phase);
    const phase = !env.termuxInstalled ? "quick_termux_missing" : setup.phase.startsWith("quick_") ? setup.phase : "quick_" + setup.phase;
    $("quick-status").textContent = t(i18n.has(phase) ? phase : "quick_start_failed");
    $("quick-connect").disabled = !env.termuxInstalled || waiting || quickSubmitting;
    $("quick-connect").setAttribute("aria-busy", String(waiting || quickSubmitting));
    if (["quick_external", "quick_permission"].includes(setup.phase)) $("quick-permissions").open = true;
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
    for (const agent of knownAgents.length ? knownAgents : [{id:"shell", installed:true}]) {
      const option = document.createElement("option");
      option.value = agent.id;
      option.textContent = t("agent_" + agent.id) + (!agent.installed ? t("install_required_suffix") : agent.available === false ? t("repair_required_suffix") : "");
      option.disabled = !agent.installed || agent.available === false;
      $("agent").append(option);
    }
    if ([...$("agent").options].some(option => option.value === selected && !option.disabled)) $("agent").value = selected;
    updateMode();
    $("agent-diagnostics").replaceChildren(...knownAgents.filter(agent => agent.id !== "shell").map(agent => {
      const row = document.createElement("p"); row.className = "hint";
      row.textContent = t("agent_" + agent.id) + " · " + t(!agent.installed ? "install_needed" : agent.issue || "installed");
      return row;
    }));
  }
  function importable(agent) {
    const owned = agent.id === session?.agent ? session : knownProjects.find(item => item.id === projectKey())?.sessions?.find(item => item.agent === agent.id);
    return canImport && (multiImport || agent.id === "codex") && agent.installed && agent.available !== false && agent.modes?.includes("chat") &&
      (canLibrary || !canSwitchAgents || !owned || !["running", "stopping"].includes(owned.state));
  }
  function supportsChat() { return !!knownAgents.find(agent => agent.id === $("agent").value)?.modes?.includes("chat"); }
  function projectKey(value = project) { return value?.id || value?.path || null; }
  function viewKey() { return canLibrary ? activeViewKey : canSwitchAgents ? projectKey() + "/" + selectedAgent : projectKey(); }
  function rememberView() {
    const key = viewKey();
    if (!projectKey()) return;
    const questions = {...views.get(key)?.questions};
    for (const [id, request] of conversation.requests) {
      questions[id] = Object.fromEntries([...request.fields].map(([name,input]) => [name,{value:input.value,selections:input.bibimerSelections || []}]));
    }
    views.set(key, {text:$("input").value, start:$("input").selectionStart, end:$("input").selectionEnd,
      agent:selectedAgent, mode:$("mode").value, questions});
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
    $("edit-project").textContent = t(multipleProjects ? "add_project" : "edit_project");
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
    if (value.display_title || sessionTitles.get(value.id)) return value.display_title || sessionTitles.get(value.id);
    const date = new Date(value.started_at * 1000);
    return t("agent_" + value.agent) + " · " + (Number.isNaN(date.getTime()) ? value.id.slice(0,8) :
      date.toLocaleString(i18n.language() === "ko" ? "ko-KR" : "en-US", {month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})) + " · " + value.id.slice(0,4);
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
      worktrees, online, library:canLibrary, disabled:!online || busy || switchingProject || settingsBusy || libraryBusy,
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
        const result = await api("POST", "/v1/worktrees", {project_id:entry.id});
        if (sourceInstance !== instance) return;
        worktrees[entry.id] = result.worktrees;
      }
    } catch (error) { worktreeError = error.key || "error_request_failed"; }
    finally { worktreeLoading = false; renderSidebar(); }
  }
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
  async function selectSession(projectId, id, path = null) {
    if (!online || busy || switchingProject || settingsBusy || libraryBusy) return;
    if (!canLibrary) { await changeProject({project_id:projectId}); sidebar.close(); tab("work"); return; }
    switchingProject = true; ++generation; clearTimeout(retryTimer); native.cancelPoll?.(); renderSession();
    try {
      const entry = knownProjects.find(row => row.id === projectId);
      const agent = projectId === projectKey() ? selectedAgent : entry?.agent || "shell";
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
    if (!canManageProjects || !online || libraryBusy || busy || switchingProject) return;
    libraryBusy = true; projectActionError = null;
    ++generation; clearTimeout(retryTimer); native.cancelPoll?.(); renderSession();
    try {
      const result = await api("POST", "/v1/project/manage", {project_id:id, action, ...(name !== undefined ? {name} : {})});
      if (result.project) {
        knownProjects = knownProjects.map(row => row.id === id ? {...row, ...result.project} : row);
        if (projectKey() === id) project = {...project, ...result.project};
      } else {
        knownProjects = knownProjects.filter(row => row.id !== id);
        delete worktrees[id]; modelCatalogs.clear();
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
        draftPath = next?.path || null; selectedAgent = next?.agent || "shell"; setSession(null);
      } else project = next;
      return;
    }
    if (projectKey(next) !== projectKey()) {
      $("import-dialog").close();
      rememberView();
      project = next;
      selectedAgent = next?.agent || "shell";
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
    $("mode-hint").textContent = t($("agent").value === "codex" && !persistentCodex ? "codex_storage_update" : supportsChat() ? "mode_hint" : "mode_terminal_hint");
    pickers.sync();
  }
  function isChat() { return session?.mode === "chat"; }
  function renderLanguage() {
    i18n.apply();
    $("language").value = i18n.language();
    renderInputPreferences();
    $("connection").textContent = t(online ? "connection_on" : instance ? "connection_off" : "connection_initial");
    $("project-name").textContent = project ? project.name : t("project_empty");
    $("project-path").textContent = project ? project.path : t("project_location");
    $("version").textContent = t("version_note", {version:environment().version || "—"});
    $("install-command").textContent = (i18n.language() === "ko" ? "BIBIMER_LANGUAGE=ko " : "") + "bash ~/storage/downloads/bibimer-setup.sh";
    renderAgents(); renderProjects(); updateEnvironment(); renderSession(); renderNotice();
    conversation.localize();
    renderFolderBrowser();
    renderImport(true);
    setTimeout(resize, 30);
  }
  function tab(name) {
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
  function renderSession() {
    const live = session && ["running", "stopping"].includes(session.state);
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
    $("launch").disabled = !online || !project || busy || switchingProject;
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
    renderFolderBrowser();
    $("project-update").hidden = !online || multipleProjects;
    $("input").disabled = !online || !session || session.state !== "running" || (isChat() && !session.ready);
    const responding = isChat() && !["ready", "failed"].includes(session.turn_state);
    const enqueue = isChat() && canQueue && (responding || session.queued_count > 0);
    const steerable = isChat() && canSteer && session.can_steer && !!session.active_turn_id && ["running", "waiting"].includes(session.turn_state);
    $("send").textContent = t(enqueue ? "queue_send" : "send");
    $("send").disabled = $("input").disabled || settingsBusy || sending.has(session?.id) || (responding && !canQueue);
    $("steer").hidden = !steerable;
    $("steer").disabled = $("input").disabled || settingsBusy || sending.has(session?.id);
    $("delivery-hint").hidden = !isChat() || !responding;
    $("delivery-hint").textContent = t(!canQueue ? "delivery_update" : steerable ? "delivery_steer" : "delivery_queue");
    renderQueue();
    $("new-session").disabled = !online || !project || busy || switchingProject || settingsBusy || (!canLibrary && !!live);
    $("session-more").hidden = !session;
    $("session-more").disabled = !online || libraryBusy;
    $("session-title").textContent = session ? sessionTitle(session) : t("session_new");
    $("project-path").textContent = session?.project?.path || draftPath || project?.path || t("project_location");
    renderSessionActions(); renderProjectSettings(); renderSidebar();
    for (const button of document.querySelectorAll("#terminal-keys [data-key]")) button.disabled = $("input").disabled;
    $("terminal-empty").hidden = !!session;
    $("terminal-area").hidden = isChat();
    $("terminal-keys").hidden = isChat();
    $("chat-panel").hidden = !isChat();
    $("chat-state").hidden = !isChat();
    $("chat-empty").hidden = conversation.items.size > 0;
    $("workspace").classList.toggle("chat-mode", isChat());
    $("workspace").classList.toggle("has-requests", isChat() && conversation.requests.size > 0);
    $("turn-status").textContent = isChat() ? (session.state === "running" ? t("chat_state_" + session.turn_state) : label) : "";
    $("turn-status").classList.toggle("response-progress", isResponding(session));
    $("interrupt-turn").hidden = !isChat() || !["running", "waiting"].includes(session.turn_state);
    $("interrupt-turn").disabled = !online || !live;
    $("input").placeholder = t(isChat() ? "chat_placeholder" : "input_placeholder");
    conversation.enable(online && live);
    $("session-note").textContent = t(!online && session ? "session_unknown" :
      session && session.state === "lost" ? "session_lost_note" : "session_kept");
    pickers.sync();
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
    if (paused || !environment().paired) return;
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
        sessionTitles.clear(); titleChecks.clear();
        notice(lostQueue ? "queue_lost" : "bridge_restarted");
      }
      instance = health.instance;
      multipleProjects = health.features?.includes("multiple_projects") === true;
      canBrowse = health.features?.includes("browse_folders") === true;
      canImport = health.features?.includes("import_codex_session") === true;
      multiImport = health.features?.includes("import_agent_session") === true;
      persistentCodex = health.features?.includes("persistent_codex_sessions") === true;
      canOptions = health.features?.includes("agent_options") === true;
      canLiveOptions = health.features?.includes("live_agent_options") === true;
      canQueue = health.features?.includes("chat_queue") === true;
      canSteer = health.features?.includes("codex_steer") === true;
      canQueueSteer = health.features?.includes("queue_steer") === true;
      canModels = health.features?.includes("model_options") === true;
      canSwitchAgents = health.features?.includes("agent_sessions") === true;
      canLibrary = health.features?.includes("session_library") === true;
      canSessionTitles = health.features?.includes("session_titles") === true;
      canWorktrees = health.features?.includes("git_worktrees") === true;
      canManageProjects = health.features?.includes("project_management") === true;
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
        $("path").value = project ? project.path : "~/projects/my-project";
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
    if (!multipleProjects || !online || paused || switchingProject || libraryBusy || catalogRequest) return;
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
  function renderQueue() {
    $("chat-queue").hidden = !isChat() || !queued.length;
    $("queue-count").textContent = t(session?.queue_paused ? "queue_paused" : "queue_count", {count:queued.length});
    $("queue-resume").hidden = !session?.queue_paused;
    $("queue-resume").disabled = !online || session?.state !== "running" || sending.has(session?.id) ||
      queued.some(entry => ["steering", "uncertain"].includes(entry.state));
    const steerable = isChat() && canSteer && session.can_steer && !!session.active_turn_id && ["running", "waiting"].includes(session.turn_state);
    const signature = JSON.stringify([session?.id, queued, online, session?.state, session?.active_turn_id, steerable, canQueueSteer, canSteer, session?.can_steer,
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
      if (canQueueSteer && canSteer && session?.can_steer) {
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
    const id = session.id, key = viewKey();
    const turn = session.active_turn_id;
    rememberView();
    sending.add(id); renderSession();
    let ok = false;
    try {
      if (isChat()) {
        const action = steer ? "steer" : canQueue ? "queue" : "message";
        const result = await api("POST", `/v1/sessions/${id}/${action}`, {text, request_id:uuid(),
          ...(steer ? {turn_id:turn} : canQueue ? {action:"add"} : {})});
        if (session?.id === id) { setSession(result.session); updateQueue(result); }
        ok = true;
      } else ok = await sendRaw(text.replace(/\r?\n/g, "\r") + "\r");
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
    $("input").style.height = "auto";
    $("input").style.height = Math.min(100, $("input").scrollHeight) + "px";
  }
  $("input").addEventListener("input", () => { resizeInput(); rememberView(); });
  let composing = false;
  $("input").addEventListener("compositionstart", () => { composing = true; });
  $("input").addEventListener("compositionend", () => { composing = false; });
  $("input").addEventListener("keydown", event => {
    if (event.key !== "Enter" || event.isComposing || composing || event.keyCode === 229) return;
    event.preventDefault();
    if (enterBehavior === "newline" || event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) {
      const input = $("input");
      input.setRangeText("\n", input.selectionStart, input.selectionEnd, "end");
      input.dispatchEvent(new Event("input", {bubbles:true}));
    } else if (!event.repeat) {
      $("input-form").requestSubmit();
    }
  });
  $("interrupt-turn").addEventListener("click", async () => {
    if (!isChat() || !online) return;
    try { await api("POST", `/v1/sessions/${session.id}/interrupt`); }
    catch (error) { notice(error.key || "error_request_failed"); }
  });
  async function changeAgent(agent) {
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
    $("folder-up").disabled = !online || folderLoading || !folderListing?.parent;
    $("folder-hidden").disabled = !online;
    $("folder-select").disabled = !online || folderLoading || !!folderError || !folderListing?.writable;
    $("folder-more").hidden = !folderListing?.next || !!folderError;
    $("folder-more").disabled = !online || folderLoading;
    $("folder-retry").hidden = !folderError;
    $("folder-retry").disabled = !online || folderLoading;
    for (const button of $("folder-entries").children) button.disabled = !online || folderLoading;
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
    if (!more) { folderListing = null; $("folder-entries").replaceChildren(); }
    renderFolderBrowser();
    try {
      const result = await api("POST", "/v1/folders", {path, hidden:$("folder-hidden").checked, ...(after ? {after} : {})});
      if (ticket !== folderTicket || !$("folder-dialog").open) return;
      folderListing = {...result, entries:more ? [...folderListing.entries, ...result.entries] : result.entries};
      folderPath = result.path;
      for (const entry of result.entries) {
        const button = document.createElement("button");
        button.type = "button"; button.className = "folder-entry";
        const icon = document.createElement("span");
        icon.setAttribute("aria-hidden", "true"); icon.textContent = "▸ ";
        const name = document.createElement("span"); name.textContent = entry.name;
        button.append(icon, name);
        button.dir = "auto";
        button.addEventListener("click", () => loadFolders(entry.path));
        $("folder-entries").append(button);
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
  $("browse-project").addEventListener("click", () => {
    if (!canBrowse) { notice("browse_update"); tab("setup"); return; }
    $("path").blur();
    $("folder-dialog").showModal();
    // Fall back to Home if the add form names a folder not yet created.
    loadFolders($("path").value.trim() || "~", false, true);
  });
  $("folder-home").addEventListener("click", () => loadFolders("~"));
  $("folder-up").addEventListener("click", () => { if (folderListing?.parent) loadFolders(folderListing.parent); });
  $("folder-hidden").addEventListener("change", () => loadFolders(folderPath));
  $("folder-more").addEventListener("click", () => loadFolders(folderPath, true));
  $("folder-retry").addEventListener("click", () => loadFolders(folderPath));
  $("folder-cancel").addEventListener("click", () => $("folder-dialog").close());
  $("folder-dialog").addEventListener("close", () => { ++folderTicket; folderLoading = false; });
  $("folder-select").addEventListener("click", () => {
    if ($("folder-select").disabled || !folderListing) return;
    $("path").value = folderListing.path;
    $("create-folder").checked = false;
    $("folder-dialog").close();
    $("project-form").querySelector("button[type=submit]").focus();
  });
  async function changeProject(data) {
    if (switchingProject) return;
    switchingProject = true; ++generation; clearTimeout(retryTimer); renderSession();
    if (native.cancelPoll) native.cancelPoll();
    try {
      const result = await api("POST", "/v1/project", data);
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
    if (await changeProject({path:$("path").value, create:$("create-folder").checked, add:multipleProjects})) { projectForm(false); sidebar.close(); await refreshSidebar(); }
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
        detail.textContent = [date && !Number.isNaN(date.getTime()) ? date.toLocaleString(i18n.language() === "ko" ? "ko-KR" : "en-US", {dateStyle:"medium",timeStyle:"short"}) : "", entry.id.slice(0,8)].filter(Boolean).join(" · ");
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
  $("launch").addEventListener("click", async () => {
    if (busy) return;
    const key = projectKey();
    busy = true; renderSession(); notice("");
    try {
      const data = await api("POST", "/v1/sessions", {agent:$("agent").value, mode:$("mode").value,
        ...(canLibrary ? {new_session:true, worktree_path:draftPath || project.path} : {}),
        ...(canOptions ? {options:{...savedOptions($("agent").value),
          ...(canModels && $("agent").value === "opencode" && $("mode").value === "terminal" ? {effort:""} : {})}} : {}),
        ...(multipleProjects ? {project_id:selectedProjectId} : {}),
        cols:Math.max(20, term.cols), rows:Math.max(4, term.rows), request_id:uuid()});
      if (projectKey() === key) { ++generation; setSession(data.session); resize(); startPoll(); }
    } catch (error) { notice(error.key || "error_request_failed"); await connect(); }
    finally { busy = false; renderSession(); }
  });
  $("pair-form").addEventListener("submit", async event => {
    event.preventDefault();
    const code = $("pair-code").value.trim();
    if (!/^[0-9]{8}$/.test(code)) { notice("pairing_digits"); return; }
    $("pair").disabled = true;
    try {
      await api("POST", "/v1/pair", {code});
      $("pair-code").value = ""; notice(""); tab("work"); await connect();
    } catch (error) { notice(error.key || "error_request_failed"); }
    finally { $("pair").disabled = false; }
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
    ++generation; clearTimeout(retryTimer); native.forget();
    connected(false); $("workspace").hidden = true; $("welcome").hidden = false;
    setSession(null); instance = null; projectInitialized = false; updateEnvironment();
    views.clear(); modelCatalogs.clear(); selectedAgent = "shell"; selectedProjectId = null; knownProjects = []; $("input").value = "";
    sessionTitles.clear(); titleChecks.clear();
    for (const key of Object.keys(worktrees)) delete worktrees[key];
    activeViewKey = null; draftPath = null; sidebar.close(); $("session-dialog").close();
    notice("connection_forgotten");
  });
  for (const name of ["work", "setup", "settings"]) $("tab-" + name).addEventListener("click", () => tab(name));
  $("go-setup").addEventListener("click", () => tab("setup"));
  $("edit-project").addEventListener("click", () => {
    const visible = $("project-form").hidden;
    if (visible && multipleProjects) { $("path").value = "~/projects/"; $("create-folder").checked = true; }
    projectForm(visible);
  });
  $("cancel-project").addEventListener("click", () => { projectForm(false); $("edit-project").focus(); });
  $("project-update").addEventListener("click", () => tab("setup"));
  for (const id of ["reconnect", "reconnect-welcome"]) $(id).addEventListener("click", () => { notice(""); connect(); });
  $("open-termux").addEventListener("click", () => native.openTermux());
  $("quick-open-termux").addEventListener("click", () => native.openTermux());
  $("quick-app-permissions").addEventListener("click", () => native.openAppPermissions?.());
  $("quick-connect").addEventListener("click", () => {
    if (quickSubmitting || $("quick-connect").disabled) return;
    quickSubmitting = true; renderQuickSetup();
    try { native.startQuickSetup(); }
    catch (_) { notice("quick_start_failed"); }
    finally { setTimeout(() => { quickSubmitting = false; updateEnvironment(); }, 500); }
  });
  $("export-installer").addEventListener("click", () => native.exportInstaller());
  for (const button of document.querySelectorAll("[data-guide]")) button.addEventListener("click", () => native.openGuide(button.dataset.guide));
  for (const button of document.querySelectorAll("[data-command]")) button.addEventListener("click", () => native.copyCommand(button.dataset.command));
  const keys = {escape:"\x1b", tab:"\t", up:"\x1b[A", down:"\x1b[B", interrupt:"\x03", enter:"\r"};
  for (const button of document.querySelectorAll("#terminal-keys [data-key]")) button.addEventListener("click", () => sendRaw(keys[button.dataset.key]));
  window.BibimerPause = () => { pickers.close(); paused = true; ++generation; clearTimeout(retryTimer); clearTimeout(quickTimer); };
  $("language").addEventListener("change", () => {
    try {
      if (!native.setLanguage($("language").value)) throw new Error();
      i18n.setLanguage($("language").value);
      renderLanguage();
    } catch (_) {
      $("language").value = i18n.language();
      notice("language_save_failed");
    }
  });
  function renderNotificationSettings() {
    const env = environment(), settings = env.notifications;
    $("response-notifications").checked = settings?.enabled !== false;
    $("response-notifications").disabled = !native.setResponseNotifications;
    let key = !settings ? "notifications_app_update" : !settings.enabled ? "notifications_off" :
      !env.paired ? "notifications_connect" : !online ? "notifications_reconnecting" :
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
  setInterval(() => { if (!paused && currentTab === "settings") renderNotificationSettings(); }, 2000);
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
      const entry = health.projects?.find(row => row.id === target.project_id);
      pendingNotification = null;
      if (!entry?.sessions?.some(row => row.id === target.session_id)) { notice("notifications_missing"); return; }
      knownProjects = health.projects;
      for (const dialog of document.querySelectorAll("dialog[open]")) dialog.close();
      await selectSession(target.project_id, target.session_id);
    } catch (error) { pendingNotification = null; notice(error.key || "error_request_failed"); }
    finally { notificationNavigating = false; notificationRetry = setTimeout(window.BibimerOpenNotification, 500); }
  };
  function renderInputPreferences() {
    $("enter-behavior").value = enterBehavior;
    $("enter-behavior-hint").textContent = t("enter_" + enterBehavior + "_hint");
    $("input").setAttribute("enterkeyhint", enterBehavior === "send" ? "send" : "enter");
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
  window.BibimerResume = () => {
    paused = false;
    const env = environment();
    enterBehavior = env.enterBehavior === "send" ? "send" : "newline";
    i18n.setLanguage(env.language); renderLanguage(); connect();
  };
  window.BibimerBack = () => {
    const dialogs = [...document.querySelectorAll("dialog[open]")];
    if (dialogs.length) { dialogs[dialogs.length - 1].close(); return true; }
    if (currentTab !== "work") { tab("work"); return true; }
    return false;
  };
  function updateBackState() { native.setBackHandling?.(currentTab !== "work" || !!document.querySelector("dialog[open]")); }
  const backObserver = new MutationObserver(updateBackState);
  for (const dialog of document.querySelectorAll("dialog")) backObserver.observe(dialog, {attributes:true, attributeFilter:["open"]});
  i18n.setLanguage(environment().language);
  renderLanguage();
  if (environment().paired) connect();
})();
