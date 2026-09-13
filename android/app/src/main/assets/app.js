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
  const term = new Terminal({fontSize:13, fontFamily:"monospace", cursorBlink:true,
    scrollback:2000, theme:{background:"#111512", foreground:"#e3e9db", cursor:"#d7e8aa"}});
  const fit = new FitAddon.FitAddon();
  term.loadAddon(fit);
  term.open($("terminal"));

  function environment() {
    try { return JSON.parse(native.environment()); }
    catch (_) { return {paired:false, termuxInstalled:false}; }
  }
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
      option.textContent = t("agent_" + agent.id) + (agent.installed ? "" : t("install_required_suffix"));
      option.disabled = !agent.installed;
      $("agent").append(option);
    }
    if ([...$("agent").options].some(option => option.value === selected && !option.disabled)) $("agent").value = selected;
  }
  function renderLanguage() {
    i18n.apply();
    $("language").value = i18n.language();
    $("connection").textContent = t(online ? "connection_on" : instance ? "connection_off" : "connection_initial");
    $("project-name").textContent = project ? project.name : t("project_empty");
    $("project-path").textContent = project ? project.path : t("project_location");
    $("version").textContent = t("version_note", {version:environment().version || "0.1.1"});
    $("install-command").textContent = (i18n.language() === "ko" ? "BIBIMER_LANGUAGE=ko " : "") + "bash ~/storage/downloads/bibimer-setup.sh";
    renderAgents(); updateEnvironment(); renderSession(); renderNotice();
    setTimeout(resize, 30);
  }
  function tab(name) {
    currentTab = name;
    $("work").hidden = name !== "work";
    $("setup").hidden = name !== "setup";
    $("tab-work").classList.toggle("selected", name === "work");
    $("tab-setup").classList.toggle("selected", name === "setup");
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
    $("launch").disabled = !online || !project || busy;
    $("edit-project").disabled = !!live || !online;
    $("input").disabled = !online || !session || session.state !== "running";
    $("send").disabled = $("input").disabled;
    $("stop").disabled = !online || !session || session.state !== "running";
    $("stop").hidden = !live;
    for (const button of document.querySelectorAll("[data-key]")) button.disabled = $("input").disabled;
    $("terminal-empty").hidden = !!session;
    $("session-note").textContent = t(!online && session ? "session_unknown" :
      session && session.state === "lost" ? "session_lost_note" : "session_kept");
  }
  function setSession(value) {
    if ((session && session.id) !== (value && value.id)) {
      cursor = 0;
      term.reset();
    }
    session = value;
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
        cursor = 0; term.reset();
        notice("bridge_restarted");
      }
      instance = health.instance;
      const projectChanged = !projectInitialized || (project && project.path) !== (health.project && health.project.path);
      project = health.project;
      $("project-name").textContent = project ? project.name : t("project_empty");
      $("project-path").textContent = project ? project.path : t("project_location");
      if (projectChanged) {
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
      setSession(health.session);
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
    if (activePoll || paused || !online) return;
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
        term.reset();
        notice("output_gap");
      }
      if (event.data) {
        const bytes = Uint8Array.from(atob(event.data), c => c.charCodeAt(0));
        await new Promise(resolve => term.write(bytes, resolve));
      }
      cursor = event.cursor;
      setSession(event.session);
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
  function resize() {
    if (currentTab !== "work" || $("workspace").hidden) return;
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
    if (!online || !session || session.state !== "running" || !text) return Promise.resolve(false);
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
        notice(error.key || "error_request_failed", "check_delivery");
        if (!error.status) connected(false);
        return false;
      }
    });
    inputQueue = job.catch(() => false);
    return job;
  }
  term.onData(sendRaw);
  $("input-form").addEventListener("submit", async event => {
    event.preventDefault();
    const text = $("input").value;
    if (!text) return;
    $("send").disabled = true;
    const ok = await sendRaw(text.replace(/\r?\n/g, "\r") + "\r");
    if (ok && $("input").value === text) $("input").value = "";
    renderSession();
  });
  $("project-form").addEventListener("submit", async event => {
    event.preventDefault();
    try {
      await api("POST", "/v1/project", {path:$("path").value, create:$("create-folder").checked});
      projectInitialized = false;
      notice(""); await connect();
    } catch (error) { notice(error.key || "error_request_failed"); }
  });
  $("launch").addEventListener("click", async () => {
    if (busy) return;
    busy = true; renderSession(); notice("");
    try {
      const data = await api("POST", "/v1/sessions", {agent:$("agent").value,
        cols:Math.max(20, term.cols), rows:Math.max(4, term.rows), request_id:uuid()});
      ++generation; setSession(data.session); resize(); startPoll();
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
  $("stop").addEventListener("click", () => $("stop-dialog").showModal());
  $("cancel-stop").addEventListener("click", () => $("stop-dialog").close());
  $("confirm-stop").addEventListener("click", async () => {
    $("stop-dialog").close();
    if (!session) return;
    try {
      const data = await api("POST", `/v1/sessions/${session.id}/stop`);
      setSession(data.session);
    } catch (error) { notice(error.key || "error_request_failed"); }
  });
  $("forget").addEventListener("click", () => {
    ++generation; clearTimeout(retryTimer); native.forget();
    connected(false); $("workspace").hidden = true; $("welcome").hidden = false;
    setSession(null); instance = null; projectInitialized = false; updateEnvironment();
    notice("connection_forgotten");
  });
  for (const name of ["work", "setup"]) $("tab-" + name).addEventListener("click", () => tab(name));
  $("go-setup").addEventListener("click", () => tab("setup"));
  $("edit-project").addEventListener("click", () => projectForm($("project-form").hidden));
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
  window.BibimerResume = () => { paused = false; i18n.setLanguage(environment().language); renderLanguage(); connect(); };
  i18n.setLanguage(environment().language);
  renderLanguage();
  if (environment().paired) connect();
})();
