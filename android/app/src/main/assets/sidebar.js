"use strict";
// Touch-only dismissal for modal drawers. Keep scrolling, selection and mouse input native.
window.BibimerDrawerSwipe = function(dialog, direction, close) {
  let gesture = null, suppressUntil = 0, settleTimer;
  const enabled = () => dialog.open && !dialog.classList.contains("docked") && dialog.matches(":modal") &&
    ![...document.querySelectorAll("dialog:modal")].some(other => other !== dialog);
  const selected = () => { const value = window.getSelection(); return value && !value.isCollapsed; };
  const reset = (settle = false) => {
    const dragged = gesture?.dragging;
    if (dragged) suppressUntil = performance.now() + 400;
    gesture = null;
    clearTimeout(settleTimer);
    dialog.classList.remove("drawer-swiping", "drawer-settling");
    dialog.style.removeProperty("--drawer-offset");
    if (settle && dragged && enabled()) {
      dialog.classList.add("drawer-settling");
      settleTimer = setTimeout(() => dialog.classList.remove("drawer-settling"), 180);
    }
  };
  dialog.addEventListener("touchstart", event => {
    reset();
    if (!enabled() || event.touches.length !== 1 || selected()) return;
    const target = event.target instanceof Element ? event.target : event.target.parentElement;
    if (target.closest("input,textarea,select,[contenteditable]:not([contenteditable=false]),pre,code,.table-scroll")) return;
    for (let node = target; node && node !== dialog; node = node.parentElement) {
      if (node.scrollWidth > node.clientWidth + 1 && /auto|scroll/.test(getComputedStyle(node).overflowX)) return;
    }
    const touch = event.touches[0], bounds = dialog.getBoundingClientRect();
    if (touch.clientX < bounds.left || touch.clientX > bounds.right || touch.clientY < bounds.top || touch.clientY > bounds.bottom) return;
    gesture = {id:touch.identifier, x:touch.clientX, y:touch.clientY, width:bounds.width, start:performance.now(), distance:0, dragging:false};
  }, {passive:true});
  dialog.addEventListener("touchmove", event => {
    if (!gesture) return;
    if (!enabled() || event.touches.length !== 1 || selected()) { reset(true); return; }
    const touch = [...event.touches].find(point => point.identifier === gesture.id);
    if (!touch) { reset(true); return; }
    const dx = (touch.clientX - gesture.x) * direction, dy = Math.abs(touch.clientY - gesture.y);
    if (!gesture.dragging) {
      if (Math.max(Math.abs(dx), dy) < 10) return;
      // Decide once: vertical/diagonal/inward motion stays a normal interaction.
      if (dx < 10 || dx < dy * 1.5 || performance.now() - gesture.start > 600 || !event.cancelable) { reset(); return; }
      gesture.dragging = true;
    }
    if (!event.cancelable) { reset(true); return; }
    event.preventDefault();
    gesture.distance = Math.max(0, Math.min(dx, gesture.width));
    dialog.classList.add("drawer-swiping");
    dialog.style.setProperty("--drawer-offset", `${direction * gesture.distance}px`);
  }, {passive:false});
  dialog.addEventListener("touchend", event => {
    if (!gesture) return;
    if (event.touches.length || ![...event.changedTouches].some(point => point.identifier === gesture.id)) { reset(true); return; }
    const dismiss = enabled() && gesture.dragging && gesture.distance >= Math.max(56, Math.min(96, gesture.width * .22));
    if (gesture.dragging && event.cancelable) event.preventDefault();
    reset(!dismiss);
    if (dismiss) close();
  }, {passive:false});
  dialog.addEventListener("touchcancel", () => reset(true), {passive:true});
  dialog.addEventListener("close", () => reset());
  window.addEventListener("resize", () => reset());
  window.addEventListener("blur", () => reset());
  // A completed swipe must not select a row or click the now-exposed conversation.
  document.addEventListener("click", event => {
    if (event.detail > 0 && performance.now() < suppressUntil) { event.preventDefault(); event.stopImmediatePropagation(); }
  }, true);
};

