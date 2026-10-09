"use strict";
(() => {
  const make = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  const decoder = document.createElement("textarea");
  const decode = value => String(value || "").replace(/&(?:#\d+|#x[\da-f]+|[a-z][\da-z]+);/gi, entity => {
    // Only an individual character reference enters this inert text element.
    decoder.innerHTML = entity;
    return decoder.value;
  });
  function copyButton(text, t, label = "copy") {
    const button = make("button", t(label), "copy-button");
    button.type = "button";
    button.dataset.labelKey = label;
    button.setAttribute("aria-label", t(label));
    button.onclick = () => {
      window.Bibimer.copyText(text);
      button.textContent = t("copied");
      clearTimeout(button.copyTimer);
      button.copyTimer = setTimeout(() => { button.textContent = t(label); }, 1500);
    };
    return button;
  }
  function codeBlock(text, language, t) {
    const languageId = (language || "").trim().split(/\s/)[0].toLowerCase();
    const block = make("div", undefined, "code-block");
    const heading = make("div", undefined, "code-heading");
    heading.append(make("span", languageId || t("chat_code"), "code-language"));
    const actions = make("div", undefined, "code-actions");
    const wrap = make("button", t("code_wrap")); wrap.type = "button";
    wrap.dataset.labelKey = "code_wrap";
    wrap.setAttribute("aria-pressed", "false");
    wrap.onclick = () => {
      const wrapped = block.classList.toggle("wrapped");
      wrap.setAttribute("aria-pressed", String(wrapped));
    };
    actions.append(wrap, copyButton(text, t)); heading.append(actions);
    const pre = make("pre"), code = make("code", text);
    pre.tabIndex = 0;
    pre.setAttribute("aria-label", languageId || t("chat_code"));
    if (languageId && window.hljs?.getLanguage(languageId) && text.length <= 16000) {
      code.className = "language-" + languageId;
      // highlight.js escapes the source before producing its own span markup.
      window.hljs.highlightElement(code);
    }
    pre.append(code); block.append(heading, pre);
    return block;
  }
  function link(token, t) {
    const target = decode(token.href), label = decode(token.text || target);
    let url;
    try { url = new URL(target); } catch (_) {}
    const external = url && ["https:", "http:"].includes(url.protocol) && !url.username && !url.password && !/[\x00-\x20]/.test(target);
    const withoutLine = target.replace(/:[1-9][0-9]*(?::[1-9][0-9]*)?$/, "");
    const local = !/[\x00-\x1f\x7f]/.test(target) && !target.startsWith("//") && (
      (url?.protocol === "file:" && ["", "localhost"].includes(url.hostname) && !url.search) ||
      (!/^[\w+.-]+:/.test(withoutLine) && !target.startsWith("#"))
    );
    if (!external && !local) return make("span", label);
    const button = make("button", undefined, "text-link" + (local ? " file-link" : ""));
    button.type = "button";
    if (token.tokens) inline(button, token.tokens, t); else button.textContent = label;
    button.title = target;
    button.setAttribute("aria-label", label + " · " + t(external ? "open_browser" : "open_file"));
    button.onclick = () => external ? window.Bibimer.openLink?.(url.href) : window.BibimerOpenFile?.(target);
    return button;
  }
  function inline(parent, tokens, t, depth = 0) {
    if (depth > 32) return;
    for (const token of tokens || []) {
      const tag = {strong:"strong", em:"em", del:"del"}[token.type];
      if (tag) { const node = make(tag); inline(node, token.tokens, t, depth+1); parent.append(node); }
      else if (token.type === "codespan") parent.append(make("code", decode(token.text)));
      else if (token.type === "br") parent.append(make("br"));
      else if (token.type === "link") parent.append(link(token, t));
      else if (token.type === "image") {
        const caption = make("span", t("image_reference") + ": ", "image-reference");
        caption.append(link({...token, tokens:null}, t)); parent.append(caption);
      } else if (token.tokens) inline(parent, token.tokens, t, depth+1);
      else parent.append(document.createTextNode(token.type === "html" ? token.raw : decode(token.text || token.raw)));
    }
  }
  function blocks(parent, tokens, t, depth = 0) {
    if (depth > 32) return;
    for (const token of tokens) {
      if (token.type === "space" || token.type === "def") continue;
      if (token.type === "code") parent.append(codeBlock(token.text, token.lang, t));
      else if (token.type === "heading") {
        const node = make("h" + Math.min(6, token.depth + 1)); inline(node, token.tokens, t); parent.append(node);
      } else if (token.type === "hr") parent.append(make("hr"));
      else if (token.type === "blockquote") {
        const node = make("blockquote"); blocks(node, token.tokens, t, depth+1); parent.append(node);
      } else if (token.type === "list") {
        const list = make(token.ordered ? "ol" : "ul");
        if (token.ordered && token.start !== 1) list.start = token.start;
        for (const item of token.items) {
          const li = make("li");
          if (item.task) {
            li.className = "task-item";
            const check = make("input"); check.type = "checkbox"; check.checked = item.checked; check.disabled = true;
            check.setAttribute("aria-label", t(item.checked ? "chat_status_completed" : "plan_pending")); li.append(check);
          }
          blocks(li, item.tokens, t, depth+1); list.append(li);
        }
        parent.append(list);
      } else if (token.type === "table") {
        const wrap = make("div", undefined, "table-scroll"), table = make("table");
        wrap.tabIndex = 0;
        const head = make("thead"), body = make("tbody");
        const row = (cells, header) => {
          const tr = make("tr");
          cells.forEach((cell, index) => {
            const td = make(header ? "th" : "td");
            if (header) td.scope = "col";
            if (token.align[index]) td.style.textAlign = token.align[index];
            inline(td, cell.tokens, t); tr.append(td);
          });
          return tr;
        };
        head.append(row(token.header, true));
        for (const cells of token.rows) body.append(row(cells, false));
        table.append(head, body); wrap.append(table); parent.append(wrap);
      } else if (token.type === "html") parent.append(make("p", token.raw, "literal-html"));
      else {
        const node = make("p"); inline(node, token.tokens || [{type:"text", text:token.text || token.raw}], t); parent.append(node);
      }
    }
  }
  function markdown(text, t) {
    const node = make("div", undefined, "markdown");
    try { blocks(node, window.marked.lexer(text, {gfm:true, breaks:false}), t); }
    catch (_) { node.append(make("div", text, "plain-message")); }
    return node;
  }
  function diffStats(text) {
    let added = 0, removed = 0;
    for (const line of text.split("\n")) {
      if (line.startsWith("+") && !line.startsWith("+++ ")) added++;
      if (line.startsWith("-") && !line.startsWith("--- ")) removed++;
    }
    return {added, removed};
  }
  function diffBadge(text) {
    const stats = diffStats(text), badge = make("span", undefined, "diff-stats");
    badge.append(make("span", "+"+stats.added, "additions"), make("span", "−"+stats.removed, "deletions"));
    return badge;
  }
  function diffBlock(text, t) {
    const block = make("div", undefined, "diff-block");
    const heading = make("div", undefined, "code-heading");
    heading.append(make("span", "diff", "code-language"), copyButton(text, t));
    const viewport = make("div", undefined, "diff-viewport"); viewport.tabIndex = 0;
    let oldLine = null, newLine = null;
    for (const line of text.split("\n")) {
      const hunk = line.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      let kind = "context", left = "", right = "";
      if (hunk) { oldLine = +hunk[1]; newLine = +hunk[2]; kind = "hunk"; }
      else if (/^(diff |index |--- |\+\+\+ |\\)/.test(line)) kind = "meta";
      else if (line.startsWith("+")) { kind = "added"; if (newLine !== null) right = newLine++; }
      else if (line.startsWith("-")) { kind = "removed"; if (oldLine !== null) left = oldLine++; }
      else if (line.startsWith(" ") && oldLine !== null) { left = oldLine++; right = newLine++; }
      const row = make("div", undefined, "diff-line " + kind);
      const numbers = make("span", left + "  " + right, "diff-numbers"); numbers.setAttribute("aria-hidden", "true");
      row.append(numbers, make("code", line || " ")); viewport.append(row);
    }
    block.append(heading, viewport); return block;
  }
  window.BibimerRichText = {make, markdown, codeBlock, copyButton, diffBlock, diffBadge};
})();
