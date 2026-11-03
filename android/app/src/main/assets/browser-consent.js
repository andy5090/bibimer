"use strict";
class BibimerBrowserConsent {
  constructor(t, context, request, changed, open, notified = () => {}) {
    Object.assign(this, {t, context, request, changed, open, notified});
    this.pending = new Set();
    this.error = null;
    this.rendered = null;
    this.observed = null; this.refreshing = false; this.revision = 0;
    this.root = document.getElementById("browser-consent");
    this.allow = document.getElementById("browser-consent-allow");
    this.view = document.getElementById("browser-consent-view");
    this.message = document.getElementById("browser-consent-error");
    this.allow.addEventListener("click", () => void this.act("allow"));
    this.view.addEventListener("click", () => void this.act("view"));
  }
  contextKey(ctx = this.context()) { return JSON.stringify([ctx.instance, ctx.project, ctx.path]); }
  async refresh() {
    const ctx = this.context(), key = this.contextKey(ctx), revision = this.revision;
    if (this.refreshing || !ctx.enabled || !ctx.online || ctx.paused || ctx.switching || ctx.tab !== "work" || !ctx.project) return;
    this.refreshing = true;
    try {
      const result = await this.request({action:"status", project_id:ctx.project, worktree_path:ctx.path});
      if (this.contextKey() !== key || this.revision !== revision) return;
      const row = result.session;
      if (row && (row.project?.id !== ctx.project || row.kind !== "browser")) return;
      this.observed = {key, session:row || null};
      this.render();
    } catch (_) { /* Existing status remains visible; reading never grants permission. */ }
    finally { this.refreshing = false; }
  }
  observe(row) {
    const ctx = this.context();
    if (row && row.project?.id !== ctx.project) return;
    ++this.revision;
    this.observed = {key:this.contextKey(ctx), session:row || null};
    this.render();
  }
  target() {
    const ctx = this.context();
    if (!ctx.enabled || !ctx.online || ctx.paused || ctx.switching || ctx.tab !== "work" || !ctx.project) return null;
    const rows = this.observed?.key === this.contextKey(ctx) ? (this.observed.session ? [this.observed.session] : []) : ctx.sessions;
    const session = rows.find(row => row.kind === "browser" && row.project?.id === ctx.project &&
      row.state === "running" && row.browser_manual === true && row.launch_id && row.browser_tag);
    if (!session) return null;
    return {ctx, session, key:JSON.stringify([ctx.instance, ctx.project, session.id, session.launch_id, session.browser_consent_request?.id || null])};
  }
  render() {
    const target = this.target();
    this.root.hidden = !target;
    this.rendered = target?.key || null;
    if (!target) return;
    const hint = document.getElementById("browser-consent-notify");
    if (hint) { hint.hidden = !target.ctx.notifyEnabled || !target.session.browser_consent_request; hint.textContent = this.t("browser_consent_notify", {agent:this.t("agent_" + (target.session.browser_consent_request?.agent || "codex"))}); }
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
    ++this.revision;
    this.pending.add(target.key); this.error = null; this.render();
    try {
      const result = await this.request({action:"allow", project_id:target.ctx.project,
        worktree_path:target.session.project.path || target.ctx.path, session_id:target.session.id, launch_id:target.session.launch_id,
        ...(target.ctx.notifyEnabled && target.session.browser_consent_request ? {notify:true,
          consent_request_id:target.session.browser_consent_request.id, notification_text:this.t("browser_allowed_message")} : {})});
      const row = result.session;
      if (!row || row.id !== target.session.id || row.launch_id !== target.session.launch_id ||
          row.project?.id !== target.ctx.project || row.kind !== "browser" || row.state !== "running" || row.browser_manual !== false) throw {key:"error_browser_control"};
      if (this.context().instance === target.ctx.instance) {
        this.changed(row);
        if (this.contextKey() === this.contextKey(target.ctx)) { this.observe(row); if (result.notification) this.notified(result.notification); }
      }
    } catch (error) {
      this.error = {key:target.key, code:error.key || "error_browser_control"};
    } finally { this.pending.delete(target.key); this.render(); }
  }
}
