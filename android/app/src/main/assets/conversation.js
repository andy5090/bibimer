"use strict";
(() => {
  const {make, markdown, codeBlock, copyButton, diffBlock, diffBadge} = window.BibimerRichText;
  class Conversation {
    constructor(root, prompts, t, respond) {
      this.root = root; this.prompts = prompts; this.t = t; this.respond = respond;
      this.items = new Map(); this.cards = new Map(); this.requests = new Map();
      this.online = false;
      this.latest = document.getElementById("chat-latest");
      this.root.addEventListener("scroll", () => this.scrollState());
      this.latest.onclick = () => { this.root.scrollTop = this.root.scrollHeight; this.scrollState(); };
    }
    scrollState() {
      this.latest.hidden = this.root.scrollHeight - this.root.scrollTop - this.root.clientHeight < 80;
    }
    clear(keepRequests = false) {
      this.items.clear(); this.cards.clear(); this.root.replaceChildren();
      this.latest.hidden = true;
      if (!keepRequests) { this.requests.clear(); this.prompts.replaceChildren(); }
    }
    update(event) {
      const follow = this.root.scrollHeight - this.root.scrollTop - this.root.clientHeight < 80;
      const edge = this.root.getBoundingClientRect().top;
      const anchor = [...this.cards.values()].find(card => !card.hidden && card.getBoundingClientRect().bottom > edge);
      const anchorTop = anchor?.getBoundingClientRect().top;
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
      else if (anchor?.isConnected) this.root.scrollTop += anchor.getBoundingClientRect().top - anchorTop;
      this.scrollState();
    }
    renderItem(item) {
      let card = this.cards.get(item.id);
      if (!card) {
        const kind = ["user", "assistant", "command", "diff", "tool", "plan", "notice", "turn"].includes(item.kind) ? item.kind : "tool";
        card = make("article", undefined, "message " + kind);
        this.cards.set(item.id, card); this.root.append(card);
      }
      const detailsState = new Map([...card.querySelectorAll("details")].map(node => [node.dataset.view, node.open]));
      const codeState = [...card.querySelectorAll(".code-block")].map(node => ({wrapped:node.classList.contains("wrapped"), left:node.querySelector("pre").scrollLeft}));
      card.replaceChildren();
      card.dataset.status = item.status || "";
      // Keep the item in order so a later public summary can reveal it.
      // Empty reasoning events from live or imported history have no UI content.
      card.hidden = item.kind === "plan" && item.summary === true && !(item.text || "").trim() && !item.steps?.length;
      if (card.hidden) return;
      const status = () => make("span", item.status ? this.t("chat_status_" + item.status) : "", "item-status");
      const detail = (key, title, opened = false) => {
        const node = make("details"); node.dataset.view = key;
        node.open = detailsState.has(key) ? detailsState.get(key) : opened;
        const summary = make("summary"); summary.append(make("span", title, "activity-title"));
        node.append(summary); return node;
      };
      if (["command", "tool"].includes(item.kind)) {
        const details = detail("activity", item.title || this.t("chat_" + item.kind));
        const summary = details.querySelector("summary");
        summary.prepend(make("span", item.kind === "command" ? "›_" : "◇", "activity-icon"));
        const succeeded = item.kind === "command" && item.status === "completed" && item.exit_code === 0;
        const failed = item.kind === "command" && (item.status === "failed" ||
          (item.status === "completed" && Number.isInteger(item.exit_code) && item.exit_code !== 0));
        const result = status();
        if (succeeded) {
          result.textContent = this.t("command_succeeded");
          result.classList.add("succeeded");
          result.title = this.t("exit_code", {code:0});
        } else if (failed) {
          result.textContent = this.t("chat_status_failed");
          result.classList.add("failed");
        }
        summary.append(result);
        if (!succeeded && item.exit_code !== undefined && item.exit_code !== null) {
          summary.append(make("span", this.t(failed ? "command_failure_code" : "exit_code", {code:item.exit_code}), "exit-code" + (failed || item.exit_code ? " failed" : "")));
        } else if (failed) {
          summary.append(make("span", this.t("command_failure_code_unavailable"), "exit-code failed unavailable"));
        }
        if (item.kind === "command" && item.title) details.append(codeBlock(item.title, "bash", this.t));
        if (item.text) details.append(codeBlock(item.text, item.kind === "tool" && /^[{[]/.test(item.text.trim()) ? "json" : "", this.t));
        else details.append(make("p", this.t("tool_no_output"), "activity-empty"));
        card.append(details);
      } else if (item.kind === "diff") {
        const details = detail("changes", item.title || this.t("chat_diff"), true);
        details.querySelector("summary").prepend(make("span", "±", "activity-icon"));
        const changes = Array.isArray(item.changes) ? item.changes : [{path:this.t("chat_diff"), diff:item.text || ""}];
        details.querySelector("summary").append(diffBadge(changes.map(change => change.diff).join("\n")), status());
        for (const [index, change] of changes.entries()) {
          const file = detail("file-"+index, change.path, changes.length === 1 && change.diff.split("\n").length < 16);
          file.className = "file-change";
          file.querySelector("summary").append(diffBadge(change.diff));
          file.append(diffBlock(change.diff, this.t)); details.append(file);
        }
        if (item.truncated) details.append(make("p", this.t("diff_truncated"), "activity-empty"));
        card.append(details);
      } else if (item.kind === "plan") {
        const steps = item.steps;
        const details = detail("plan", this.t(item.summary ? "chat_summary" : "chat_plan"), !item.summary);
        details.querySelector("summary").prepend(make("span", item.summary ? "◇" : "☷", "activity-icon"));
        if (steps?.length) {
          details.querySelector("summary").append(make("span", steps.filter(step=>step.status === "completed").length + "/" + steps.length, "plan-count"));
          const list = make("ol", undefined, "plan-steps");
          for (const step of steps) {
            const state = ["completed", "in_progress"].includes(step.status) ? step.status : "pending";
            const li = make("li", undefined, state);
            const icon = make("span", state === "completed" ? "✓" : state === "in_progress" ? "◉" : "○", "plan-step-icon");
            icon.setAttribute("aria-label", this.t("plan_"+state));
            li.append(icon, make("span", step.step)); list.append(li);
          }
          details.append(list);
          if (item.explanation) details.append(markdown(item.explanation, this.t));
        } else details.append(markdown((item.text || "").replace(/^(\[[ xX]\] )/gm, "- $1"), this.t));
        card.append(details);
      } else if (item.kind === "turn") {
        const row = make("div", undefined, "turn-result");
        row.append(make("span", item.status === "completed" ? "✓" : "○"), status());
        card.append(row);
        if (item.text) card.append(make("div", item.text, "plain-message"));
      } else {
        const header = make("div", undefined, "message-heading");
        const identity = make("span", undefined, "message-identity");
        identity.append(make("span", item.kind === "assistant" ? "B" : item.kind === "user" ? "↑" : "!", "message-avatar"), make("span", this.t("chat_"+item.kind)));
        header.append(identity);
        if (item.status === "inProgress") header.append(status());
        if (item.text) header.append(copyButton(item.text, this.t, "copy_message"));
        card.append(header);
        if (item.kind === "assistant") card.append(markdown(item.text || "", this.t));
        else {
          if (item.code) card.append(make("p", this.t(item.code)));
          if (item.text) card.append(make("div", item.text, "plain-message"));
        }
      }
      [...card.querySelectorAll(".code-block")].forEach((node, index) => {
        if (codeState[index]?.wrapped) {
          node.classList.add("wrapped"); node.querySelector("[aria-pressed]").setAttribute("aria-pressed", "true");
        }
        node.querySelector("pre").scrollLeft = codeState[index]?.left || 0;
      });
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
          input.readOnly = question.isOther === false;
          input.bibimerSelections = [];
          if (question.multiple) {
            const hint = make("small", this.t("question_multiple")); hint.dataset.i18n = "question_multiple"; field.append(hint);
          }
          if (question.options?.length) {
            const choices = make("div", undefined, "question-options");
            for (const option of question.options) {
              const button = make("button", option.label); button.type = "button";
              if (option.description) button.append(make("small", option.description));
              if (question.multiple) { button.dataset.option = option.label; button.setAttribute("aria-pressed", "false"); }
              button.onclick = () => {
                if (question.multiple) {
                  const selected = new Set(input.bibimerSelections);
                  if (selected.has(option.label)) selected.delete(option.label); else selected.add(option.label);
                  input.bibimerSelections = [...selected]; input.value = input.bibimerSelections.join(", ");
                  input.bibimerRefresh();
                } else input.value = option.label;
                input.focus();
              };
              choices.append(button);
            }
            field.append(choices);
          }
          input.bibimerRefresh = () => { for (const button of field.querySelectorAll("[data-option]")) button.setAttribute("aria-pressed", String(input.bibimerSelections.includes(button.dataset.option))); };
          input.addEventListener("input", () => { input.bibimerSelections = []; input.bibimerRefresh(); });
          field.append(input); card.append(field); state.fields.set(question.id, input);
        }
        const send = make("button", this.t("chat_answer"), "primary"); send.type = "submit"; send.dataset.requestAction = "chat_answer"; card.append(send);
        card.onsubmit = event => { event.preventDefault(); this.answer(state, {answers:Object.fromEntries([...state.fields].map(([id,input])=>[id,input.bibimerSelections.length ? input.bibimerSelections : input.value]))}); };
      } else {
        if (params.reason) card.append(make("p", params.reason));
        if (params.command) card.append(codeBlock(params.command, "bash", this.t));
        if (params.cwd || params.grantRoot) {
          const folder = make("p", this.t("chat_folder") + ": ");
          folder.append(make("code", params.cwd || params.grantRoot)); card.append(folder);
        }
        if (request.preview) card.append(request.kind === "file" ? diffBlock(request.preview, this.t) : codeBlock(request.preview, "", this.t));
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
        for (const button of value.node.querySelectorAll("[data-label-key]")) {
          clearTimeout(button.copyTimer);
          button.textContent = this.t(button.dataset.labelKey);
          if (button.hasAttribute("aria-label")) button.setAttribute("aria-label", this.t(button.dataset.labelKey));
        }
      }
    }
  }
  window.BibimerConversation = Conversation;
})();
