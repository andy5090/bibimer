"use strict";
// A modal drawer: closing or navigating it never changes a process's lifetime.
window.BibimerSidebar = class BibimerSidebar {
  constructor(t, actions) {
    this.t = t; this.actions = actions; this.expanded = new Map(); this.signature = ""; this.archived = false;
    this.dialog = document.getElementById("sidebar");
    this.list = document.getElementById("sidebar-projects");
    this.opener = document.getElementById("sidebar-open");
    this.opener.addEventListener("click", () => { this.open(); actions.refresh(); });
    document.getElementById("sidebar-close").addEventListener("click", () => this.close());
    document.getElementById("sidebar-refresh").addEventListener("click", () => actions.refresh());
    document.getElementById("sidebar-archived").addEventListener("click", () => {
      this.archived = !this.archived; this.render(this.state);
    });
    this.dialog.addEventListener("close", () => this.opener.setAttribute("aria-expanded", "false"));
    let outside = false;
    const onBackdrop = event => {
      const bounds = this.dialog.getBoundingClientRect();
      return event.target === this.dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom);
    };
    this.dialog.addEventListener("pointerdown", event => { outside = onBackdrop(event); });
    this.dialog.addEventListener("click", event => { if (outside && onBackdrop(event)) this.close(); outside = false; });
  }
  open() { if (!this.dialog.open) this.dialog.showModal(); this.opener.setAttribute("aria-expanded", "true"); }
  close() { this.dialog.close(); }
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
      archived:!!row.archived, state:row.state
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
      const openProject = this.button("↗", event => { event.preventDefault(); event.stopPropagation(); this.actions.project(project.id); }, "sidebar-project-open", "open/" + project.id);
      openProject.setAttribute("aria-label", t("sidebar_open_project") + ": " + project.name);
      projectNode.firstChild.append(openProject);
      const count = project.sessions.filter(row => ["running", "stopping"].includes(row.state)).length;
      if (count) { const badge = document.createElement("span"); badge.className = "sidebar-count"; badge.textContent = String(count); badge.title = t("sidebar_running"); projectNode.firstChild.append(badge); }
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
          title.textContent = session.title; title.dir = "auto"; status.textContent = t("agent_" + session.agent) + " · " + session.status;
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
