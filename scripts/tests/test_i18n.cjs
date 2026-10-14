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
const locales = ["pt-BR", "es", "id"];
const placeholders = text => [...text.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();
const html = fs.readFileSync(path.join(assets, "index.html"), "utf8");
const native = fs.readFileSync(path.join(root, "android/app/src/main/java/app/bibimer/MainActivity.java"), "utf8");
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
assert.equal(i18n.language(), "en", "First run stays English regardless of system language");
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
for (const invalid of ["fr", "pt", "__proto__", null, undefined]) {
  i18n.setLanguage(invalid);
  assert.equal(i18n.language(), "en");
}
console.log(`i18n: ${Object.keys(base).length} keys × 5 locales; catalog coverage, interpolation, fallback, selection and asset loading passed`);
