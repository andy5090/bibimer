"use strict";
// Speech only edits the captured draft. Sending remains an explicit user action.
class BibimerVoiceInput {
  constructor(input, button, status, t, context, native) {
    Object.assign(this, {input, button, status, t, context, native});
    this.pending = null;
    this.serial = 0;
    this.prefix = Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
    this.revision = 0;
    input.addEventListener("input", () => { this.revision++; });
    // Preserve the textarea selection when tapping the microphone.
    button.addEventListener("pointerdown", event => event.preventDefault());
    button.addEventListener("click", () => this.start());
    this.update();
  }
  message(key) {
    this.status.textContent = key ? this.t(key) : "";
    this.status.hidden = !key;
  }
  update() {
    this.button.hidden = typeof this.native?.startVoiceInput !== "function";
    if (this.pending && this.pending.context !== this.context()) this.pending.stale = true;
    this.button.disabled = this.input.disabled || !!this.pending;
    this.button.setAttribute("aria-busy", String(!!this.pending));
  }
  start() {
    this.update();
    if (this.button.hidden || this.button.disabled) return;
    const id = this.prefix + "-" + (++this.serial);
    this.pending = {id, context:this.context(), value:this.input.value, revision:this.revision,
      start:this.input.selectionStart, end:this.input.selectionEnd};
    this.message("voice_opening");
    this.update();
    try { this.native.startVoiceInput(id); }
    catch (_) { this.result(id, "failed", ""); }
  }
  result(id, status, text) {
    const request = this.pending;
    if (!request || id !== request.id) return;
    this.pending = null;
    this.update();
    this.message(null);
    // Includes a draft edited and then restored to its original string.
    if (request.stale || request.context !== this.context() || this.input.disabled ||
        request.value !== this.input.value || request.revision !== this.revision) {
      if (status === "ok") this.message("voice_changed");
      return;
    }
    if (status === "cancelled") return;
    if (status !== "ok" || typeof text !== "string" || !text.trim() || text.length > 65536) {
      this.message(status === "unavailable" ? "voice_unavailable" : status === "empty" ? "voice_empty" : "voice_failed");
      return;
    }
    this.input.setRangeText(text.trim(), request.start, request.end, "end");
    this.input.dispatchEvent(new Event("input", {bubbles:true}));
    this.input.focus();
  }
}
