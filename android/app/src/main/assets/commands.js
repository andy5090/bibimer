"use strict";
// Native catalog metadata only. Templates and skill contents stay in Termux.
window.BibimerCommands = class {
  constructor(input, host, t, context, request) {
    Object.assign(this, {input, host, t, context, request});
    this.catalogs = new Map(); this.selections = new Map(); this.index = 0;
    input.setAttribute("aria-autocomplete", "list");
    input.setAttribute("aria-controls", "command-options");
    input.addEventListener("input", () => { this.dismissed = null; this.index = 0; this.render(); });
    input.addEventListener("click", () => this.render());
    input.addEventListener("focus", () => this.render());
    host.addEventListener("pointerdown", event => event.preventDefault());
  }
  token() { return /^\/([^\s]*)/.exec(this.input.value); }
  async load(ctx, refresh = false) {
    const previous = this.catalogs.get(ctx.key);
    if (previous?.loading) return previous.promise;
    if (!refresh && previous?.ready && Date.now() - previous.time < 60000) return previous;
    const state = {loading:true, rows:[], time:Date.now()};
    this.catalogs.set(ctx.key, state);
    state.promise = (async () => {
      try {
        const result = await this.request({project_id:ctx.project, worktree_path:ctx.path, agent:ctx.agent, refresh});
        state.rows = result.commands; state.partial = result.partial; state.ready = true;
      } catch (_) { state.error = true; }
      finally { state.loading = false; this.render(); }
      return state;
    })();
    return state.promise;
  }
  render() {
    const ctx = this.context(), token = this.token();
    const active = ctx.enabled && token && this.input.selectionStart <= token[0].length &&
      this.dismissed !== ctx.view + ":" + this.input.value;
    this.host.hidden = !active;
    this.input.setAttribute("aria-expanded", String(!!active));
    if (!active) { this.signature = null; this.visible = []; this.input.removeAttribute("aria-activedescendant"); return; }
    let state = ctx.supported ? this.catalogs.get(ctx.key) : null;
    if (ctx.supported && !state) { void this.load(ctx); state = this.catalogs.get(ctx.key); }
    const signature = JSON.stringify([ctx.key, ctx.view, ctx.supported, token[1], this.index, state?.loading, state?.error, state?.time, state?.ready, this.t("commands_title")]);
    if (this.signature === signature) return;
    this.signature = signature;
    this.host.replaceChildren();
    const panel = document.createElement("div"); panel.className = "command-panel";
    const header = document.createElement("div"); header.className = "command-header";
    const title = document.createElement("strong"); title.textContent = this.t("commands_title"); header.append(title);
    if (ctx.supported) {
      const refresh = document.createElement("button"); refresh.type = "button"; refresh.className = "quiet";
      refresh.textContent = this.t("commands_refresh"); refresh.disabled = !!state?.loading;
      refresh.onclick = () => { void this.load(ctx, true); this.render(); }; header.append(refresh);
    }
    panel.append(header);
    const query = token[1].toLocaleLowerCase();
    this.visible = (state?.rows || []).filter(row => (row.name + " " + row.description).toLocaleLowerCase().includes(query));
    this.index = Math.min(this.index, Math.max(0, this.visible.length - 1));
    const list = document.createElement("div"); list.id = "command-options"; list.setAttribute("role", "listbox");
    list.setAttribute("aria-label", this.t("commands_title"));
    this.visible.forEach((row, i) => {
      const button = document.createElement("button"); button.type = "button"; button.className = "command-option";
      button.setAttribute("role", "option"); button.setAttribute("aria-selected", String(i === this.index)); button.tabIndex = -1;
      button.id = "command-option-" + i; button.dataset.command = row.name;
      const name = document.createElement("strong"); name.textContent = "/" + row.name;
      const meta = document.createElement("span"); meta.className = "command-kind";
      meta.textContent = [this.t("commands_" + row.kind), row.scope].filter(Boolean).join(" · ");
      const description = document.createElement("small"); description.textContent = row.description || row.hint;
      button.append(name, meta, description); button.onclick = () => this.choose(row); list.append(button);
    });
    panel.append(list);
    if (!this.visible.length || state?.partial) {
      const hint = document.createElement("p"); hint.className = "hint"; hint.setAttribute("role", "status");
      hint.textContent = this.t(!ctx.supported ? "commands_update" : state?.loading ? "commands_loading" :
        state?.error ? "error_commands" : state?.partial ? "commands_partial" : "commands_empty"); panel.append(hint);
    }
    this.host.append(panel);
    if (this.visible.length) this.input.setAttribute("aria-activedescendant", "command-option-" + this.index);
    else this.input.removeAttribute("aria-activedescendant");
  }
  choose(row) {
    const ctx = this.context(), token = this.token();
    if (!token) return;
    this.selections.set(ctx.view, {key:ctx.key, id:row.id, name:row.name});
    const tail = this.input.value.slice(token[0].length);
    this.input.value = "/" + row.name + (tail || " ");
    this.input.focus(); this.input.setSelectionRange(row.name.length + 2, row.name.length + 2);
    this.input.dispatchEvent(new Event("input", {bubbles:true}));
  }
  dismiss() {
    this.dismissed = this.context().view + ":" + this.input.value; this.render();
  }
  keydown(event) {
    if (event.shiftKey || event.ctrlKey || event.metaKey || event.altKey || this.host.hidden) return false;
    if (event.key === "Escape") {
      this.dismiss();
    } else if (["ArrowDown", "ArrowUp"].includes(event.key) && this.visible.length) {
      this.index = (this.index + (event.key === "ArrowDown" ? 1 : -1) + this.visible.length) % this.visible.length;
      this.signature = null; this.render(); document.getElementById("command-option-" + this.index)?.scrollIntoView({block:"nearest"});
    } else if (["Enter", "Tab"].includes(event.key) && this.visible.length) {
      if (!event.repeat) this.choose(this.visible[this.index]);
    } else return false;
    event.preventDefault(); return true;
  }
  async invocation(text) {
    const ctx = this.context();
    if (!ctx.enabled || !text.startsWith("/")) return {};
    if (!ctx.supported) {
      if (ctx.mode !== "chat") return {};
      throw {key:"commands_update"};
    }
    const selected = this.selections.get(ctx.view);
    const state = await this.load(ctx);
    if (state.error) {
      if (ctx.mode !== "chat") return {};
      throw {key:"error_commands"};
    }
    const name = /^\/([^\s]+)/.exec(text)?.[1];
    let rows = state.rows.filter(row => row.name === name);
    if (selected?.key === ctx.key && selected.name === name) rows = rows.filter(row => row.id === selected.id);
    if (rows.length !== 1) {
      if (ctx.mode !== "chat") return {};
      throw {key:"error_command"};
    }
    return ctx.mode === "chat" ? {command_id:rows[0].id} : {terminalText:ctx.agent === "codex" ? "$" + text.slice(1) : text};
  }
};
