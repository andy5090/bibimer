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
  let canQueue = false, canSteer = false, queued = [], queueRevision = -1, queueSignature = "";
  const lastOptions = environment().agentOptions || {};
  let enterBehavior = environment().enterBehavior === "send" ? "send" : "newline";
  const permissionModes = {codex:["inherit","read-only","workspace-write","yolo"],
    claude:["inherit","default","acceptEdits","plan","bypassPermissions"], opencode:["inherit","ask","allow"]};
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

  function environment() {
    try { return JSON.parse(native.environment()); }
    catch (_) { return {paired:false, termuxInstalled:false}; }
  }
  function savedOptions(agent) {
    const value = lastOptions[agent] || {};
    return {permission:permissionModes[agent]?.includes(value.permission) ? value.permission : "inherit",
      ...(agent === "codex" ? {fast:value.fast === true} : {})};
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
      // Do not replace an open native picker during status polling.
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
    if (!prefix) $("quick-hint").textContent = t(settingsBusy ? "settings_saving" : updateNeeded ? "settings_update_short" : chat ? "settings_next_message" : live ? "settings_next_session" : "settings_remembered");
  }
  async function saveOptions(prefix, quick = false) {
    if (settingsBusy) return;
    const live = !prefix && session && ["running","stopping"].includes(session.state);
    const chat = live && isChat();
    const agent = prefix ? $("import-agent").value : live ? session.agent : $("agent").value;
    const source = quick ? "quick-" : prefix;
    const value = {permission:$(source + "permission").value,
      ...(agent === "codex" ? {fast:$(source + "fast").checked} : {})};
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
  function renderNotice() {
    $("notice").textContent = noticeData ? t(noticeData.key) + (noticeData.suffix ? " " + t(noticeData.suffix) : "") : "";
    $("notice").hidden = !noticeData;
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
    const env = environment();
    $("termux-status").textContent = t(env.termuxInstalled ? "installed" : "install_needed");
    $("termux-status").className = "badge" + (env.termuxInstalled ? " connected" : "");
    $("reconnect-welcome").hidden = !env.paired;
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
  function importable(agent) { return canImport && (multiImport || agent.id === "codex") && agent.installed && agent.available !== false && agent.modes?.includes("chat"); }
  function supportsChat() { return !!knownAgents.find(agent => agent.id === $("agent").value)?.modes?.includes("chat"); }
  function projectKey(value = project) { return value?.id || value?.path || null; }
  function rememberView() {
    const key = projectKey();
    if (!key) return;
    const questions = {...views.get(key)?.questions};
    for (const [id, request] of conversation.requests) {
      questions[id] = Object.fromEntries([...request.fields].map(([name,input]) => [name,{value:input.value,selections:input.bibimerSelections || []}]));
    }
    views.set(key, {text:$("input").value, start:$("input").selectionStart, end:$("input").selectionEnd,
      agent:$("agent").value, mode:$("mode").value, questions});
  }
  function restoreQuestions(event) {
    const view = views.get(projectKey());
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
    picker.hidden = !multipleProjects || !knownProjects.length;
    $("project-name").hidden = !picker.hidden;
    $("edit-project").textContent = t(multipleProjects ? "add_project" : "edit_project");
    $("cancel-project").hidden = !project;
    if (document.activeElement === picker) return;
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
  }
  function adoptProject(next) {
    if (projectKey(next) !== projectKey()) {
      $("import-dialog").close();
      rememberView();
      project = next;
      setSession(null);
      const view = views.get(projectKey());
      $("input").value = view?.text || "";
      $("input").setSelectionRange(view?.start || 0, view?.end || 0);
      $("agent").value = view?.agent || "shell";
      updateMode();
      $("mode").value = view?.mode === "chat" && supportsChat() ? "chat" : "terminal";
      resizeInput();
    } else project = next;
  }
  function resetTerminal() { term.write("", () => term.reset()); }
  function updateMode() {
    $("mode").querySelector('[value="chat"]').disabled = !supportsChat();
    if (!supportsChat()) $("mode").value = "terminal";
    $("mode-hint").textContent = t($("agent").value === "codex" && !persistentCodex ? "codex_storage_update" : supportsChat() ? "mode_hint" : "mode_terminal_hint");
  }
  function isChat() { return session?.mode === "chat"; }
  function renderLanguage() {
    i18n.apply();
    $("language").value = i18n.language();
    renderInputPreferences();
    $("connection").textContent = t(online ? "connection_on" : instance ? "connection_off" : "connection_initial");
    $("project-name").textContent = project ? project.name : t("project_empty");
    $("project-path").textContent = project ? project.path : t("project_location");
    $("version").textContent = t("version_note", {version:environment().version || "0.8.1"});
    $("install-command").textContent = (i18n.language() === "ko" ? "BIBIMER_LANGUAGE=ko " : "") + "bash ~/storage/downloads/bibimer-setup.sh";
    renderAgents(); renderProjects(); updateEnvironment(); renderSession(); renderNotice();
    conversation.localize();
    renderFolderBrowser();
    renderImport(true);
    setTimeout(resize, 30);
  }
  function tab(name) {
    currentTab = name;
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
    $("launch").disabled = !online || !project || busy || switchingProject;
    $("import-session").disabled = $("launch").disabled || !knownAgents.some(importable);
    if ($("agent").value === "codex" && $("mode").value === "chat" && !persistentCodex) $("launch").disabled = true;
    if ($("agent").value !== "shell" && !canOptions) $("launch").disabled = true;
    if (!canOptions) $("import-session").disabled = true;
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
    $("stop").disabled = !online || !session || session.state !== "running";
    $("stop").hidden = !live;
    $("copy-resume").hidden = !(isChat() && session.agent === "codex" && session.history_persisted && session.external_thread_id);
    for (const button of document.querySelectorAll("[data-key]")) button.disabled = $("input").disabled;
    $("terminal-empty").hidden = !!session;
    $("terminal-area").hidden = isChat();
    $("terminal-keys").hidden = isChat();
    $("chat-panel").hidden = !isChat();
    $("chat-state").hidden = !isChat();
    $("chat-empty").hidden = conversation.items.size > 0;
    $("workspace").classList.toggle("chat-mode", isChat());
    $("workspace").classList.toggle("has-requests", isChat() && conversation.requests.size > 0);
    $("turn-status").textContent = isChat() ? (session.state === "running" ? t("chat_state_" + session.turn_state) : label) : "";
    $("interrupt-turn").hidden = !isChat() || !["running", "waiting"].includes(session.turn_state);
    $("interrupt-turn").disabled = !online || !live;
    $("input").placeholder = t(isChat() ? "chat_placeholder" : "input_placeholder");
    conversation.enable(online && live);
    $("session-note").textContent = t(!online && session ? "session_unknown" :
      session && session.state === "lost" ? "session_lost_note" : "session_kept");
  }
  $("copy-resume").addEventListener("click", () => {
    if (!session?.history_persisted || session.agent !== "codex" || !session.external_thread_id) return;
    const quote = value => "'" + String(value).replace(/'/g, "'\"'\"'") + "'";
    window.Bibimer.copyText("codex resume " + quote(session.external_thread_id) + " --cd " + quote(session.project.path));
    notice("codex_resume_copied");
  });
  function setSession(value) {
    if (isChat() && value?.id === session.id && value.output_end < session.output_end) return;
    if ((session && session.id) !== (value && value.id)) {
      cursor = 0;
      resetTerminal();
      conversation.clear();
      queued = []; queueRevision = -1; queueSignature = "";
    }
    session = value;
    if (value && ["running", "stopping"].includes(value.state)) {
      $("agent").value = value.agent; updateMode(); $("mode").value = value.mode || "terminal";
    }
    renderSession();
  }
  function projectForm(visible) {
    $("project-form").hidden = !visible;
    $("workspace").classList.toggle("project-editing", visible);
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
      knownProjects = health.projects || [];
      if (multipleProjects && !knownProjects.some(item => item.id === selectedProjectId)) selectedProjectId = health.project?.id || knownProjects[0]?.id || null;
      const entry = multipleProjects ? knownProjects.find(item => item.id === selectedProjectId) : null;
      const nextProject = entry ? {id:entry.id, name:entry.name, path:entry.path} : health.project;
      const selectedChanged = !projectInitialized || projectKey(nextProject) !== projectKey();
      adoptProject(nextProject);
      $("project-name").textContent = project ? project.name : t("project_empty");
      $("project-path").textContent = project ? project.path : t("project_location");
      if (selectedChanged) {
        $("path").value = project ? project.path : "~/projects/my-project";
        projectForm(!project);
        projectInitialized = true;
      }
      if (JSON.stringify(knownAgents) !== JSON.stringify(health.agents)) {
        knownAgents = health.agents;
        renderAgents();
      }
      $("welcome").hidden = true;
      $("workspace").hidden = false;
      setSession(entry ? entry.session : health.session);
      renderProjects();
      connected(true);
      if (connectionError && noticeData && noticeData.key === connectionError) notice("");
      connectionError = null;
      resize();
      startPoll();
    } catch (error) {
      if (ticket !== generation || paused) return;
      connected(false); connectionError = error.key || "error_request_failed"; notice(connectionError);
      if (error.status === 401) { tab("setup"); return; }
      retryTimer = setTimeout(connect, 3000);
    }
  }
  async function startPoll() {
    if (activePoll || paused || !online || switchingProject) return;
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
    if (!multipleProjects || !online || paused || switchingProject || catalogRequest) return;
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
      if (entry) setSession(entry.session);
      renderProjects(); startPoll();
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
    $("queue-resume").disabled = !online || session?.state !== "running" || sending.has(session?.id);
    const signature = JSON.stringify([session?.id, queued, online, session?.state, sending.has(session?.id), i18n.language()]);
    if (signature === queueSignature) return;
    queueSignature = signature;
    const target = session?.id;
    $("queue-list").replaceChildren(...queued.map(entry => {
      const row = document.createElement("li"), body = document.createElement("div"), text = document.createElement("p");
      row.className = "queue-entry"; row.dataset.id = entry.id;
      text.textContent = entry.text; body.append(text);
      if (entry.state !== "queued") {
        const state = document.createElement("small");
        state.textContent = t("queue_" + entry.state); body.append(state);
      }
      const remove = document.createElement("button");
      remove.type = "button"; remove.className = "quiet"; remove.textContent = t("queue_remove");
      remove.disabled = !online || session?.state !== "running" || entry.state === "sending" || sending.has(target);
      remove.addEventListener("click", () => changeQueue(target, "remove", entry.id));
      row.append(body, remove); return row;
    }));
  }
  async function changeQueue(id, action, entryId) {
    if (!id || sending.has(id)) return;
    sending.add(id); renderSession();
    try {
      const result = await api("POST", `/v1/sessions/${id}/queue`, {action, ...(entryId ? {entry_id:entryId} : {}), request_id:uuid()});
      if (session?.id === id) { setSession(result.session); updateQueue(result); }
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
    const id = session.id, key = projectKey();
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
      if (ok && key === projectKey() && $("input").value === text) $("input").value = "";
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
  $("agent").addEventListener("change", () => {
    updateMode(); $("mode").value = supportsChat() ? "chat" : "terminal";
    rememberView(); renderSession();
  });
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
    await changeProject({path:$("path").value, create:$("create-folder").checked, add:multipleProjects});
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
      const result = await api("POST", "/v1/session-history", {agent:$("import-agent").value, project_id:target, search:importSearch, cursor:more ? importCursor : null});
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
    $("import-agent").replaceChildren(...knownAgents.filter(agent => ["codex","claude","opencode"].includes(agent.id)).map(agent => {
      const option = new Option(t("agent_" + agent.id), agent.id);
      option.disabled = !importable(agent); return option;
    }));
    $("import-agent").value = knownAgents.find(agent => agent.id === $("agent").value && importable(agent))?.id || knownAgents.find(importable)?.id || "codex";
    $("import-search").value = ""; $("import-mode").value = "resume";
    $("import-project").textContent = project.path;
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
        ...(canOptions ? {options:savedOptions($("agent").value)} : {}),
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
  $("stop").addEventListener("click", () => { stopTarget = session?.id; $("stop-dialog").showModal(); });
  $("cancel-stop").addEventListener("click", () => $("stop-dialog").close());
  $("confirm-stop").addEventListener("click", async () => {
    $("stop-dialog").close();
    const id = stopTarget; stopTarget = null;
    if (!id) return;
    try {
      const data = await api("POST", `/v1/sessions/${id}/stop`);
      if (session?.id === id) setSession(data.session);
    } catch (error) { if (session?.id === id) notice(error.key || "error_request_failed"); }
  });
  $("forget").addEventListener("click", () => {
    ++generation; clearTimeout(retryTimer); native.forget();
    connected(false); $("workspace").hidden = true; $("welcome").hidden = false;
    setSession(null); instance = null; projectInitialized = false; updateEnvironment();
    views.clear(); selectedProjectId = null; knownProjects = []; $("input").value = "";
    notice("connection_forgotten");
  });
  for (const name of ["work", "setup", "settings"]) $("tab-" + name).addEventListener("click", () => tab(name));
  $("go-setup").addEventListener("click", () => tab("setup"));
  $("edit-project").addEventListener("click", () => {
    const visible = $("project-form").hidden;
    if (visible && multipleProjects) { $("path").value = "~/projects/"; $("create-folder").checked = true; }
    projectForm(visible);
  });
  $("cancel-project").addEventListener("click", () => projectForm(false));
  $("project-update").addEventListener("click", () => tab("setup"));
  for (const id of ["reconnect", "reconnect-welcome"]) $(id).addEventListener("click", () => { notice(""); connect(); });
  $("open-termux").addEventListener("click", () => native.openTermux());
  $("export-installer").addEventListener("click", () => native.exportInstaller());
  for (const button of document.querySelectorAll("[data-guide]")) button.addEventListener("click", () => native.openGuide(button.dataset.guide));
  for (const button of document.querySelectorAll("[data-command]")) button.addEventListener("click", () => native.copyCommand(button.dataset.command));
  const keys = {escape:"\x1b", tab:"\t", up:"\x1b[A", down:"\x1b[B", interrupt:"\x03", enter:"\r"};
  for (const button of document.querySelectorAll("[data-key]")) button.addEventListener("click", () => sendRaw(keys[button.dataset.key]));
  window.BibimerPause = () => { paused = true; ++generation; clearTimeout(retryTimer); };
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
  function renderInputPreferences() {
    $("enter-behavior").value = enterBehavior;
    $("enter-behavior-hint").textContent = t("enter_" + enterBehavior + "_hint");
    $("input").setAttribute("enterkeyhint", enterBehavior === "send" ? "send" : "enter");
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
  i18n.setLanguage(environment().language);
  renderLanguage();
  if (environment().paired) connect();
})();
