"use strict";
class BibimerBrowserConsent {
  constructor(t, context, request, changed, open) {
    Object.assign(this, {t, context, request, changed, open});
    this.pending = new Set();
    this.error = null;
    this.rendered = null;
    this.root = document.getElementById("browser-consent");
    this.allow = document.getElementById("browser-consent-allow");
    this.view = document.getElementById("browser-consent-view");
    this.message = document.getElementById("browser-consent-error");
    this.allow.addEventListener("click", () => void this.act("allow"));
    this.view.addEventListener("click", () => void this.act("view"));
  }
  target() {
    const ctx = this.context();
    if (!ctx.enabled || !ctx.online || ctx.paused || ctx.switching || ctx.tab !== "work" || !ctx.project) return null;
    const session = ctx.sessions.find(row => row.kind === "browser" && row.project?.id === ctx.project &&
      row.state === "running" && row.browser_manual === true && row.launch_id && row.browser_tag);
    if (!session) return null;
    return {ctx, session, key:JSON.stringify([ctx.instance, ctx.project, session.id, session.launch_id])};
  }
  render() {
    const target = this.target();
    this.root.hidden = !target;
    this.rendered = target?.key || null;
    if (!target) return;
    this.allow.disabled = this.view.disabled = this.pending.has(target.key);
    this.message.hidden = !this.error || this.error.key !== target.key;
    this.message.textContent = this.message.hidden ? "" : this.t(this.error.code);
  }
  async act(action) {
    if (!["view", "allow"].includes(action)) return;
    const target = this.target();
    // A click belongs to the exact project, bridge and browser run shown on the card.
    if (!target || target.key !== this.rendered || this.pending.has(target.key)) { this.render(); return; }
    if (action === "view") {
      try { this.open(target.session.browser_tag); }
      catch (_) { this.error = {key:target.key, code:"error_browser_control"}; this.render(); }
      return;
    }
    this.pending.add(target.key); this.error = null; this.render();
    try {
      const result = await this.request({action:"allow", project_id:target.ctx.project,
        worktree_path:target.ctx.path, session_id:target.session.id, launch_id:target.session.launch_id});
      const row = result.session;
      if (!row || row.id !== target.session.id || row.launch_id !== target.session.launch_id ||
          row.project?.id !== target.ctx.project || row.kind !== "browser" || row.state !== "running" || row.browser_manual !== false) throw {key:"error_browser_control"};
      if (this.context().instance === target.ctx.instance) this.changed(row);
    } catch (error) {
      this.error = {key:target.key, code:error.key || "error_browser_control"};
    } finally { this.pending.delete(target.key); this.render(); }
  }
}
