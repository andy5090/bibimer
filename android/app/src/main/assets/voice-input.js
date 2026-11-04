"use strict";
// Speech only edits the captured draft. Sending remains an explicit user action.
class BibimerVoiceInput {
  constructor(input, button, status, t, context, native) {
    Object.assign(this, {input, button, status, t, context, native});
    this.pending = null;
    this.serial = 0;
    this.prefix = Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
    this.revision = 0;
    input.addEventListener("input", () => { this.revision++; this.cancelStale(); });
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
    if (this.pending && this.pending.context !== this.context()) { this.pending.stale = true; this.cancelStale(); }
    if (this.pending && this.input.disabled) this.cancelStale();
    this.button.disabled = this.input.disabled || !!this.pending;
    this.button.setAttribute("aria-busy", String(!!this.pending));
  }
  cancelStale() {
    if (this.pending && !this.pending.cancelRequested && this.native?.cancelVoiceInput) {
      this.pending.cancelRequested = true;
      try { this.native.cancelVoiceInput(this.pending.id); } catch (_) { }
    }
  }
  start() {
    this.update();
    if (this.button.hidden || this.button.disabled) return;
    const id = this.prefix + "-" + (++this.serial);
    this.pending = {id, context:this.context(), value:this.input.value, revision:this.revision,
      start:this.input.selectionStart, end:this.input.selectionEnd};
    this.message(null);
    this.update();
    try { this.native.startVoiceInput(id, bibimerVoiceLabels(this.t)); }
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
      this.message(["voice_key_required", "voice_permission", "voice_auth", "voice_forbidden", "voice_limit", "voice_empty", "voice_failed"].includes(status) ? status :
        status === "unavailable" ? "voice_unavailable" : status === "empty" ? "voice_empty" : "voice_failed");
      return;
    }
    this.input.setRangeText(text.trim(), request.start, request.end, "end");
    this.input.dispatchEvent(new Event("input", {bubbles:true}));
    this.input.focus();
  }
}

// Keys never cross the WebView boundary. Only presence flags are exposed.
function bibimerVoiceLabels(t) {
  return JSON.stringify(Object.fromEntries(["voice_key", "voice_key_hint", "voice_key_required", "voice_failed",
    "voice_save", "voice_cancel", "voice_recording", "voice_record_hint", "voice_stop_recording", "voice_upload",
    "voice_upload_hint", "voice_transcribing"].map(key => [key, t(key)])));
}
class BibimerVoiceSettings {
  constructor(t, native, environment, sync) {
    Object.assign(this, {t, native, environment, sync});
    this.$ = id => document.getElementById(id);
    this.status = ""; this.checking = false;
    for (const id of ["voice-provider", "voice-language"]) this.$(id).addEventListener("change", () => {
      this.status = "";
      try {
        if (!native.configureVoiceInput(this.$("voice-provider").value, this.$("voice-language").value)) this.status = "voice_failed";
      } catch (_) { this.status = "voice_failed"; }
      this.render(); this.sync();
    });
    for (const [id, action] of [["voice-key-edit","edit"], ["voice-key-remove","remove"], ["voice-check","check"]]) {
      this.$(id).addEventListener("click", () => {
        if (this.checking) return;
        if (action === "check") { this.checking = true; this.status = "voice_checking"; this.render(); this.sync(); }
        try { native.voiceKeyAction(this.$("voice-provider").value, action, bibimerVoiceLabels(t)); }
        catch (_) { this.changed("voice_failed"); }
      });
    }
  }
  changed(status) { this.status = status; this.checking = status === "voice_checking"; this.render(); this.sync(); }
  render() {
    const env = this.environment(), state = env.voiceInput || {}, supported = !!this.native.configureVoiceInput && !env.demo;
    this.$("voice-preference").hidden = !supported;
    if (!supported) return;
    const select = this.$("voice-provider"), selected = state.provider || "device";
    const entries = [{id:"device",label:this.t("voice_device")}, ...(state.devices || []),
      {id:"openai",label:"OpenAI · gpt-transcribe"}, {id:"elevenlabs",label:"ElevenLabs · scribe_v2"}];
    if (!entries.some(row => row.id === selected)) entries.push({id:selected,label:this.t("voice_missing_device"),disabled:true});
    const signature = JSON.stringify(entries);
    if (this.signature !== signature) {
      select.replaceChildren(...entries.map(row => {
        const option = document.createElement("option"); option.value = row.id; option.textContent = row.label;
        option.disabled = !!row.disabled; return option;
      }));
      this.signature = signature;
    }
    select.value = selected;
    this.$("voice-language").value = state.language || "";
    const external = ["openai", "elevenlabs"].includes(selected), saved = !!state[selected + "Key"];
    this.$("voice-api-controls").hidden = !external;
    this.$("voice-provider-hint").textContent = this.t(external ? "voice_external_hint" : "voice_device_hint");
    this.$("voice-key-state").textContent = this.t(saved ? "voice_key_saved" : "voice_key_required");
    this.$("voice-settings-status").textContent = this.status ? this.t(this.status) : "";
    select.disabled = this.$("voice-language").disabled = this.checking;
    this.$("voice-key-edit").disabled = this.checking;
    this.$("voice-key-remove").disabled = this.checking || !saved;
    this.$("voice-check").disabled = this.checking || !saved;
  }
}
