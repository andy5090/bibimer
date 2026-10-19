"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const source = fs.readFileSync(path.join(__dirname, "../../release/website/public/assets/language.js"), "utf8");
const locales = ["en", "ko", "es", "zh-Hans", "pt-BR", "id", "ja", "zh-Hant", "fr", "de"];
const names = ["English", "한국어", "Español", "简体中文", "Português (Brasil)", "Bahasa Indonesia", "日本語", "繁體中文", "Français", "Deutsch"];
const matcher = source.slice(source.indexOf("  function matchLanguage("), source.indexOf("\n  const nav ="));
const match = vm.runInNewContext(`${matcher}; matchLanguage`);
for (const [preferred, expected] of [
  [["ko-KR"], "ko"], [["es-MX"], "es"], [["pt-PT"], "pt-BR"],
  [["in-ID"], "id"], [["zh-CN"], "zh-Hans"], [["zh-SG"], "zh-Hans"],
  [["zh-Hans-CN"], "zh-Hans"], [["zh-TW", "es"], "zh-Hant"],
  [["zh-Hant"], "zh-Hant"], [["de-DE", "ko"], "de"], [["fr-CA"], "fr"],
  [["ja-JP"], "ja"], [["zh-HK"], "zh-Hant"], [["zh-MO"], "zh-Hant"],
  [["zh-Hans-HK"], "zh-Hans"], [["zh-Hant-CN"], "zh-Hant"], [["ar", "fr"], "fr"],
  [[null, "es"], "es"], [["PT_br"], "pt-BR"], [[], "en"],
]) assert.equal(match(preferred, locales), expected, JSON.stringify(preferred));
assert.equal(match(["zh-TW"], [...locales, "zh-Hant"]), "zh-Hant");

function fixture({ pathname = "/", languages = ["en"], saved = null, blocked = false, pageLanguage = "en", query = "", hash = "" } = {}) {
  let document;
  class Element {
    constructor(tag) { this.tagName = tag; this.attributes = {}; this.children = []; this.events = {}; this.hidden = false; this.textContent = ""; this.value = ""; this.classList = { add() {} }; }
    setAttribute(key, value) { this.attributes[key] = value; }
    getAttribute(key) { return this.attributes[key]; }
    append(...items) { this.children.push(...items); }
    replaceChildren(...items) { this.children = items; }
    contains(target) { return target === this || this.children.some((child) => child.contains(target)); }
    addEventListener(name, fn) { this.events[name] = fn; }
    focus() { document.activeElement = this; }
  }
  const links = locales.map((locale, index) => {
    const link = new Element("a");
    const privacy = ["privacy", "guide", "contact"].find((part) => pathname.includes(`/${part}/`));
    const suffix = privacy ? `${privacy}/` : "";
    link.href = `https://bibimer.app/${locale === "en" ? "" : `${locale}/`}${suffix}`;
    link.hreflang = locale;
    link.textContent = names[index];
    if (locale === pageLanguage) link.setAttribute("aria-current", "page");
    return link;
  });
  const nav = new Element("nav");
  nav.append(...links);
  nav.querySelectorAll = () => links;
  document = {
    documentElement: { lang: pageLanguage }, activeElement: null, events: {},
    querySelector: () => nav,
    createElement: (tag) => new Element(tag),
    addEventListener(name, callback) { this.events[name] = callback; },
  };
  let redirected;
  const location = { pathname, origin: "https://bibimer.app", search: query, hash,
    href: `https://bibimer.app${pathname}${query}${hash}`, replace(url) { redirected = url; } };
  const storage = new Map(saved === null ? [] : [["bibimer.website.language", saved]]);
  vm.runInNewContext(source, { document, location, navigator: { languages }, URL,
    localStorage: { getItem(key) { if (blocked) throw Error("blocked"); return storage.get(key); },
      setItem(key, value) { if (blocked) throw Error("blocked"); storage.set(key, value); } },
  });
  return { nav, links, document, storage, redirected };
}
assert.equal(fixture({ languages: ["ko-KR"] }).redirected, "https://bibimer.app/ko/");
assert.equal(fixture({ pathname: "/privacy/index.html", languages: ["pt-PT"], query: "?source=footer", hash: "#contact" }).redirected, "https://bibimer.app/pt-BR/privacy/?source=footer#contact");
assert.equal(fixture({ languages: ["ko"], saved: "es" }).redirected, "https://bibimer.app/es/");
assert.equal(fixture({ languages: ["ko"], saved: "en" }).redirected, undefined);
assert.equal(fixture({ languages: ["ko"], blocked: true, query: "?lang=en" }).redirected, undefined);
assert.equal(fixture({ languages: ["ko"], query: "?lang=https://other.example/" }).redirected, "https://bibimer.app/ko/?lang=https://other.example/");
assert.equal(fixture({ languages: ["ko"], saved: "unsupported" }).redirected, "https://bibimer.app/ko/");
assert.equal(fixture({ pathname: "/es/", languages: ["ko"], saved: "id", pageLanguage: "es" }).redirected, undefined);
assert.equal(fixture({ pathname: "/index.html", languages: ["en"] }).redirected, undefined);
assert.equal(fixture({ languages: ["ko"], blocked: true }).redirected, "https://bibimer.app/ko/");
assert.equal(fixture({ pathname: "/contact/", languages: ["ko-KR"], query: "?category=privacy" }).redirected, "https://bibimer.app/ko/contact/?category=privacy");
assert.equal(fixture({ pathname: "/contact/index.html", languages: ["en"], saved: "de" }).redirected, "https://bibimer.app/de/contact/");
assert.equal(fixture({ pathname: "/ko/contact/", languages: ["en"], pageLanguage: "ko" }).redirected, undefined);
const f = fixture();
const [trigger, panel] = f.nav.children;
const [search, options, empty] = panel.children;
assert.equal(panel.hidden, true);
assert.deepEqual(options.children, f.links, "Original links are moved rather than duplicated");
trigger.events.click();
assert.equal(panel.hidden, false);
assert.equal(f.document.activeElement, search);
assert.equal(trigger.getAttribute("aria-expanded"), "true");
search.value = "portugu";
search.events.input();
assert.deepEqual(f.links.filter((link) => !link.hidden).map((link) => link.hreflang), ["pt-BR"]);
let prevented = false;
panel.events.keydown({ key: "ArrowDown", preventDefault() { prevented = true; } });
assert.equal(prevented, true);
assert.equal(f.document.activeElement, f.links[4]);
search.value = "does-not-exist";
search.events.input();
assert.equal(empty.hidden, false);
assert.equal(empty.textContent, "No matching languages");
panel.events.keydown({ key: "Escape", preventDefault() {} });
assert.equal(panel.hidden, true);
assert.equal(f.document.activeElement, trigger);
trigger.events.keydown({ key: "ArrowUp", preventDefault() {} });
assert.equal(f.document.activeElement, f.links.at(-1));
f.document.events.pointerdown({ target: {} });
assert.equal(panel.hidden, true);
trigger.events.click();
f.nav.events.focusout({ relatedTarget: {} });
assert.equal(panel.hidden, true);
f.links[0].events.click();
assert.equal(f.storage.get("bibimer.website.language"), "en");
const blocked = fixture({ pathname: "/ko/", pageLanguage: "ko", blocked: true });
assert.doesNotThrow(() => blocked.links[0].events.click());
assert.equal(blocked.links[0].href, "https://bibimer.app/?lang=en");
console.log("Website language: locale matching, saved preference, entry routes, safe redirects, disclosure/search/keyboard/focus and storage fallback passed");
