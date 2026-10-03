"use strict";
// Native selects retain values and change events; visible choices use this sheet.
window.BibimerSelect = class BibimerSelect {
  constructor(t, {description = () => "", context = () => ""} = {}) {
    this.t = t; this.description = description; this.context = context;
    this.active = null; this.signature = ""; this.search = ""; this.searchAt = 0;
    this.sheet = document.getElementById("select-dialog");
    this.title = document.getElementById("select-title");
    this.list = document.getElementById("select-options");
    this.dismiss = document.getElementById("select-close");
    this.entries = [...document.querySelectorAll("select")].map(select => {
      const labels = [...select.labels], wrapper = document.createElement("div");
      wrapper.className = "select-control"; wrapper.dataset.select = select.id;
      const trigger = document.createElement("button"), value = document.createElement("span");
      trigger.type = "button"; trigger.id = select.id + "-trigger"; trigger.className = "select-trigger";
      trigger.setAttribute("aria-haspopup", "dialog"); trigger.setAttribute("aria-controls", this.sheet.id);
      trigger.setAttribute("aria-expanded", "false"); value.className = "select-value"; value.dir = "auto";
      const arrow = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      arrow.setAttribute("viewBox", "0 0 16 16"); arrow.setAttribute("aria-hidden", "true");
      const path = document.createElementNS(arrow.namespaceURI, "path");
      path.setAttribute("d", "m4 6 4 4 4-4"); arrow.append(path); trigger.append(value, arrow);
      select.before(wrapper); wrapper.append(select, trigger);
      select.tabIndex = -1; select.setAttribute("aria-hidden", "true");
      for (const label of labels) label.htmlFor = trigger.id;
      const entry = {select, labels, wrapper, trigger, value};
      trigger.addEventListener("click", () => this.open(entry));
      trigger.addEventListener("keydown", event => {
        if (["ArrowDown", "ArrowUp"].includes(event.key)) { event.preventDefault(); this.open(entry); }
      });
      select.addEventListener("change", () => this.sync());
      return entry;
    });
    this.dismiss.addEventListener("click", () => this.close());
    this.sheet.addEventListener("cancel", event => { event.preventDefault(); this.close(); });
    this.sheet.addEventListener("close", () => { if (!this.sheet.open) this.closed(); });
    let backdrop = false;
    const outside = event => {
      const r = this.sheet.getBoundingClientRect();
      return event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom;
    };
    this.sheet.addEventListener("pointerdown", event => { backdrop = event.target === this.sheet && outside(event); });
    this.sheet.addEventListener("click", event => {
      if (backdrop && event.target === this.sheet && outside(event)) this.close();
      backdrop = false;
    });
    this.list.addEventListener("keydown", event => this.navigate(event));
    // Polling may change availability or replace options while a sheet is open.
    this.observer = new MutationObserver(() => this.sync());
    for (const {select} of this.entries) this.observer.observe(select, {attributes:true, childList:true, subtree:true, characterData:true});
    for (const dialog of document.querySelectorAll("dialog:not(#select-dialog)")) dialog.addEventListener("close", () => this.sync());
    this.sync();
  }
  label(entry) { return entry.select.getAttribute("aria-label") || entry.labels.map(label => label.textContent.trim()).join(" ") || this.t("select_title"); }
  available(entry) { return !entry.select.disabled && !entry.select.hidden && entry.trigger.getClientRects().length > 0; }
  options(entry) {
    return [...entry.select.options].filter(option => !option.hidden).map(option => ({
      value:option.value, label:option.label, language:option.lang,
      disabled:option.disabled || !!option.closest("optgroup[disabled]"), description:this.description(entry.select, option)
    }));
  }
  sync() {
    for (const entry of this.entries) {
      const {select, wrapper, trigger, value} = entry;
      wrapper.hidden = select.hidden;
      trigger.disabled = select.disabled || !this.options(entry).some(option => !option.disabled);
      const label = select.selectedOptions[0]?.label || this.t("select_title");
      if (value.textContent !== label) value.textContent = label;
      trigger.setAttribute("aria-label", this.label(entry) + ": " + label);
      const describedBy = select.getAttribute("aria-describedby");
      if (describedBy) trigger.setAttribute("aria-describedby", describedBy);
    }
    this.dismiss.setAttribute("aria-label", this.t("select_close"));
    if (this.active) {
      if (!this.available(this.active) || this.active.trigger.disabled || this.context(this.active.select) !== this.openContext) this.close();
      else this.render();
    }
  }
  open(entry) {
    this.sync();
    if (!this.available(entry) || entry.trigger.disabled) return;
    if (this.active) this.close();
    this.active = entry; this.openContext = this.context(entry.select);
    this.signature = ""; this.search = ""; this.searchAt = 0;
    this.sheet.dataset.select = entry.select.id; entry.trigger.setAttribute("aria-expanded", "true");
    this.render(); this.sheet.showModal();
    this.focus(this.list.querySelector('[aria-selected="true"]:not(:disabled)') || this.list.querySelector("button:not(:disabled)"));
  }
  render() {
    const entry = this.active, options = this.options(entry), title = this.label(entry);
    const signature = JSON.stringify([title, entry.select.value, options]);
    if (signature === this.signature) return;
    this.signature = signature; this.title.textContent = title;
    const focused = this.list.contains(document.activeElement) ? document.activeElement.dataset.value : null;
    const scroll = this.list.scrollTop;
    this.list.replaceChildren(...options.map(option => {
      const row = document.createElement("button"), body = document.createElement("span");
      row.type = "button"; row.className = "select-option"; row.setAttribute("role", "option");
      row.dataset.value = option.value; row.disabled = option.disabled; row.tabIndex = -1;
      row.setAttribute("aria-selected", String(option.value === entry.select.value));
      body.className = "select-option-body";
      const label = document.createElement("span"); label.className = "select-option-label";
      label.textContent = option.label; label.dir = "auto"; if (option.language) label.lang = option.language;
      body.append(label);
      if (option.description) { const hint = document.createElement("small"); hint.textContent = option.description; hint.dir = "auto"; body.append(hint); }
      const check = document.createElement("span"); check.className = "select-check"; check.textContent = "✓"; check.setAttribute("aria-hidden", "true");
      row.append(body, check);
      row.addEventListener("click", () => {
        // Revalidate before committing a choice that may have become stale.
        if (this.active !== entry || !this.available(entry) || this.context(entry.select) !== this.openContext) { this.close(); return; }
        if (!this.options(entry).some(item => item.value === option.value && !item.disabled)) { this.sync(); return; }
        const changed = entry.select.value !== option.value;
        this.close();
        if (changed) {
          entry.select.value = option.value;
          entry.select.dispatchEvent(new Event("input", {bubbles:true}));
          entry.select.dispatchEvent(new Event("change", {bubbles:true}));
        }
        this.sync();
      });
      return row;
    }));
    const rows = [...this.list.querySelectorAll("button:not(:disabled)")];
    const target = rows.find(row => row.dataset.value === focused) || rows.find(row => row.getAttribute("aria-selected") === "true") || rows[0];
    if (target) target.tabIndex = 0;
    if (focused !== null) this.focus(target); else this.list.scrollTop = scroll;
  }
  focus(row) {
    if (!row) return;
    for (const item of this.list.children) item.tabIndex = item === row ? 0 : -1;
    row.focus({preventScroll:true}); row.scrollIntoView({block:"nearest"});
  }
  navigate(event) {
    if (event.isComposing || event.keyCode === 229 || event.ctrlKey || event.metaKey || event.altKey) return;
    const rows = [...this.list.querySelectorAll("button:not(:disabled)")];
    if (!rows.length) return;
    const index = rows.indexOf(document.activeElement);
    let target;
    if (event.key === "ArrowDown") target = rows[(index + 1) % rows.length];
    else if (event.key === "ArrowUp") target = rows[(index - 1 + rows.length) % rows.length];
    else if (event.key === "Home") target = rows[0];
    else if (event.key === "End") target = rows[rows.length - 1];
    else if (event.key.length === 1 && event.key !== " ") {
      const now = Date.now(); this.search = now - this.searchAt > 700 ? event.key : this.search + event.key; this.searchAt = now;
      const query = [...this.search].every(char => char === this.search[0]) ? this.search[0] : this.search;
      target = [...rows.slice(index + 1), ...rows.slice(0, index + 1)].find(row => row.querySelector(".select-option-label").textContent.toLocaleLowerCase().startsWith(query.toLocaleLowerCase()));
    }
    if (target) { event.preventDefault(); this.focus(target); }
  }
  closed() {
    const entry = this.active; this.active = null; this.signature = ""; delete this.sheet.dataset.select;
    if (entry) { entry.trigger.setAttribute("aria-expanded", "false"); if (this.available(entry)) entry.trigger.focus({preventScroll:true}); }
  }
  close() { if (this.sheet.open) this.sheet.close(); this.closed(); }
};
