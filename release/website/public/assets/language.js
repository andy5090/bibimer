(() => {
  "use strict";
  const storageKey = "bibimer.website.language";
  const labels = {
    en: ["Website language", "Search languages", "No matching languages"],
    ko: ["웹사이트 언어", "언어 검색", "일치하는 언어가 없습니다"],
    es: ["Idioma del sitio web", "Buscar idiomas", "No se encontraron idiomas"],
    "zh-Hans": ["网站语言", "搜索语言", "没有匹配的语言"],
    "pt-BR": ["Idioma do site", "Buscar idiomas", "Nenhum idioma encontrado"],
    id: ["Bahasa situs web", "Cari bahasa", "Tidak ada bahasa yang cocok"],
    ja: ["ウェブサイトの言語", "言語を検索", "一致する言語がありません"],
    "zh-Hant": ["網站語言", "搜尋語言", "沒有符合的語言"],
    fr: ["Langue du site", "Rechercher une langue", "Aucune langue correspondante"],
    de: ["Sprache der Website", "Sprachen suchen", "Keine passende Sprache gefunden"],
  };

  function matchLanguage(preferences, available) {
    for (const preference of preferences) {
      if (typeof preference !== "string") continue;
      const tag = preference.toLowerCase().replaceAll("_", "-");
      const exact = available.find((locale) => locale.toLowerCase() === tag);
      if (exact) return exact;
      const parts = tag.split("-");
      const base = parts[0] === "in" ? "id" : parts[0];
      if (base === "zh") {
        const script = parts.includes("hant") ? "hant" : parts.includes("hans") ? "hans"
          : parts.some((part) => ["tw", "hk", "mo"].includes(part)) ? "hant" : "hans";
        const chinese = available.find((locale) => locale.toLowerCase() === `zh-${script}`);
        if (chinese) return chinese;
        continue;
      }
      const related = available.find((locale) => locale.toLowerCase().split("-")[0] === base);
      if (related) return related;
    }
    return available.includes("en") ? "en" : available[0];
  }

  const nav = document.querySelector(".language-nav");
  if (!nav) return;
  const links = [...nav.querySelectorAll("a[hreflang]")].filter((link) => {
    const url = new URL(link.href, location.href);
    return url.origin === location.origin && ["http:", "https:"].includes(url.protocol);
  });
  if (!links.length) return;
  const locales = links.map((link) => link.hreflang);
  let saved;
  try { saved = localStorage.getItem(storageKey); } catch (_) { /* Private storage can be unavailable. */ }
  if (["/", "/index.html", "/privacy/", "/privacy/index.html", "/guide/", "/guide/index.html", "/contact/", "/contact/index.html"].includes(location.pathname)) {
    const requested = new URL(location.href).searchParams.get("lang");
    const preferred = locales.includes(requested) ? requested : locales.includes(saved) ? saved
      : matchLanguage(navigator.languages || [navigator.language], locales);
    const target = new URL(links.find((link) => link.hreflang === preferred).href, location.href);
    const currentPath = location.pathname.replace(/index\.html$/, "");
    if (target.pathname !== currentPath) {
      target.search = location.search;
      target.hash = location.hash;
      location.replace(target.href);
      return;
    }
  }

  const current = links.find((link) => link.getAttribute("aria-current") === "page") || links[0];
  const [languageLabel, searchLabel, emptyLabel] = labels[document.documentElement.lang] || labels.en;
  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "language-trigger";
  trigger.setAttribute("aria-expanded", "false");
  trigger.setAttribute("aria-controls", "website-language-panel");
  trigger.setAttribute("aria-label", `${languageLabel}: ${current.textContent.trim()}`);
  const selected = document.createElement("span");
  selected.lang = current.hreflang;
  selected.textContent = current.textContent.trim();
  const chevron = document.createElement("span");
  chevron.className = "language-chevron";
  chevron.setAttribute("aria-hidden", "true");
  chevron.textContent = "⌄";
  trigger.append(selected, chevron);
  const panel = document.createElement("div");
  panel.id = "website-language-panel";
  panel.className = "language-panel";
  panel.hidden = true;
  panel.setAttribute("role", "region");
  panel.setAttribute("aria-label", languageLabel);
  const search = document.createElement("input");
  search.type = "search";
  search.className = "language-search";
  search.placeholder = searchLabel;
  search.setAttribute("aria-label", searchLabel);
  search.autocomplete = "off";
  search.spellcheck = false;
  const options = document.createElement("div");
  options.className = "language-options";
  const empty = document.createElement("p");
  empty.className = "language-empty";
  empty.setAttribute("role", "status");
  empty.hidden = true;
  options.append(...links);
  panel.append(search, options, empty);
  nav.replaceChildren(trigger, panel);
  nav.classList.add("language-picker");

  function filter() {
    const query = search.value.trim().toLocaleLowerCase();
    for (const link of links) {
      link.hidden = !`${link.textContent} ${link.hreflang}`.toLocaleLowerCase().includes(query);
    }
    empty.hidden = links.some((link) => !link.hidden);
    empty.textContent = empty.hidden ? "" : emptyLabel;
  }
  function close(restoreFocus = false) {
    panel.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
    if (restoreFocus) trigger.focus();
  }
  function open() {
    panel.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    search.value = "";
    filter();
    search.focus();
  }
  trigger.addEventListener("click", () => panel.hidden ? open() : close());
  trigger.addEventListener("keydown", (event) => {
    if (["ArrowDown", "ArrowUp"].includes(event.key)) {
      event.preventDefault();
      open();
      const destination = event.key === "ArrowDown" ? links[0] : links[links.length - 1];
      destination.focus();
    }
  });
  search.addEventListener("input", filter);
  panel.addEventListener("keydown", (event) => {
    const visible = links.filter((link) => !link.hidden);
    if (event.key === "Escape") {
      event.preventDefault();
      close(true);
    } else if (["ArrowDown", "ArrowUp"].includes(event.key) && visible.length) {
      event.preventDefault();
      const index = visible.indexOf(document.activeElement);
      const next = index < 0 ? (event.key === "ArrowDown" ? 0 : visible.length - 1)
        : (index + (event.key === "ArrowDown" ? 1 : -1) + visible.length) % visible.length;
      visible[next].focus();
    } else if (["Home", "End"].includes(event.key) && document.activeElement !== search && visible.length) {
      event.preventDefault();
      visible[event.key === "Home" ? 0 : visible.length - 1].focus();
    }
  });
  nav.addEventListener("focusout", (event) => {
    if (event.relatedTarget && !nav.contains(event.relatedTarget)) close();
  });
  document.addEventListener("pointerdown", (event) => {
    if (!nav.contains(event.target)) close();
  });
  for (const link of links) {
    link.addEventListener("click", () => {
      try {
        localStorage.setItem(storageKey, link.hreflang);
      } catch (_) {
        // Keep an explicit English choice usable when storage is blocked.
        const target = new URL(link.href, location.href);
        target.searchParams.set("lang", link.hreflang);
        link.href = target.href;
      }
    });
  }
})();
