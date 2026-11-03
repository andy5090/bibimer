"use strict";
window.BibimerInspector = class BibimerInspector {
  constructor(t, context, request, openFile, gitRequest) {
    this.t = t; this.context = context; this.request = request;
    this.openFile = openFile;
    this.git = new BibimerGitActions(t, context, gitRequest, () => { if (this.dialog.open) void this.load(); });
    this.dialog = document.getElementById("inspector");
    this.opener = document.getElementById("inspector-open");
    this.content = document.getElementById("inspect-content");
    this.toolbar = document.getElementById("inspect-toolbar");
    this.status = document.getElementById("inspect-status");
    this.more = document.getElementById("inspect-more");
    this.tabs = [...this.dialog.querySelectorAll("[role=tab]")];
    this.view = "files"; this.path = ""; this.hidden = false;
    this.ticket = 0; this.key = ""; this.result = null; this.detail = null; this.loading = false;
    this.wide = matchMedia("(min-width:1280px)");
    this.opener.addEventListener("click", () => this.dialog.open ? this.close() : this.open());
    document.getElementById("inspector-close").addEventListener("click", () => this.close());
    document.getElementById("inspect-refresh").addEventListener("click", () => this.load());
    this.more.addEventListener("click", () => this.load(true));
    for (const [index, tab] of this.tabs.entries()) {
      tab.addEventListener("click", () => this.choose(tab.dataset.view));
      tab.addEventListener("keydown", event => {
        const next = event.key === "ArrowRight" ? (index+1)%3 : event.key === "ArrowLeft" ? (index+2)%3 : event.key === "Home" ? 0 : event.key === "End" ? 2 : -1;
        if (next < 0) return;
        event.preventDefault(); this.tabs[next].focus(); this.choose(this.tabs[next].dataset.view);
      });
    }
    this.dialog.addEventListener("close", () => {
      this.syncLayout();
      if (!this.dialog.open) { ++this.ticket; this.loading = false; }
    });
    this.dialog.addEventListener("keydown", event => {
      if (event.key === "Escape" && this.wide.matches) { event.preventDefault(); this.close(); }
    });
    let outside = false;
    const backdrop = event => {
      const rect = this.dialog.getBoundingClientRect();
      return event.target === this.dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom);
    };
    this.dialog.addEventListener("pointerdown", event => { outside = backdrop(event); });
    this.dialog.addEventListener("click", event => { if (outside && backdrop(event)) this.close(); outside = false; });
    this.wide.addEventListener("change", () => {
      const wasOpen = this.dialog.open, focus = document.activeElement;
      this.dialog.close(); this.syncLayout();
      if (wasOpen && this.wide.matches) this.open();
      if (focus && focus !== document.body) {
        (this.dialog.contains(focus) && !this.dialog.open ? this.opener : focus).focus({preventScroll:true});
      }
    });
    BibimerDrawerSwipe(this.dialog, 1, () => this.close());
    this.syncOpener(); this.syncLayout();
  }
  syncOpener() {
    const tab = this.tabs.find(tab => tab.dataset.view === this.view);
    if (this.opener.dataset.view !== this.view) {
      this.opener.replaceChildren(tab.querySelector("svg").cloneNode(true));
      this.opener.dataset.view = this.view;
    }
    const key = "inspect_" + this.view;
    this.opener.dataset.i18nAriaLabel = key;
    this.opener.setAttribute("aria-label", this.t(key));
    this.opener.title = this.t("inspect_title") + " · " + this.t(key);
  }
  syncLayout() {
    this.dialog.classList.toggle("docked", this.wide.matches);
    this.dialog.setAttribute("role", this.wide.matches ? "complementary" : "dialog");
    this.opener.setAttribute("aria-expanded", String(this.dialog.open));
    this.opener.setAttribute("aria-haspopup", this.wide.matches ? "false" : "dialog");
    document.getElementById("app").classList.toggle("inspector-docked", this.wide.matches && this.dialog.open);
  }
  open() {
    if (!this.dialog.open) {
      if (this.wide.matches) this.dialog.show(); else this.dialog.showModal();
    }
    this.syncLayout(); this.update();
    if (!this.loading) this.load();
  }
  close() {
    ++this.ticket; this.loading = false;
    this.dialog.close(); this.syncLayout(); this.opener.focus({preventScroll:true});
  }
  choose(view) {
    if (view === this.view) return;
    this.view = view; this.detail = null; this.result = null; this.error = null;
    this.load();
  }
  update() {
    const ctx = this.context();
    const key = JSON.stringify([ctx.instance, ctx.project, ctx.path, ctx.online, ctx.supported]);
    if (key !== this.key) {
      const previous = this.ctx;
      this.key = key; this.ctx = ctx; ++this.ticket; this.loading = false;
      this.result = null; this.detail = null; this.error = null;
      if (!previous || previous.project !== ctx.project || previous.path !== ctx.path) this.path = "";
      if (this.dialog.open) this.load();
    } else this.ctx = ctx;
    this.git.update(this.dialog.open && !this.detail && ["history", "status"].includes(this.view));
    // Do not rebuild content on each streaming event; language changes still apply.
    if (this.language !== document.documentElement.lang) {
      this.language = document.documentElement.lang; this.render();
    }
  }
  unavailable() {
    return !this.ctx?.project ? "inspect_no_project" : !this.ctx.online ? "inspect_offline" : !this.ctx.supported ? "inspect_update" : null;
  }
  async load(append = false) {
    if (append && (this.loading || this.result?.next_offset == null)) return;
    const ctx = this.ctx = this.context(), ticket = ++this.ticket;
    const blocked = this.unavailable();
    this.error = null;
    if (blocked || !this.dialog.open) { this.loading = false; this.render(); return; }
    const old = this.result;
    this.loading = true;
    if (!append) this.result = null;
    this.render();
    const action = this.detail?.action || this.view;
    const body = {project_id:ctx.project, worktree_path:ctx.path, action,
      ...(action === "files" ? {path:this.path, hidden:this.hidden} : {}), ...this.detail,
      ...(append ? {offset:old.next_offset, ...(this.view === "history" ? {revision:old.revision} : {})} : {})};
    // UI-only labels and status objects never enter the bridge request.
    delete body.label; delete body.row;
    try {
      const result = await this.request(body);
      const current = this.context();
      if (ticket !== this.ticket || !this.dialog.open || ctx.project !== current.project || ctx.path !== current.path || ctx.instance !== current.instance) return;
      this.result = append ? {...result, entries:[...old.entries, ...result.entries]} : result;
      this.updated = new Date();
    } catch (error) {
      if (ticket !== this.ticket) return;
      this.error = error.key || "error_request_failed";
      if (append) this.result = old;
    } finally {
      if (ticket === this.ticket) { this.loading = false; this.render(append); }
    }
  }
  node(tag, text, className = "") {
    const node = document.createElement(tag); node.textContent = text; node.className = className; return node;
  }
  button(text, callback, className = "inspect-row") {
    const button = this.node("button", text, className); button.type = "button";
    button.addEventListener("click", callback); return button;
  }
  preview(detail) {
    if (detail.action === "file") {
      this.openFile(detail.path); return;
    }
    this.detail = detail; this.load();
  }
  render(keepScroll = false) {
    const t = this.t, blocked = this.unavailable(), result = this.result;
    this.syncOpener();
    this.git.update(this.dialog.open && !blocked && !this.detail && ["history", "status"].includes(this.view));
    const scroll = document.getElementById("inspect-panel").scrollTop;
    for (const tab of this.tabs) {
      const active = tab.dataset.view === this.view;
      tab.setAttribute("aria-selected", String(active)); tab.tabIndex = active ? 0 : -1;
      tab.title = t("inspect_" + tab.dataset.view);
    }
    document.getElementById("inspect-panel").setAttribute("aria-labelledby", `inspect-${this.view}-tab`);
    document.getElementById("inspect-root").textContent = this.ctx?.path || "";
    document.getElementById("inspect-root").title = this.ctx?.path || "";
    document.getElementById("inspect-refresh").disabled = !!blocked || this.loading;
    this.status.textContent = t(blocked || (this.loading ? "inspect_loading" : this.error || ""));
    this.content.replaceChildren(); this.toolbar.replaceChildren();
    this.more.hidden = true;
    if (blocked) return;
    if (this.detail) {
      this.toolbar.append(this.button("← " + t("inspect_back"), () => { this.detail = null; this.load(); }, "quiet"));
      this.toolbar.append(this.node("span", this.detail.label || this.detail.path || "", "inspect-location"));
      if (this.detail.action === "diff") {
        for (const area of ["staged", "worktree"]) {
          const button = this.button(t("inspect_" + area), () => { this.detail.area = area; this.load(); }, "quiet");
          button.setAttribute("aria-pressed", String(this.detail.area === area)); this.toolbar.append(button);
        }
      }
    } else if (this.view === "files") {
      this.toolbar.append(this.button(t("inspect_root"), () => { this.path = ""; this.load(); }, "quiet"));
      const hidden = this.button(t("inspect_hidden"), () => { this.hidden = !this.hidden; this.load(); }, "quiet");
      hidden.setAttribute("aria-pressed", String(this.hidden)); this.toolbar.append(hidden);
      this.toolbar.append(this.node("span", this.path || "/", "inspect-location"));
      if (this.path) this.content.append(this.button("↑ " + t("inspect_parent"), () => { this.path = this.path.split("/").slice(0,-1).join("/"); this.load(); }, "inspect-row inspect-parent"));
    }
    if (this.error) this.content.append(this.button(t("inspect_retry"), () => this.load(), "secondary"));
    if (!result) return;
    if (result.is_repo === false) { this.status.textContent = t("inspect_not_git"); return; }
    if (!this.loading && !this.error) this.status.textContent = t("inspect_updated", {time:this.updated.toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"})});
    if (this.detail) {
      if (result.binary) this.content.append(this.node("p", t("inspect_binary"), "hint"));
      else {
        const code = this.node("pre", result.text || t(this.detail.action === "file" ? "inspect_empty_file" : "inspect_no_diff"), "inspect-code"); code.tabIndex = 0;
        this.content.append(code);
      }
      if (result.truncated) this.content.append(this.node("p", t("inspect_truncated"), "hint"));
    } else if (this.view === "files") {
      for (const entry of result.entries || []) {
        const button = this.button("", () => {
          if (entry.kind === "folder") { this.path = entry.path; this.load(); }
          else this.preview({action:"file", path:entry.path});
        });
        button.append(this.node("span", entry.kind === "folder" ? "▸" : entry.kind === "link" ? "↗" : "≡", "inspect-file-icon"), this.node("span", entry.name));
        button.title = entry.path;
        button.disabled = !["file", "folder"].includes(entry.kind);
        if (button.disabled) button.title += " · " + t("inspect_link");
        this.content.append(button);
      }
    } else if (this.view === "status") {
      const branch = result.branch || {};
      const name = branch.head === "(detached)" ? t("inspect_detached") : branch.head || "—";
      this.content.append(this.node("strong", name, "inspect-branch"));
      if (branch.upstream) this.content.append(this.node("p", branch.upstream + (branch.ab ? " · " + branch.ab : "") + " · " + t("inspect_local_refs"), "hint"));
      for (const row of result.entries || []) {
        const button = this.button("", () => {
          if (row.xy === "??") {
            if (row.path.endsWith("/")) { this.view = "files"; this.path = row.path.slice(0,-1); this.load(); }
            else this.preview({action:"file", path:row.path});
          } else this.preview({action:"diff", path:row.path, area:row.xy[0] !== "." ? "staged" : "worktree"});
        });
        button.append(this.node("code", row.xy, "inspect-change" + (row.conflict ? " conflict" : "")), this.node("span", row.original ? row.original + " → " + row.path : row.path));
        this.content.append(button);
      }
      this.content.append(this.node("p", t("inspect_status_legend"), "hint"));
    } else {
      for (const commit of result.entries || []) {
        const button = this.button("", () => this.preview({action:"commit", revision:commit.id, label:commit.short}), "inspect-commit");
        button.append(this.node("strong", commit.subject || commit.short), this.node("small", `${commit.short} · ${commit.author} · ${commit.date?.slice(0,10) || ""}`));
        if (commit.refs) button.append(this.node("small", commit.refs, "inspect-refs"));
        this.content.append(button);
      }
    }
    if (!this.detail && !result.entries?.length) this.content.append(this.node("p", t(this.view === "status" ? "inspect_clean" : this.view === "history" ? "inspect_no_commits" : "inspect_empty"), "hint"));
    this.more.hidden = !!this.detail || result.next_offset == null;
    this.more.disabled = this.loading;
    if (keepScroll) document.getElementById("inspect-panel").scrollTop = scroll;
  }
};

class BibimerGitActions {
  constructor(t, context, request, refresh) {
    Object.assign(this, {t, context, request, refresh});
    this.entries = new Map();
    this.root = document.getElementById("git-actions");
    this.form = document.getElementById("git-action-form");
    this.message = document.getElementById("git-message");
    this.all = document.getElementById("git-all");
    this.status = document.getElementById("git-action-status");
    for (const button of this.root.querySelectorAll("[data-git-action]")) button.addEventListener("click", () => {
      const entry = this.entry;
      if (!entry?.state || entry.busy || entry.loading) return;
      entry.action = button.dataset.gitAction; entry.error = null; this.render();
      if (entry.action === "commit") this.message.focus();
    });
    document.getElementById("git-action-cancel").addEventListener("click", () => { if (!this.entry?.busy) { this.entry.action = null; this.render(); } });
    this.message.addEventListener("input", () => { if (this.entry) this.entry.message = this.message.value; });
    this.all.addEventListener("change", () => { if (this.entry) this.entry.all = this.all.checked; });
    this.form.addEventListener("submit", event => { event.preventDefault(); void this.start(); });
    document.getElementById("git-state-refresh").addEventListener("click", () => void this.load());
  }
  update(visible) {
    const ctx = this.context(), key = JSON.stringify([ctx.instance, ctx.project, ctx.path]);
    if (key !== this.key) {
      this.key = key;
      if (!this.entries.has(key)) this.entries.set(key, {ctx:{...ctx}, message:"", all:false});
      this.entry = this.entries.get(key);
      this.message.value = this.entry.message; this.all.checked = this.entry.all;
    }
    this.visible = visible; this.ctx = ctx;
    this.root.hidden = !visible;
    if (!visible) return;
    this.render();
    if (ctx.gitSupported && ctx.online && !ctx.demo && !this.entry.state && !this.entry.loading && !this.entry.busy) void this.load();
  }
  same(entry) { return entry === this.entry && this.key === JSON.stringify([this.context().instance, this.context().project, this.context().path]); }
  body(entry, extra) { return {project_id:entry.ctx.project, worktree_path:entry.ctx.path, ...extra}; }
  async load(preserveError = false) {
    const entry = this.entry;
    if (!entry || entry.loading || entry.busy || !this.ctx.online || !this.ctx.gitSupported || this.ctx.demo) return;
    entry.loading = true; if (!preserveError) entry.error = null; this.render();
    try { entry.state = await this.request(this.body(entry, {action:"state"})); }
    catch (error) { entry.state = null; entry.error = error.key || "git_failed"; }
    finally { entry.loading = false; if (this.same(entry)) this.render(); }
  }
  async start() {
    const entry = this.entry;
    if (!entry?.action || !entry.state || entry.busy || entry.loading || !this.ctx.online || !this.ctx.gitSupported || this.ctx.demo || !this.same(entry)) return;
    if (entry.action === "commit" && !entry.message.trim()) { this.message.focus(); return; }
    const body = this.body(entry, {action:entry.action, request_id:crypto.randomUUID(), message:entry.action === "commit" ? entry.message : "",
      all_changes:entry.action === "commit" && entry.all, expected_head:entry.state.head, expected_branch:entry.state.branch});
    entry.busy = true; entry.error = null; entry.job = null; this.render();
    try {
      entry.job = await this.request(body);
    } catch (error) {
      // A lost response may follow a successful write. Query the same ID; never resubmit it.
      if (!error.status) {
        try { entry.job = await this.request(this.body(entry, {action:"job", request_id:body.request_id})); }
        catch (_) { entry.error = "git_unknown"; }
      } else { entry.error = error.key || "git_failed"; entry.busy = false; }
    }
    if (entry.job?.state === "running") {
      const poll = async () => {
        try { entry.job = await this.request(this.body(entry, {action:"job", request_id:body.request_id})); }
        catch (_) { entry.error = "git_unknown"; if (this.same(entry)) this.render(); return; }
        if (entry.job.state === "running") { if (this.same(entry)) this.render(); setTimeout(poll, 1000); }
        else this.finish(entry);
      };
      setTimeout(poll, 500);
    } else if (entry.job) this.finish(entry);
    if (this.same(entry)) this.render();
  }
  finish(entry) {
    entry.busy = false;
    entry.error = entry.job.state === "failed" ? entry.job.error || "git_failed" : null;
    if (entry.job.state === "succeeded") {
      if (entry.job.action === "commit") { entry.message = ""; if (this.same(entry)) this.message.value = ""; }
      entry.action = null;
    }
    entry.state = null;
    if (this.same(entry)) { void this.load(true); this.refresh(); this.render(); }
  }
  render() {
    if (!this.visible || !this.entry) return;
    const entry = this.entry, state = entry.state, t = this.t;
    const unavailable = !this.ctx.gitSupported || this.ctx.demo;
    const disabled = unavailable || !this.ctx.online || entry.loading || entry.busy || !state || state.busy;
    for (const button of this.root.querySelectorAll("[data-git-action]")) button.disabled = !!disabled;
    this.form.hidden = !entry.action;
    document.getElementById("git-commit-fields").hidden = entry.action !== "commit";
    document.getElementById("git-action-target").textContent = [this.ctx.path, state?.branch, state?.upstream].filter(Boolean).join(" · ");
    document.getElementById("git-action-explanation").textContent = t(entry.action === "commit" ? "git_commit_hint" : "git_remote_hint");
    document.getElementById("git-action-confirm").textContent = t("git_" + (entry.action || "commit"));
    document.getElementById("git-action-confirm").disabled = !!disabled;
    document.getElementById("git-action-cancel").disabled = !!entry.busy;
    document.getElementById("git-state-refresh").disabled = unavailable || !this.ctx.online || entry.busy || entry.loading;
    this.message.disabled = this.all.disabled = !!entry.busy;
    this.message.required = entry.action === "commit";
    this.status.textContent = t(this.ctx.demo ? "error_demo_request" : unavailable ? "git_update" : entry.error || (entry.busy ? "git_running" : entry.loading ? "inspect_loading" : entry.job?.state === "succeeded" ? "git_succeeded" : ""));
    if ((entry.busy || entry.error) && entry.job?.phase) this.status.textContent += " · " + t("git_" + entry.job.phase);
  }
}
