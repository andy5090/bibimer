#!/usr/bin/env node
"use strict";
// Isolated contact UI contract: no real database, Discord, or network services.
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const http = require("node:http");
const { chromium } = require("../.tools/ui/node_modules/playwright-core");
const root = path.resolve(__dirname, "../release/website/public");
const screenshots = path.resolve(__dirname, "../dist/website-contact");
const locales = ["en", "ko", "es", "pt-BR", "id", "zh-Hans", "ja", "zh-Hant", "fr", "de"];
let behavior = "success";
let requests = [];
const server = http.createServer(async (req, res) => {
  if (req.url === "/api/contact") {
    let body = "";
    for await (const chunk of req) body += chunk;
    const payload = JSON.parse(body);
    requests.push(payload);
    if (behavior === "timeout") return;
    if (behavior === "delay") await new Promise((resolve) => setTimeout(resolve, 200));
    const code = behavior === "error" ? 503 : behavior === "rate" ? 429 : behavior === "conflict" ? 409 : 202;
    res.writeHead(code, { "Content-Type": "application/json" });
    res.end(JSON.stringify(code === 202 ? { ok: true, requestId: payload.requestId }
      : { ok: false, error: behavior === "rate" ? "rate_limited" : behavior === "conflict" ? "id_conflict" : "unavailable" }));
    return;
  }
  try {
    let target = new URL(req.url, "http://localhost").pathname;
    if (target.endsWith("/")) target += "index.html";
    const file = path.resolve(root, `.${target}`);
    assert.ok(file.startsWith(`${root}${path.sep}`));
    const content = await fs.readFile(file);
    const type = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png" }[path.extname(file)] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": type }); res.end(content);
  } catch (_) { res.writeHead(404); res.end(); }
});
(async () => {
  await fs.mkdir(screenshots, { recursive: true });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ executablePath: process.env.BIBIMER_CHROMIUM || path.resolve(__dirname, "../.tools/mac-ui/bin/headless_shell"), headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1100, height: 1000 }, locale: "en-US" });
    const page = await context.newPage();
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    const goto = async (locale = "en", query = "") => {
      await page.goto(`${base}/${locale === "en" ? "" : `${locale}/`}contact/${query}`);
      await page.locator("#contact-form").waitFor({ state: "visible" });
    };
    const fill = async () => {
      await page.locator('[name="message"]').fill("A sufficiently detailed question for testing.");
      await page.locator('[name="consent"]').check();
    };
    await goto("en", "?category=privacy");
    assert.equal(await page.locator('[name="category"]').inputValue(), "privacy");
    assert.equal(await page.locator("select").count(), 0);
    assert.equal(await page.locator('[name="website"]').getAttribute("tabindex"), "-1");
    const trigger = page.locator("#category-trigger");
    await trigger.focus(); await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Home"); await page.keyboard.press("End"); await page.keyboard.press("Enter");
    assert.equal(await page.locator('[name="category"]').inputValue(), "other");
    assert.equal(await page.locator('[name="customCategory"]').evaluate((el) => el.required), true);
    assert.equal(await trigger.evaluate((el) => document.activeElement === el), true);
    await trigger.click(); await page.keyboard.press("Escape");
    assert.equal(await trigger.getAttribute("aria-expanded"), "false");
    assert.equal(await trigger.evaluate((el) => document.activeElement === el), true);
    await trigger.click(); await page.locator("h1").click();
    assert.equal(await trigger.getAttribute("aria-expanded"), "false");
    await trigger.click(); await page.keyboard.press("Home"); await page.keyboard.press("f");
    assert.equal(await page.evaluate(() => document.activeElement.dataset.value), "feature");
    await page.keyboard.press("Tab");
    assert.equal(await page.locator('[name="customCategory"]').evaluate((el) => document.activeElement === el), true);
    await fill();
    await page.locator("#contact-submit").click();
    assert.equal(requests.length, 0, "Other requires a custom category");
    assert.equal(await page.locator("#contact-status").isVisible(), true);
    assert.equal(await page.locator('[name="customCategory"]').getAttribute("aria-invalid"), "true");
    await page.locator('[name="customCategory"]').fill("Account question");
    await page.locator('[name="email"]').fill("bad-email");
    await page.locator("#contact-submit").click();
    assert.equal(requests.length, 0, "Malformed email must not be sent");
    await page.locator('[name="email"]').fill("");
    behavior = "error";
    await page.locator("#contact-submit").click();
    await page.locator("#contact-status").waitFor({ state: "visible" });
    assert.equal(requests.length, 1);
    const firstId = requests[0].requestId;
    assert.match(firstId, /^[\da-f-]{36}$/);
    assert.equal(requests[0].email, "");
    assert.equal(Object.hasOwn(requests[0], "subject"), false);
    assert.equal(requests[0].consent, true);
    assert.equal(await page.locator('[name="message"]').inputValue(), "A sufficiently detailed question for testing.");
    behavior = "timeout";
    await page.locator("#contact-submit").click();
    await page.waitForFunction(() => !document.getElementById("contact-submit").disabled, { timeout: 18000 });
    assert.equal(requests.length, 2);
    assert.equal(requests[1].requestId, firstId, "Retry after failure retains its UUID");
    assert.equal(await page.locator("#contact-status").isVisible(), true);
    await page.locator('[name="message"]').fill("An edited detailed contact message for testing.");
    behavior = "delay";
    await page.locator("#contact-submit").evaluate((button) => { button.click(); button.click(); });
    await page.locator("#contact-success").waitFor({ state: "visible" });
    assert.equal(requests.length, 3, "Double click sends once");
    assert.notEqual(requests[2].requestId, firstId, "Edited payload has a new UUID");
    assert.equal(await page.locator("#contact-receipt").innerText(), requests[2].requestId);
    await page.locator("#contact-submit").evaluate((button) => button.click());
    assert.equal(requests.length, 3, "Success prevents accidental resend");
    await page.locator("#contact-new").click();
    assert.equal(await page.locator('[name="message"]').inputValue(), "");
    assert.equal(await page.locator('[name="consent"]').isChecked(), false);
    assert.equal(await page.locator('[name="category"]').inputValue(), "bug");
    behavior = "success";
    await fill(); await page.locator('[name="email"]').fill("person@example.com");
    await page.locator("#contact-submit").click();
    await page.locator("#contact-success").waitFor({ state: "visible" });
    assert.equal(requests[3].email, "person@example.com");
    assert.notEqual(requests[3].requestId, requests[2].requestId);
    for (const locale of locales) {
      await page.setViewportSize({ width: 320, height: 850 });
      await goto(locale);
      await page.evaluate(() => document.fonts.ready);
      assert.equal(await page.locator("html").getAttribute("lang"), locale);
      assert.equal(await page.locator('[name="subject"]').count(), 0);
      assert.equal(await page.locator('link[rel="alternate"][hreflang]').count(), 11);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${locale} 320px overflow`);
      await page.screenshot({ path: path.join(screenshots, `${locale}-320.png`), fullPage: true });
      await trigger.click();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${locale} dropdown overflow`);
      await page.keyboard.press("Escape");
    }
    await page.setViewportSize({ width: 1100, height: 1000 });
    await goto("ko");
    await page.screenshot({ path: path.join(screenshots, "ko-desktop.png"), fullPage: true });
    await page.goto(`${base}/ko/guide/`);
    await page.screenshot({ path: path.join(screenshots, "ko-guide-reference.png"), fullPage: true });
    assert.deepEqual(pageErrors, []);
    const noJs = await browser.newContext({ javaScriptEnabled: false });
    const fallback = await noJs.newPage();
    await fallback.goto(`${base}/ko/contact/`);
    assert.equal(await fallback.locator("noscript").isVisible(), true);
    assert.equal(await fallback.locator("#contact-form").isVisible(), false);
    await noJs.close();
    console.log("Contact UI passed: category keyboard/focus/outside/Escape/typeahead/Tab, validation/privacy preselection, optional email, stable retries/timeout, edited UUID, double-submit and success guards, noscript, 10 locales at 320px, screenshots.");
  } finally { await browser.close(); server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); }
})().catch((error) => { console.error(error); server.closeAllConnections(); server.close(); process.exitCode = 1; });