// One project tree: a modal drawer on phones, a non-modal pane in wide windows.
// Moving between layouts never replaces its content or changes session lifetime.
window.BibimerSidebar = class BibimerSidebar {
  constructor(t, actions) {
    this.t = t; this.actions = actions; this.expanded = new Map(); this.signature = ""; this.archived = false;
    this.dialog = document.getElementById("sidebar");
    this.list = document.getElementById("sidebar-projects");
    this.opener = document.getElementById("sidebar-open");
    this.wide = matchMedia("(min-width: 1000px)"); this.collapsed = false;
    this.opener.addEventListener("click", () => {
      if (this.wide.matches && this.dialog.open) this.close(true);
      else { this.open(); actions.refresh(); }
    });
    document.getElementById("sidebar-close").addEventListener("click", () => this.close(true));
    document.getElementById("sidebar-refresh").addEventListener("click", () => actions.refresh());
    document.getElementById("sidebar-archived").addEventListener("click", () => {
      this.archived = !this.archived; this.render(this.state);
    });
    this.dialog.addEventListener("close", () => this.syncLayout());
    this.dialog.addEventListener("keydown", event => {
      if (event.key === "Escape" && this.wide.matches) {
        event.preventDefault(); this.close(true); this.opener.focus();
      }
    });
    let outside = false;
    const onBackdrop = event => {
      const bounds = this.dialog.getBoundingClientRect();
      return event.target === this.dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom);
    };
    this.dialog.addEventListener("pointerdown", event => { outside = onBackdrop(event); });
    this.dialog.addEventListener("click", event => { if (outside && onBackdrop(event)) this.close(); outside = false; });
    BibimerDrawerSwipe(this.dialog, -1, () => { this.close(true); this.opener.focus({preventScroll:true}); });
    this.wide.addEventListener("change", () => this.changeLayout());
    this.changeLayout();
  }
  syncLayout() {
    this.opener.setAttribute("aria-expanded", String(this.dialog.open));
    this.opener.setAttribute("aria-haspopup", this.wide.matches ? "false" : "dialog");
    document.getElementById("app").classList.toggle("sidebar-docked", this.wide.matches && this.dialog.open);
  }
  changeLayout() {
    const focus = document.activeElement;
    this.dialog.close();
    this.dialog.classList.toggle("docked", this.wide.matches);
    this.dialog.setAttribute("role", this.wide.matches ? "navigation" : "dialog");
    if (this.wide.matches && !this.collapsed) this.dialog.show();
    this.syncLayout();
    // Switching out of a modal drawer must release the rest of the page; keep
    // composer focus unless its target has become hidden with the phone drawer.
    if (focus && focus !== document.body) {
      if (this.dialog.contains(focus) && !this.dialog.open) this.opener.focus({preventScroll:true});
      else focus.focus({preventScroll:true});
    }
    if (this.state && this.wide.matches && this.dialog.open) this.actions.refresh();
  }
  open() {
    this.collapsed = false;
    if (!this.dialog.open) {
      if (this.wide.matches) this.dialog.show();
      else this.dialog.showModal();
    }
    this.syncLayout();
  }
  close(explicit = false) {
    // Selecting a session or tab dismisses the phone drawer, but leaves the wide
    // project pane available for the next navigation.
    if (this.wide.matches && !explicit) return;
    if (this.wide.matches) this.collapsed = true;
    this.dialog.close(); this.syncLayout();
  }
  button(text, action, className, key) {
    const button = document.createElement("button"); button.type = "button"; button.className = className || "";
    button.textContent = text; button.dataset.key = key; button.disabled = this.state.disabled;
    button.addEventListener("click", action); return button;
  }
  details(key, name, className, open) {
    const detail = document.createElement("details"), summary = document.createElement("summary");
    detail.className = className; detail.open = this.expanded.get(key) ?? open;
    summary.dataset.key = key; summary.textContent = name; summary.dir = "auto";
    detail.append(summary); detail.addEventListener("toggle", () => this.expanded.set(key, detail.open)); return detail;
  }
  render(state) {
    if (!state) return;
    this.state = state;
    const t = this.t;
    document.getElementById("sidebar-archived").setAttribute("aria-pressed", String(this.archived));
    document.getElementById("sidebar-refresh").disabled = state.disabled;
    document.getElementById("sidebar-status").textContent = !state.online ? t("sidebar_offline") : !state.library ? t("sidebar_update") : state.loading ? t("sidebar_loading") : state.error ? t(state.error) : "";
    // Exclude output cursors so streaming text cannot rebuild the list or steal focus.
    const rows = state.projects.map(project => ({...project, session:undefined, sessions:(project.sessions || (project.session ? [project.session] : [])).map(row => ({
      id:row.id, agent:row.agent, path:row.project.path, title:state.title(row), status:state.status(row),
      archived:!!row.archived, state:row.state, responding:state.responding(row)
    }))}));
    const signature = JSON.stringify([rows, state.worktrees, state.projectId, state.sessionId, state.disabled, state.library, this.archived, t("session_new")]);
    if (signature === this.signature) return;
    this.signature = signature;
    const focused = this.list.contains(document.activeElement) ? document.activeElement.dataset.key : null;
    const scroll = this.list.scrollTop;
    const nodes = rows.map(project => {
      const projectNode = this.details("project/" + project.id, project.name, "sidebar-project", project.id === state.projectId);
      projectNode.dataset.project = project.id;
      projectNode.classList.toggle("current", project.id === state.projectId);
      const label = document.createElement("span"); label.className = "sidebar-project-label"; label.textContent = project.name; label.title = project.name;
      projectNode.firstChild.replaceChildren(label);
      const count = project.sessions.filter(row => ["running", "stopping"].includes(row.state)).length;
      if (count) { const badge = document.createElement("span"); badge.className = "sidebar-count"; badge.textContent = String(count); badge.title = t("sidebar_running"); projectNode.firstChild.append(badge); }
      const openProject = this.button("↗", event => { event.preventDefault(); event.stopPropagation(); this.actions.project(project.id); }, "sidebar-project-open", "open/" + project.id);
      openProject.setAttribute("aria-label", t("sidebar_open_project") + ": " + project.name);
      projectNode.firstChild.append(openProject);
      const settings = this.button("⋯", event => { event.preventDefault(); event.stopPropagation(); this.actions.manageProject(project.id); }, "sidebar-project-more", "project-settings/" + project.id);
      settings.setAttribute("aria-label", t("project_settings") + ": " + project.name); settings.setAttribute("aria-haspopup", "dialog");
      projectNode.firstChild.append(settings);
      const path = document.createElement("p"); path.className = "sidebar-path"; path.textContent = project.path; path.title = project.path; path.dir = "auto"; projectNode.append(path);
      const groups = [...(state.worktrees[project.id] || [{path:project.path, name:project.name, primary:true, available:true}])];
      for (const session of project.sessions) if (!groups.some(group => group.path === session.path)) groups.push({path:session.path, name:session.path.split("/").pop(), available:false});
      for (const group of groups) {
        const matching = project.sessions.filter(row => row.path === group.path && row.archived === this.archived);
        const container = groups.length > 1 ? this.details("tree/" + project.id + "/" + group.path,
          group.primary ? t("worktree_main") : group.branch || group.name, "sidebar-worktree", group.primary || matching.some(row => row.id === state.sessionId)) : document.createElement("div");
        container.dataset.worktree = group.path;
        if (groups.length > 1) { container.firstChild.title = group.path; projectNode.append(container); }
        else projectNode.append(container);
        const controls = document.createElement("div"); controls.className = "sidebar-project-actions";
        if (!this.archived) {
          const add = this.button("+ " + t("session_new"), () => this.actions.create(project.id, group.path), "quiet", "new/" + project.id + "/" + group.path);
          add.disabled ||= !state.library || group.available === false; add.dataset.newProject = project.id;
          controls.append(add);
          const saved = this.button(t("import_session"), () => this.actions.import(project.id, group.path), "quiet", "import/" + project.id + "/" + group.path);
          saved.disabled ||= !state.library || group.available === false; controls.append(saved);
        }
        container.append(controls);
        if (!matching.length) { const empty = document.createElement("p"); empty.className = "sidebar-empty"; empty.textContent = t(this.archived ? "session_no_archived" : "session_none"); container.append(empty); }
        for (const session of matching) {
          const row = document.createElement("div"); row.className = "sidebar-session"; row.dataset.session = session.id;
          row.classList.toggle("selected", session.id === state.sessionId);
          const open = this.button("", () => this.actions.session(project.id, session.id), "sidebar-session-open", "session/" + session.id);
          open.setAttribute("aria-current", session.id === state.sessionId ? "true" : "false");
          const title = document.createElement("strong"), status = document.createElement("small");
          title.textContent = session.title; title.title = session.title; title.dir = "auto";
          open.setAttribute("aria-label", session.title);
          status.textContent = t("agent_" + session.agent) + " · " + session.status;
          status.classList.toggle("response-progress", session.responding);
          open.append(title, status);
          const more = this.button("⋯", () => this.actions.manage(session.id), "icon-button", "manage/" + session.id);
          more.setAttribute("aria-label", t("session_actions") + ": " + session.title); more.setAttribute("aria-haspopup", "dialog");
          row.append(open, more); container.append(row);
        }
      }
      return projectNode;
    });
    if (!nodes.length) { const empty = document.createElement("p"); empty.className = "sidebar-empty"; empty.textContent = t("sidebar_empty"); nodes.push(empty); }
    this.list.replaceChildren(...nodes); this.list.scrollTop = scroll;
    if (focused) [...this.list.querySelectorAll("[data-key]")].find(node => node.dataset.key === focused)?.focus({preventScroll:true});
  }
};
