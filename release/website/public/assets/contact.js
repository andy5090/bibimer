(() => {
  "use strict";
  const form = document.getElementById("contact-form");
  if (!form) return;
  const trigger = document.getElementById("category-trigger");
  const list = document.getElementById("category-options");
  const options = [...list.querySelectorAll('[role="option"]')];
  const category = form.elements.category;
  const customField = document.getElementById("custom-category-field");
  const custom = form.elements.customCategory;
  const submit = document.getElementById("contact-submit");
  const status = document.getElementById("contact-status");
  const success = document.getElementById("contact-success");
  let pending = false;
  let lastPayload = "";
  let requestId = "";
  let search = "";
  let searchAt = 0;

  function close(restoreFocus = false) {
    list.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
    if (restoreFocus) trigger.focus();
  }
  function open(index = options.findIndex((option) => option.dataset.value === category.value)) {
    list.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    options[index].focus();
  }
  function select(value, restoreFocus = false) {
    const selected = options.find((option) => option.dataset.value === value);
    if (!selected) return;
    category.value = value;
    document.getElementById("category-value").textContent = selected.textContent;
    for (const option of options) option.setAttribute("aria-selected", String(option === selected));
    customField.hidden = value !== "other";
    custom.required = value === "other";
    close(restoreFocus);
  }
  select(new URL(location.href).searchParams.get("category") || "bug");
  trigger.addEventListener("click", () => list.hidden ? open() : close());
  trigger.addEventListener("keydown", (event) => {
    if (["ArrowDown", "ArrowUp"].includes(event.key)) {
      event.preventDefault();
      open(event.key === "ArrowUp" ? options.length - 1 : undefined);
    }
  });
  for (const option of options) option.addEventListener("click", () => select(option.dataset.value, true));
  list.addEventListener("keydown", (event) => {
    let index = options.indexOf(document.activeElement);
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      index = event.key === "Home" ? 0 : event.key === "End" ? options.length - 1
        : (index + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length;
      options[index].focus();
    } else if (["Enter", " "].includes(event.key)) {
      event.preventDefault();
      if (index >= 0) select(options[index].dataset.value, true);
    } else if (event.key === "Escape") {
      event.preventDefault();
      close(true);
    } else if (event.key === "Tab") {
      // Options are not in the Tab order; continue from the trigger naturally.
      close(true);
    } else if (event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
      event.preventDefault();
      search = Date.now() - searchAt > 700 ? event.key : search + event.key;
      searchAt = Date.now();
      const match = options.find((option) => option.textContent.trim().toLocaleLowerCase().startsWith(search.toLocaleLowerCase()));
      if (match) match.focus();
    }
  });
  document.addEventListener("pointerdown", (event) => {
    if (!event.target.closest(".category-picker")) close();
  });
  form.querySelector(".category-picker").addEventListener("focusout", (event) => {
    if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) close();
  });
  function showError(key) {
    status.textContent = form.dataset[key] || form.dataset.error;
    status.hidden = false;
    status.focus();
  }
  form.addEventListener("input", (event) => {
    if (event.target.willValidate && event.target.validity.valid) event.target.removeAttribute("aria-invalid");
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (pending || form.hidden) return;
    const payload = {
      category: category.value,
      customCategory: category.value === "other" ? custom.value.trim() : "",
      subject: form.elements.subject.value.trim(),
      message: form.elements.message.value.trim(),
      email: form.elements.email.value.trim(),
      locale: document.documentElement.lang,
      consent: form.elements.consent.checked,
      website: form.elements.website.value,
    };
    const fields = [...form.querySelectorAll("input, textarea")];
    for (const field of fields) {
      if (field.willValidate) field.setAttribute("aria-invalid", String(!field.validity.valid));
    }
    if (!form.checkValidity() || !payload.subject || payload.message.length < 10
      || (payload.category === "other" && !payload.customCategory)) {
      showError("invalid");
      return;
    }
    const serialized = JSON.stringify(payload);
    if (serialized !== lastPayload) {
      requestId = crypto.randomUUID();
      lastPayload = serialized;
    }
    pending = true;
    close();
    const controls = [...form.querySelectorAll("input, textarea, button")];
    for (const control of controls) control.disabled = true;
    submit.textContent = form.dataset.sending;
    form.setAttribute("aria-busy", "true");
    status.hidden = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch("/api/contact", {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "same-origin", signal: controller.signal,
        body: JSON.stringify({ requestId, ...payload }),
      });
      const result = await response.json();
      if (response.status === 202 && result.ok === true && result.requestId === requestId) {
        document.getElementById("contact-receipt").textContent = result.requestId;
        form.hidden = true;
        success.hidden = false;
        success.focus();
      } else {
        showError(result.error === "rate_limited" ? "limited" : result.error === "id_conflict" ? "conflict"
          : ["invalid_request", "payload_too_large"].includes(result.error) ? "invalid" : "error");
      }
    } catch (_) {
      showError("error");
    } finally {
      clearTimeout(timeout);
      pending = false;
      for (const control of controls) control.disabled = false;
      submit.textContent = form.dataset.send;
      form.removeAttribute("aria-busy");
    }
  });
  document.getElementById("contact-new").addEventListener("click", () => {
    form.reset();
    for (const field of form.querySelectorAll("[aria-invalid]")) field.removeAttribute("aria-invalid");
    select("bug");
    lastPayload = "";
    requestId = "";
    status.hidden = true;
    success.hidden = true;
    form.hidden = false;
    trigger.focus();
  });
  form.hidden = false;
})();
