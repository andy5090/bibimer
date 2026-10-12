"use strict";
(() => {
  const {make, codeBlock, markdown} = BibimerRichText;
  const languages = {js:"javascript", mjs:"javascript", cjs:"javascript", ts:"typescript", tsx:"typescript", jsx:"javascript",
    py:"python", sh:"bash", bash:"bash", zsh:"bash", kt:"kotlin", kts:"kotlin", java:"java", swift:"swift",
    rs:"rust", go:"go", rb:"ruby", php:"php", c:"c", h:"c", cpp:"cpp", hpp:"cpp", cs:"csharp",
    json:"json", jsonc:"json", yaml:"yaml", yml:"yaml", toml:"ini", ini:"ini", css:"css", scss:"scss",
    html:"xml", htm:"xml", xml:"xml", svg:"xml", sql:"sql", diff:"diff", patch:"diff", md:"markdown", markdown:"markdown"};
  const extension = path => {
    const name = path.split("/").pop();
    return name.includes(".") ? name.slice(name.lastIndexOf(".") + 1).toLowerCase() : "";
  };
  const external = path => /^(docx?|pptx?|xlsx?|odt|ods|odp|rtf|pdf|png|jpe?g|gif|webp|bmp|heic|heif|avif|svg|ico|tiff?)$/.test(extension(path));
  let mermaidReady, diagramId = 0;
  function loadMermaid() {
    if (!mermaidReady) mermaidReady = new Promise((resolve, reject) => {
      const script = make("script"); script.src = "vendor/mermaid.js";
      script.onload = () => {
        try {
          window.mermaid.initialize({startOnLoad:false, securityLevel:"strict", theme:"dark", logLevel:"fatal", htmlLabels:false,
            maxTextSize:16000, maxEdges:500, suppressErrorRendering:true, flowchart:{htmlLabels:false},
            secure:["secure", "securityLevel", "startOnLoad", "maxTextSize", "maxEdges", "suppressErrorRendering", "htmlLabels", "dompurifyConfig"]});
          resolve(window.mermaid);
        } catch (_) { script.remove(); mermaidReady = null; reject(new Error()); }
      };
      script.onerror = () => { script.remove(); mermaidReady = null; reject(new Error()); };
      document.head.append(script);
    });
    return mermaidReady;
  }
  // The frame has no scripts, origin privileges, forms, navigation or external resources.
  function frameDocument(body, diagram = false) {
    const doc = new DOMParser().parseFromString(body, "text/html");
    for (const node of doc.querySelectorAll("script,iframe,object,embed,base,meta,link,form,foreignObject")) node.remove();
    for (const node of doc.querySelectorAll("*")) for (const attr of [...node.attributes]) {
      if (/^on/i.test(attr.name) || /^(src|srcset|href|xlink:href|srcdoc|action|formaction|target)$/i.test(attr.name)) node.removeAttribute(attr.name);
    }
    const policy = doc.createElement("meta"); policy.httpEquiv = "Content-Security-Policy";
    policy.content = "default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src 'none'; font-src 'none'; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'";
    const style = doc.createElement("style");
    style.textContent = diagram ? "html{color-scheme:dark;background:#111417}body{margin:16px}svg{height:auto}" :
      "html{color-scheme:light;background:#fff;color:#111}body{margin:16px;font:15px/1.6 system-ui;overflow-wrap:anywhere}pre{white-space:pre-wrap}img{max-width:100%}";
    doc.head.prepend(policy); doc.head.append(style);
    return "<!doctype html>" + doc.documentElement.outerHTML;
  }
  function frame(body, title, diagram = false) {
    const node = make("iframe", undefined, "file-frame");
    node.setAttribute("sandbox", ""); node.referrerPolicy = "no-referrer"; node.title = title;
    node.srcdoc = frameDocument(body, diagram); return node;
  }
  window.BibimerFileViewer = class {
    constructor(t, context, request, openExternal) {
      this.t = t; this.context = context; this.request = request; this.openExternal = openExternal;
      this.dialog = document.getElementById("file-viewer"); this.content = document.getElementById("file-content");
      this.ticket = 0; this.mode = "preview";
      document.getElementById("file-close").onclick = () => this.dialog.close();
      document.getElementById("file-refresh").onclick = () => this.load();
      document.getElementById("file-external").onclick = () => this.openInApp();
      for (const mode of ["preview", "raw"]) document.getElementById("file-" + mode).onclick = () => { this.mode = mode; this.render(); };
      this.dialog.addEventListener("close", () => {
        ++this.ticket; ++this.renderTicket; this.result = null; this.content.replaceChildren(); this.loading = false;
        document.getElementById("inspector-open").focus({preventScroll:true});
      });
    }
    key(ctx) { return JSON.stringify([ctx.instance, ctx.project, ctx.path]); }
    update() {
      if (!this.dialog.open) return;
      if (this.key(this.context()) !== this.key(this.ctx)) { this.dialog.close(); return; }
      const ctx = this.context();
      if (this.language !== document.documentElement.lang || this.availability !== JSON.stringify([ctx.online, ctx.filesSupported, ctx.demo])) this.render();
    }
    open(path) {
      this.ctx = {...this.context()}; this.path = path; this.mode = "preview"; this.result = null; this.error = null;
      if (!this.dialog.open) this.dialog.showModal();
      this.load();
    }
    current(ticket) { return ticket === this.ticket && this.dialog.open && this.key(this.ctx) === this.key(this.context()); }
    async load() {
      const ticket = ++this.ticket;
      this.result = null; this.error = null; this.loading = true; this.render();
      if (external(this.path)) { this.loading = false; this.render(); await this.openInApp(); return; }
      try {
        const result = await this.request({action:"file", project_id:this.ctx.project, worktree_path:this.ctx.path, path:this.path});
        if (this.current(ticket)) this.result = result;
      } catch (error) { if (this.current(ticket)) this.error = error.key || "error_request_failed"; }
      finally { if (this.current(ticket)) { this.loading = false; this.render(); } }
    }
    async openInApp() {
      if (this.externalBusy) { this.error = "error_file_busy"; this.render(); return; }
      const ticket = this.ticket; this.externalBusy = true; this.error = null; this.render();
      try {
        await this.openExternal(this.path, this.ctx);
        if (this.current(ticket) && external(this.path)) this.dialog.close();
      } catch (error) { if (this.current(ticket)) this.error = error.key || "error_file_open"; }
      finally { this.externalBusy = false; if (this.dialog.open) this.render(); }
    }
    async diagram(source, container, renderTicket) {
      container.replaceChildren(make("p", this.t("file_diagram_loading"), "hint"));
      try {
        // File-controlled configuration, markup and resource references never reach the renderer.
        if (source.length > 16000 || /%%\s*\{|^\s*---|<\/?[a-z!]|^\s*click\s|\b(?:href|img)\s*:/im.test(source)) throw new Error();
        const mermaid = await loadMermaid();
        if (!container.isConnected || renderTicket !== this.renderTicket) return;
        const {svg} = await mermaid.render("file-diagram-" + (++diagramId), source);
        if (container.isConnected && renderTicket === this.renderTicket) container.replaceChildren(frame(svg, this.t("file_preview"), true));
      } catch (_) {
        if (container.isConnected && renderTicket === this.renderTicket) container.replaceChildren(make("p", this.t("file_diagram_error"), "hint"), codeBlock(source, "", this.t));
      }
    }
    render() {
      const t = this.t, ctx = this.context(), result = this.result;
      const renderTicket = this.renderTicket = (this.renderTicket || 0) + 1;
      this.language = document.documentElement.lang; this.availability = JSON.stringify([ctx.online, ctx.filesSupported, ctx.demo]);
      document.getElementById("file-title").textContent = this.path?.split("/").pop() || "";
      document.getElementById("file-path").textContent = this.path || "";
      document.getElementById("file-close").setAttribute("aria-label", t("file_close"));
      const rich = /^(md|markdown|html|htm|mmd|mermaid)$/.test(extension(this.path || ""));
      for (const mode of ["preview", "raw"]) {
        const button = document.getElementById("file-" + mode); button.textContent = t("file_" + mode);
        button.hidden = !result || result.binary;
        button.setAttribute("aria-pressed", String(this.mode === mode));
      }
      document.getElementById("file-refresh").textContent = t("file_refresh");
      document.getElementById("file-refresh").disabled = this.loading || this.externalBusy || !ctx.online;
      document.getElementById("file-external").textContent = t("open_file");
      document.getElementById("file-external").disabled = this.externalBusy || !ctx.online || !ctx.filesSupported || ctx.demo;
      document.getElementById("file-status").textContent = t(!ctx.online ? "inspect_offline" : this.error || (this.loading ? "inspect_loading" : this.externalBusy ? "file_opening" : ""));
      this.content.replaceChildren();
      if (this.error && !external(this.path)) {
        const retry = make("button", t("inspect_retry"), "secondary"); retry.onclick = () => this.load(); this.content.append(retry);
      }
      if (!result) {
        if (external(this.path)) this.content.append(make("p", t("file_external_hint"), "hint"));
        return;
      }
      if (result.binary) { this.content.append(make("p", t("file_binary_hint"), "hint")); return; }
      if (result.truncated) this.content.append(make("p", t("file_truncated"), "hint"));
      const source = result.text || "", ext = extension(this.path);
      if (!source) this.content.append(make("p", t("inspect_empty_file"), "hint"));
      if (this.mode === "raw" || (rich && result.truncated)) {
        this.content.append(codeBlock(source, "", t));
      } else if (/^(md|markdown)$/.test(ext)) {
        const node = markdown(source, t); this.content.append(node);
        for (const block of node.querySelectorAll(".code-block")) if (block.querySelector(".code-language")?.textContent === "mermaid") {
          const diagram = make("div", undefined, "file-diagram"); block.replaceWith(diagram);
          this.diagram(block.querySelector("code").textContent, diagram, renderTicket);
        }
        for (const link of node.querySelectorAll(".file-link")) link.onclick = () => {
          const target = link.title;
          const relative = !/^(\/|~|[\w+.-]+:)/.test(target);
          const prefix = this.path.split("/").slice(0,-1).join("/");
          const ticket = this.ticket;
          this.openExternal(relative && prefix ? prefix + "/" + target : target, this.ctx).catch(error => {
            if (this.current(ticket)) { this.error = error.key || "error_file_open"; this.render(); }
          });
        };
      } else if (/^(html|htm)$/.test(ext)) {
        this.content.append(make("p", t("file_html_hint"), "hint"), frame(source, t("file_preview")));
      } else if (/^(mmd|mermaid)$/.test(ext)) {
        const diagram = make("div", undefined, "file-diagram"); this.content.append(diagram); this.diagram(source, diagram, renderTicket);
      } else {
        const name = this.path.split("/").pop().toLowerCase();
        this.content.append(codeBlock(source, languages[ext] || (name === "dockerfile" ? "dockerfile" : name === "makefile" ? "makefile" : ext), t));
      }
    }
  };
})();
