"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "../..");
const assets = path.join(root, "android/app/src/main/assets");
const source = fs.readFileSync(path.join(assets, "i18n.js"), "utf8");
const baseStart = source.indexOf("const strings = ") + "const strings = ".length;
const baseEnd = source.indexOf("\n  };", baseStart) + "\n  }".length;
const base = vm.runInNewContext(`(${source.slice(baseStart, baseEnd)})`);
assert.ok(Object.keys(base).length > 500, "Read the complete base catalog");
const locales = ["pt-BR", "es", "id", "zh-Hans", "ja", "zh-Hant", "fr", "de"];
const placeholders = text => [...text.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();
const html = fs.readFileSync(path.join(assets, "index.html"), "utf8");
const native = fs.readFileSync(path.join(root, "android/app/src/main/java/app/bibimer/MainActivity.java"), "utf8");
assert.ok(html.includes('value="system" data-i18n="language_system"'), "System choice is localized");
const context = vm.createContext({window:{}, navigator:{language:"es"}});
for (const locale of locales) {
  const filename = `i18n-${locale}.js`;
  const catalogSource = fs.readFileSync(path.join(assets, filename), "utf8");
  const keys = [...catalogSource.matchAll(/^\s+(?:"([^"]+)"|(\w+)):/gm)].map(match => match[1] || match[2]);
  assert.equal(new Set(keys).size, keys.length, `${locale}: duplicate keys`);
  vm.runInContext(catalogSource, context, {filename});
  const catalog = context.window.BibimerTranslations[locale];
  assert.deepEqual(Object.keys(catalog).sort(), Object.keys(base).sort(), `${locale}: complete key set`);
  for (const [key, text] of Object.entries(catalog)) {
    assert.equal(typeof text, "string");
    assert.ok(text.trim(), `${locale}.${key}: nonempty translation`);
    assert.deepEqual(placeholders(text), placeholders(base[key][0]), `${locale}.${key}: interpolation`);
  }
  assert.ok(html.indexOf(`src="${filename}"`) < html.indexOf('src="i18n.js"'), `${locale}: load before runtime`);
  assert.ok(native.includes(`"${filename}"`), `${locale}: Android asset allowlist`);
  assert.ok(html.includes(`value="${locale}" lang="${locale}"`), `${locale}: selectable using its native name`);
}
vm.runInContext(source, context);
const i18n = context.window.BibimerI18n;
assert.equal(i18n.language(), "en", "Translation runtime falls back to English until the native resolved language is applied");
assert.equal(i18n.t("language_label"), "Language");
for (const locale of ["ko", ...locales]) {
  i18n.setLanguage(locale);
  assert.equal(i18n.language(), locale);
  for (const [key, entry] of Object.entries(base)) {
    const text = locale === "ko" ? entry[1] : context.window.BibimerTranslations[locale][key];
    assert.deepEqual(placeholders(text), placeholders(entry[0]), `${locale}.${key}`);
    assert.equal(i18n.t(key), text, `${locale}.${key}: uses selected catalog`);
  }
  const account = "unchanged <account> & имя";
  assert.ok(i18n.t("github_connected", {account}).includes(account), "User values stay verbatim");
  assert.ok(i18n.t("inspect_updated", {time:0}).includes("0"), "Falsy substitution is preserved");
  assert.equal(i18n.errorKey({error:base.error_connection_failed[0]}), "error_connection_failed");
  assert.equal(i18n.errorKey({code:"error_connection_failed"}), "error_connection_failed");
}
const textNode = {dataset:{i18n:"language_label"}};
const input = {getAttribute:() => "github_filter", setAttribute(name,value) { this[name]=value; }};
context.document = {documentElement:{}, querySelectorAll(selector) {
  return selector === "[data-i18n]" ? [textNode] : selector === "[data-i18n-placeholder]" ? [input] : [];
}};
i18n.setLanguage("es"); i18n.apply();
assert.equal(context.document.documentElement.lang, "es");
assert.equal(textNode.textContent, context.window.BibimerTranslations.es.language_label);
assert.equal(input.placeholder, context.window.BibimerTranslations.es.github_filter);
delete context.window.BibimerTranslations.es.language_label;
assert.equal(i18n.t("language_label"), "Language", "Missing translation falls back to English");
assert.equal(i18n.t("unknown_key"), "unknown_key");
for (const invalid of ["ar", "pt", "__proto__", null, undefined]) {
  i18n.setLanguage(invalid);
  assert.equal(i18n.language(), "en");
}
console.log(`i18n: ${Object.keys(base).length} keys × ${locales.length + 2} locales; catalog coverage, interpolation, fallback, selection and asset loading passed`);

// Exercise the actual UI controller: native resolves the device preference list;
// a locale refresh must not reconnect, start sessions or overwrite user drafts.
const appSource = fs.readFileSync(path.join(assets, "app.js"), "utf8");
const refresh = appSource.match(/  function refreshLanguage\(force = false\) \{[\s\S]*?\n  \}/);
const change = appSource.match(/  \$\("language"\)\.addEventListener\("change", \(\) => \{[\s\S]*?\n  \}\);/);
assert.ok(refresh); assert.ok(change);
let env = {language:"ko", languagePreference:"system"}, rendered = 0, saved = true, listener, warning;
const languageControl = {value:"system", addEventListener(event, handler) { listener = handler; }};
const draft = {text:"原文 · 초안 · unsent", session:"existing-session"};
const ui = vm.createContext({
  languagePreference:"system", i18n, environment:() => env,
  renderLanguage() { rendered++; languageControl.value = env.languagePreference; },
  $:() => languageControl, pickers:{sync() {}}, notice(key) { warning = key; }, draft,
  native:{setLanguage(value) {
    if (!saved) return false;
    env = {languagePreference:value, language:value === "system" ? "zh-Hans" : value};
    return true;
  }}
});
vm.runInContext(refresh[0] + "\n" + change[0], ui);
vm.runInContext("refreshLanguage(true)", ui);
assert.equal(i18n.language(), "ko"); assert.equal(ui.languagePreference, "system");
const initialRenders = rendered;
vm.runInContext("refreshLanguage()", ui); assert.equal(rendered, initialRenders);
env = {language:"es", languagePreference:"system"};
vm.runInContext("refreshLanguage()", ui); assert.equal(i18n.language(), "es");
languageControl.value = "en"; listener(); assert.equal(i18n.language(), "en");
assert.equal(ui.languagePreference, "en");
languageControl.value = "system"; listener(); assert.equal(i18n.language(), "zh-Hans");
assert.equal(ui.languagePreference, "system");
saved = false; languageControl.value = "pt-BR"; listener();
assert.equal(i18n.language(), "zh-Hans"); assert.equal(languageControl.value, "system");
assert.equal(warning, "language_save_failed");
assert.deepEqual(draft, {text:"原文 · 초안 · unsent", session:"existing-session"});
const manifest = fs.readFileSync(path.join(root, "android/app/src/main/AndroidManifest.xml"), "utf8");
const changes = manifest.match(/android:configChanges="([^"]+)"/)[1].split("|");
assert.ok(changes.includes("locale") && changes.includes("layoutDirection"), "Language changes preserve the Activity and WebView");
assert.ok(native.includes("window.BibimerRefreshLanguage"), "Native lifecycle refreshes language without reloading the WebView");
console.log("Language UI: resolved system preference, manual override, dynamic refresh, failed save and preserved draft passed");
