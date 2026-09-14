"use strict";
(() => {
  const make = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  function inline(parent, text) {
    // A small, inert Markdown subset: untrusted HTML and URLs are never loaded.
    for (const part of text.split(/(`[^`\n]+`|\*\*[^*\n]+\*\*)/g)) {
      if (part.startsWith("`") && part.endsWith("`")) parent.append(make("code", part.slice(1,-1)));
      else if (part.startsWith("**") && part.endsWith("**")) parent.append(make("strong", part.slice(2,-2)));
      else parent.append(document.createTextNode(part));
    }
  }
  function codeBlock(text, language, t) {
    const block = make("div", undefined, "code-block");
    const heading = make("div", undefined, "code-heading");
    heading.append(make("span", language || t("chat_code")));
    const copy = make("button", t("copy"));
    copy.type = "button";
    copy.onclick = () => window.Bibimer.copyText(text);
    heading.append(copy);
    const pre = make("pre");
    pre.append(make("code", text));
    block.append(heading, pre);
    return block;
  }
  function markdown(text, t) {
    const result = make("div", undefined, "markdown");
    const lines = text.split("\n");
    for (let i = 0; i < lines.length;) {
      let line = lines[i++];
      const fence = line.match(/^\s*```([\w+-]*)\s*$/);
      if (fence) {
        const code = [];
        while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) code.push(lines[i++]);
        if (i < lines.length) i++;
        result.append(codeBlock(code.join("\n"), fence[1], t));
      } else if (/^#{1,6}\s/.test(line)) {
        const heading = make("h" + Math.min(4, line.match(/^#+/)[0].length + 1));
        inline(heading, line.replace(/^#+\s+/, "")); result.append(heading);
      } else if (/^\s*([-*]|\d+\.)\s/.test(line)) {
        const list = make(/^\s*\d/.test(line) ? "ol" : "ul");
        do {
          const item = make("li"); inline(item, line.replace(/^\s*([-*]|\d+\.)\s+/, "")); list.append(item);
          if (i >= lines.length || !/^\s*([-*]|\d+\.)\s/.test(lines[i])) break;
          line = lines[i++];
        } while (true);
        result.append(list);
      } else if (line.includes("|") && i < lines.length && /^\s*\|?\s*:?-{3,}/.test(lines[i])) {
        const wrap = make("div", undefined, "table-scroll"), table = make("table");
        const row = (text, header) => {
          const tr = make("tr");
          for (const value of text.replace(/^\s*\||\|\s*$/g, "").split("|")) {
            const cell = make(header ? "th" : "td"); inline(cell, value.trim()); tr.append(cell);
          }
          table.append(tr);
        };
        row(line, true); i++;
        while (i < lines.length && lines[i].includes("|")) row(lines[i++], false);
        wrap.append(table); result.append(wrap);
      } else if (line.trim()) {
        const paragraph = make(line.startsWith("> ") ? "blockquote" : "p");
        inline(paragraph, line.replace(/^> /, "")); result.append(paragraph);
      }
    }
    return result;
  }
  class Conversation {
    constructor(root, prompts, t, respond) {
      this.root = root; this.prompts = prompts; this.t = t; this.respond = respond;
      this.items = new Map(); this.cards = new Map(); this.requests = new Map();
      this.online = false;
    }
    clear(keepRequests = false) {
      this.items.clear(); this.cards.clear(); this.root.replaceChildren();
      if (!keepRequests) { this.requests.clear(); this.prompts.replaceChildren(); }
    }
    update(event) {
      const follow = this.root.scrollHeight - this.root.scrollTop - this.root.clientHeight < 80;
      const retained = new Set(event.retained || []);
      if (event.retained) for (const key of this.items.keys()) {
        if (!retained.has(key)) { this.items.delete(key); this.cards.get(key).remove(); this.cards.delete(key); }
      }
      for (const item of event.items || []) { this.items.set(item.id, item); this.renderItem(item); }
      const ids = new Set((event.requests || []).map(request => request.id));
      for (const [key, value] of this.requests) if (!ids.has(key)) {
        value.node.remove(); this.requests.delete(key);
      }
      for (const request of event.requests || []) if (!this.requests.has(request.id)) this.renderRequest(request);
      this.enable(this.online);
      if (follow) this.root.scrollTop = this.root.scrollHeight;
    }
    renderItem(item) {
      let card = this.cards.get(item.id);
      if (!card) { card = make("article", undefined, "message " + item.kind); this.cards.set(item.id, card); this.root.append(card); }
      const wasOpen = card.querySelector("details")?.open;
      card.replaceChildren();
      const header = make("div", this.t("chat_" + item.kind), "message-heading");
      if (item.status) header.append(make("span", this.t("chat_status_" + item.status), "item-status"));
      card.append(header);
      if (["command", "diff", "tool", "plan"].includes(item.kind)) {
        const details = make("details"); details.open = wasOpen === undefined ? item.kind === "plan" : wasOpen;
        details.append(make("summary", item.title || this.t("chat_details")));
        details.append(codeBlock(item.text || "", item.kind === "diff" ? "diff" : "", this.t));
        if (item.exit_code !== undefined && item.exit_code !== null) details.append(make("small", this.t("process_exited", {code:item.exit_code})));
        card.append(details);
      } else if (item.kind === "assistant") card.append(markdown(item.text || "", this.t));
      else {
        if (item.code) card.append(make("p", this.t(item.code)));
        if (item.text) card.append(make("div", item.text, "plain-message"));
      }
    }
    renderRequest(request) {
      const card = make("form", undefined, "request-card"), params = request.params;
      const state = {request, node:card, busy:false, fields:new Map()};
      this.requests.set(request.id, state);
      const title = make("h2", this.t(request.kind === "questions" ? "chat_questions" : "chat_approval"));
      title.dataset.requestTitle = request.kind; card.append(title);
      if (request.kind === "questions") {
        for (const question of params.questions) {
          const field = make("label", question.question), input = make("input");
          input.type = question.isSecret ? "password" : "text"; input.required = true;
          input.autocomplete = "off"; input.maxLength = 8192;
          if (question.options?.length) {
            const choices = make("div", undefined, "question-options");
            for (const option of question.options) {
              const button = make("button", option.label); button.type = "button";
              if (option.description) button.append(make("small", option.description));
              button.onclick = () => { input.value = option.label; input.focus(); };
              choices.append(button);
            }
            field.append(choices);
          }
          field.append(input); card.append(field); state.fields.set(question.id, input);
        }
        const send = make("button", this.t("chat_answer"), "primary"); send.type = "submit"; send.dataset.requestAction = "chat_answer"; card.append(send);
        card.onsubmit = event => { event.preventDefault(); this.answer(state, {answers:Object.fromEntries([...state.fields].map(([id,input])=>[id,input.value]))}); };
      } else {
        if (params.reason) card.append(make("p", params.reason));
        if (params.command) card.append(codeBlock(params.command, this.t("chat_command"), this.t));
        if (params.cwd || params.grantRoot) {
          const folder = make("p", this.t("chat_folder") + ": ");
          folder.append(make("code", params.cwd || params.grantRoot)); card.append(folder);
        }
        if (request.preview) card.append(codeBlock(request.preview, request.kind === "file" ? "diff" : "", this.t));
        // Extra requested access must remain reviewable before accepting.
        const extra = Object.fromEntries(Object.entries(params).filter(([key,value])=>
          !["threadId","turnId","itemId","approvalId","reason","command","cwd","grantRoot","startedAtMs","availableDecisions"].includes(key) && value !== null));
        if (Object.keys(extra).length) {
          const details = make("details"); details.open = true;
          details.append(make("summary", this.t("chat_request_details")), make("pre", JSON.stringify(extra, null, 2))); card.append(details);
        }
        const row = make("div", undefined, "button-row");
        for (const [decision,label] of [["decline","chat_decline"],["accept","chat_accept"]]) {
          if (params.availableDecisions && !params.availableDecisions.includes(decision)) continue;
          const button = make("button", this.t(label), decision === "accept" ? "primary" : "secondary");
          button.type = "button"; button.dataset.requestAction = label;
          button.onclick = () => this.answer(state, {decision}); row.append(button);
        }
        card.append(row);
        card.onsubmit = event => event.preventDefault();
      }
      this.prompts.append(card);
    }
    async answer(state, value) {
      if (state.busy || !this.online) return;
      state.busy = true; this.enable(this.online);
      // Retain an identical request ID after an uncertain response. A changed
      // answer gets a different ID and is still checked against the pending prompt.
      const fingerprint = JSON.stringify(value);
      if (state.fingerprint !== fingerprint) { state.fingerprint = fingerprint; state.key = crypto.randomUUID(); }
      try { await this.respond({...value, prompt_id:state.request.id, request_id:state.key}); }
      finally { state.busy = false; this.enable(this.online); }
    }
    enable(online) {
      this.online = online;
      for (const value of this.requests.values()) for (const control of value.node.querySelectorAll("button,input")) control.disabled = !online || value.busy;
    }
    localize() {
      for (const item of this.items.values()) this.renderItem(item);
      for (const value of this.requests.values()) {
        value.node.querySelector("h2").textContent = this.t(value.request.kind === "questions" ? "chat_questions" : "chat_approval");
        for (const button of value.node.querySelectorAll("[data-request-action]")) button.textContent = this.t(button.dataset.requestAction);
      }
    }
  }
  window.BibimerConversation = Conversation;
})();
