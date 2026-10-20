"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { webcrypto, randomUUID } = require("node:crypto");

const root = path.join(__dirname, "../..");
const source = fs.readFileSync(path.join(root, "release/website/functions/api/contact.js"), "utf8");
const migration = fs.readFileSync(path.join(root, "release/website/migrations/0001_contact_inquiries.sql"), "utf8");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "bibimer-contact-api-"));
const originalFetch = global.fetch;
global.crypto ??= webcrypto;

// Execute the handler's actual bound SQL against stdlib SQLite. No npm packages,
// external webhook calls, Cloudflare credentials, or user database are used.
function python(code, input) {
  const result = spawnSync("python3", ["-c", code], { input: JSON.stringify(input), encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout ? JSON.parse(result.stdout) : null;
}
function database() {
  const file = path.join(temp, `${randomUUID()}.sqlite`);
  python("import json,sqlite3,sys; x=json.load(sys.stdin); c=sqlite3.connect(x['file']); c.executescript(x['schema']); c.close()", { file, schema: migration });
  return { file, prepare(sql) { return { bind(...args) { return {
    async run() { return execute(sql, args, false); },
    async first() { return execute(sql, args, true); },
  }; } }; } };
  function execute(sql, args, first) {
    return python(`import json,sqlite3,sys
x=json.load(sys.stdin)
c=sqlite3.connect(x['file']); c.row_factory=sqlite3.Row
r=c.execute(x['sql'],x['args'])
out=(dict(row) if (row:=r.fetchone()) else None) if x['first'] else {'success':True,'meta':{'changes':c.total_changes}}
c.commit(); c.close(); print(json.dumps(out))`, { file, sql, args, first });
  }
}
function rows(db) {
  return python("import json,sqlite3,sys; x=json.load(sys.stdin); c=sqlite3.connect(x['file']); c.row_factory=sqlite3.Row; print(json.dumps([dict(r) for r in c.execute('SELECT * FROM contact_inquiries ORDER BY created_at,request_id')])); c.close()", { file: db.file });
}
function payload(changes = {}) {
  return { requestId: randomUUID(), category: "bug", customCategory: "", subject: "First screen issue",
    message: "The first screen does not respond.", email: "", locale: "ko", consent: true, website: "", ...changes };
}
function request(data, options = {}) {
  const url = options.url || "https://bibimer.app/api/contact";
  const method = options.method || "POST";
  const headers = { Origin: new URL(url).origin, "Content-Type": "application/json", "CF-Connecting-IP": "192.0.2.5", ...options.headers };
  if (options.noOrigin) delete headers.Origin;
  return new Request(url, { method, headers, ...(method === "GET" ? {} : { body: options.body ?? JSON.stringify(data), duplex: "half" }) });
}

async function main() {
  const { onRequest, CONTACT_SQL } = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
  const webhookCalls = [];
  function workersRequest(url, options) {
    if (![undefined, "manual", "follow"].includes(options.redirect)) {
      throw new TypeError("Unsupported redirect mode");
    }
    return new Request(url, options);
  }
  global.fetch = async (url, options) => {
    workersRequest(url, options);
    webhookCalls.push({ url, options, body: JSON.parse(options.body) });
    return new Response("{}", { status: 200 });
  };
  await assert.rejects(global.fetch("https://discord.com/api/webhooks/123456/test-token", {
    method: "POST", redirect: "error", body: "{}",
  }), TypeError, "Model Workers rejecting error mode before network I/O");
  function environment(db = database(), extras = {}) {
    return { CONTACT_DB: db, CONTACT_RATE_KEY: "test-rate-secret-at-least-32-characters",
      DISCORD_WEBHOOK_URL: "https://discord.com/api/webhooks/123456/test-token", ...extras };
  }
  async function send(data, { env = environment(), ...options } = {}) {
    const pending = [];
    const result = await onRequest({ request: request(data, options), env,
      waitUntil(work) { pending.push(work); } });
    await Promise.all(pending);
    return { result, body: await result.json(), env };
  }

  // Full happy path, minimal fields, and content is only sent after DB commit.
  const db = database();
  const env = environment(db);
  const data = payload({ email: "reply@example.com", message: "@everyone <@1234> Please investigate this issue." });
  const startCalls = webhookCalls.length;
  let answer = await send(data, { env });
  assert.equal(answer.result.status, 202);
  assert.deepEqual(answer.body, { ok: true, requestId: data.requestId });
  assert.equal(answer.result.headers.get("Cache-Control"), "no-store");
  let saved = rows(db);
  assert.equal(saved.length, 1);
  assert.equal(saved[0].message, data.message);
  assert.equal(saved[0].email, "reply@example.com");
  assert.equal(saved[0].notification_status, "sent");
  assert.equal(saved[0].notification_attempts, 1);
  assert.match(saved[0].rate_hash, /^[a-f0-9]{64}$/);
  assert.match(saved[0].content_hash, /^[a-f0-9]{64}$/);
  assert.ok(!JSON.stringify(saved).includes("192.0.2.5"));
  assert.ok(!Object.keys(saved[0]).some((key) => /user_agent|ip_address/.test(key)));
  const sent = webhookCalls.at(-1);
  assert.equal(sent.url, "https://discord.com/api/webhooks/123456/test-token?wait=true");
  assert.deepEqual(sent.body.allowed_mentions, { parse: [] });
  assert.equal(sent.options.redirect, "manual");

  // Exact retries retain one receipt, one DB row, and one Discord notification.
  answer = await send(data, { env, headers: { "CF-Connecting-IP": "198.51.100.2" } });
  assert.equal(answer.result.status, 202);
  assert.equal(rows(db).length, 1);
  assert.equal(webhookCalls.length, startCalls + 1);
  answer = await send({ ...data, message: "A different valid message with the same ID." }, { env });
  assert.equal(answer.result.status, 409);
  assert.equal(answer.body.error, "id_conflict");
  assert.equal(webhookCalls.length, startCalls + 1);

  // New forms do not collect a subject; cached old forms remain compatible.
  for (const subject of [undefined, "", "   "]) {
    const current = payload({subject, message: "  문의 내용으로\n  구분할 수 있습니다.  "});
    const currentEnv = environment();
    const receipt = await send(current, {env: currentEnv});
    assert.equal(receipt.result.status, 202, "Subject must not be required");
    assert.equal(rows(currentEnv.CONTACT_DB)[0].subject, "문의 내용으로 구분할 수 있습니다.");
    assert.ok(!webhookCalls.at(-1).body.embeds[0].fields.some(field => field.name === "Subject"));
    const calls = webhookCalls.length;
    assert.equal((await send(current, {env: currentEnv})).result.status, 202);
    assert.equal(webhookCalls.length, calls, "Subjectless retries must not notify twice");
  }

  // Bad fields, bounds, unsupported locale, consent, honeypot, and null inputs.
  const invalid = [null, [], { category: "unsupported" }, { locale: "ko-KR" },
    { requestId: "not-a-uuid" }, { requestId: "a".repeat(36) }, { consent: false }, { consent: "true" },
    { website: "https://spam.example" }, { website: undefined }, { subject: "a".repeat(121) },
    { message: "short" }, { message: "a".repeat(5001) }, { message: "a\0".repeat(10) },
    { email: "invalid" }, { email: "a@b.c\r\nHeader: x" }, { email: `${"a".repeat(250)}@x.com` },
    { customCategory: "Not other" }, { category: "other", customCategory: "" },
    { category: "other", customCategory: "a".repeat(81) }, { category: "other", customCategory: null },
    { unexpected: "unrecognized field" }, { email: {} }, { customCategory: [] }, { subject: 1 },
  ];
  for (const bad of invalid) {
    const value = bad === null || Array.isArray(bad) ? bad : payload(bad);
    answer = await send(value, { env });
    assert.equal(answer.result.status, 400, JSON.stringify(bad));
  }
  assert.equal((await send({}, { env })).result.status, 400);
  for (const category of ["setup", "feature", "privacy", "other"]) {
    answer = await send(payload({ category, customCategory: category === "other" ? "Partnership" : "" }),
      { env: environment() });
    assert.equal(answer.result.status, 202, category);
  }
  for (const locale of ["en", "ko", "pt-BR", "es", "id", "zh-Hans", "ja", "zh-Hant", "fr", "de"]) {
    answer = await send(payload({ locale }), { env: environment() });
    assert.equal(answer.result.status, 202, locale);
  }

  // Method and same-origin policy, including preview/local development hosts.
  answer = await send(null, { method: "GET", env });
  assert.equal(answer.result.status, 405);
  assert.equal(answer.result.headers.get("Allow"), "POST");
  answer = await send(null, { method: "OPTIONS", env });
  assert.equal(answer.result.status, 405);
  for (const options of [{ noOrigin: true }, { headers: { Origin: "null" } },
    { headers: { Origin: "https://evil.example" } }, { headers: { Origin: "https://preview.bibimer.pages.dev" } },
    { url: "https://bibimer.app.evil.example/api/contact" },
    { url: "https://evilbibimer.pages.dev/api/contact" }, { url: "http://bibimer.app/api/contact" }]) {
    answer = await send(payload(), { env, ...options });
    assert.equal(answer.result.status, 403, JSON.stringify(options));
    assert.equal(answer.result.headers.get("Access-Control-Allow-Origin"), null);
  }
  for (const url of ["https://bibimer.pages.dev/api/contact", "https://abc.bibimer.pages.dev/api/contact",
    "http://localhost:8788/api/contact", "http://127.0.0.1:8788/api/contact", "http://[::1]:8788/api/contact"]) {
    answer = await send(payload(), { env: environment(), url });
    assert.equal(answer.result.status, 202, url);
  }
  for (const type of ["text/plain", "application/x-www-form-urlencoded", "application/json;garbage=x"]) {
    answer = await send(payload(), { env, headers: { "Content-Type": type } });
    assert.equal(answer.result.status, 415);
  }
  answer = await send(payload(), { env: environment(), headers: { "Content-Type": "application/json; charset=utf-8" } });
  assert.equal(answer.result.status, 202);
  answer = await send(null, { env, body: "not json" });
  assert.equal(answer.result.status, 400);
  answer = await send(null, { env, body: new Uint8Array([0xff, 0xfe]) });
  assert.equal(answer.result.status, 400);

  // Real body size, not Content-Length, is authoritative, including chunked input.
  const largeBytes = Buffer.from(JSON.stringify(payload({ message: "a".repeat(17000) })));
  let cancelled = false;
  const stream = new ReadableStream({
    start(controller) { controller.enqueue(largeBytes.subarray(0, 8000)); controller.enqueue(largeBytes.subarray(8000)); },
    cancel() { cancelled = true; },
  });
  answer = await send(null, { env, body: stream, headers: { "Content-Length": "10" } });
  assert.equal(answer.result.status, 413);
  assert.equal(cancelled, true);
  answer = await send(payload(), { env, headers: { "Content-Length": "20000" } });
  assert.equal(answer.result.status, 413);
  answer = await send(payload({ message: "あ".repeat(5000), subject: "あ".repeat(120) }), { env: environment() });
  assert.equal(answer.result.status, 202, "5000 multibyte chars below byte cap are stored");

  // Five accepted writes per rolling hour, atomic quota and HMAC bucket isolation.
  const rateDB = database();
  const rateEnv = environment(rateDB);
  const retryData = payload();
  for (let index = 0; index < 5; index += 1) {
    answer = await send(index === 0 ? retryData : payload(), { env: rateEnv });
    assert.equal(answer.result.status, 202);
  }
  answer = await send(payload(), { env: rateEnv });
  assert.equal(answer.result.status, 429);
  assert.equal(answer.result.headers.get("Retry-After"), "3600");
  answer = await send(retryData, { env: rateEnv });
  assert.equal(answer.result.status, 202, "Idempotent receipt survives a full quota");
  answer = await send(payload(), { env: rateEnv, headers: { "CF-Connecting-IP": "198.51.100.7" } });
  assert.equal(answer.result.status, 202);
  assert.equal(new Set(rows(rateDB).map((row) => row.rate_hash)).size, 2);
  await rateDB.prepare("UPDATE contact_inquiries SET created_at = ?1").bind(Date.now() - 3600001).run();
  answer = await send(payload(), { env: rateEnv });
  assert.equal(answer.result.status, 202, "Rolling hour expires");

  // Actual SQLite concurrent writes prove the conditional INSERT cannot exceed 5.
  const concurrency = python(`import concurrent.futures,json,sqlite3,sys,time,uuid
x=json.load(sys.stdin); db=x['file']; now=int(time.time()*1000)
def insert(i):
 c=sqlite3.connect(db,timeout=20)
 c.execute(x['sql'],[str(uuid.uuid4()),'a'*64,'bug',None,'subject','a valid message',None,'en',now,'b'*64,now-3600000]); c.commit(); c.close()
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool: list(pool.map(insert,range(20)))
c=sqlite3.connect(db); print(json.dumps({'count':c.execute('SELECT COUNT(*) FROM contact_inquiries').fetchone()[0]})); c.close()`,
    { file: database().file, sql: CONTACT_SQL.insert });
  assert.equal(concurrency.count, 5);

  // Storage errors never generate a webhook or expose internal exception text.
  const beforeFailure = webhookCalls.length;
  for (const broken of [environment(null), environment(database(), { CONTACT_RATE_KEY: "short" }),
    environment({ prepare() { throw Error("private storage details"); } })]) {
    answer = await send(payload(), { env: broken });
    assert.equal(answer.result.status, 503);
    assert.deepEqual(answer.body, { ok: false, error: "unavailable" });
  }
  assert.equal(webhookCalls.length, beforeFailure);

  // Long content stays in D1, Discord's embed remains within all field/total limits.
  const long = payload({ category: "other", customCategory: "c".repeat(80), subject: "s".repeat(120),
    message: "x" + "😀".repeat(2499) + "y", email: `${"x".repeat(248)}@a.com` });
  answer = await send(long, { env: environment() });
  assert.equal(answer.result.status, 202);
  assert.equal(rows(answer.env.CONTACT_DB)[0].message.length, 5000);
  const embed = webhookCalls.at(-1).body.embeds[0];
  assert.ok(embed.description.length <= 4096);
  assert.equal(new TextDecoder().decode(new TextEncoder().encode(embed.description)), embed.description,
    "Truncation must not leave half a Unicode surrogate pair");
  assert.match(embed.description, /Full message is stored/);
  assert.ok(embed.fields.every((field) => field.name.length <= 256 && field.value.length <= 1024));
  assert.ok(embed.title.length + embed.description.length + embed.footer.text.length +
    embed.fields.reduce((sum, field) => sum + field.name.length + field.value.length, 0) <= 6000);

  // DB commit is sufficient for receipt, with persistent missing/failing delivery state.
  answer = await send(payload(), { env: environment(database(), { DISCORD_WEBHOOK_URL: undefined }) });
  assert.equal(answer.result.status, 202);
  assert.equal(rows(answer.env.CONTACT_DB)[0].notification_status, "failed");
  assert.equal(rows(answer.env.CONTACT_DB)[0].notification_error, "missing_webhook");
  const invalidWebhookCount = webhookCalls.length;
  answer = await send(payload(), { env: environment(database(), { DISCORD_WEBHOOK_URL: "https://evil.example/token" }) });
  assert.equal(rows(answer.env.CONTACT_DB)[0].notification_error, "invalid_webhook");
  assert.equal(webhookCalls.length, invalidWebhookCount);
  global.fetch = async () => new Response("private response text", { status: 400 });
  answer = await send(payload());
  assert.equal(answer.result.status, 202);
  assert.equal(rows(answer.env.CONTACT_DB)[0].notification_error, "http_400");
  assert.equal(rows(answer.env.CONTACT_DB)[0].notification_attempts, 1);
  let redirectCalls = 0;
  global.fetch = async (url, options) => {
    workersRequest(url, options);
    assert.equal(options.redirect, "manual");
    assert.match(url, /^https:\/\/discord\.com\/api\/webhooks\//);
    redirectCalls += 1;
    return new Response(null, { status: 302, headers: { Location: "https://untrusted.example/redirect" } });
  };
  answer = await send(payload());
  assert.equal(answer.result.status, 202);
  assert.equal(rows(answer.env.CONTACT_DB)[0].notification_error, "http_302");
  assert.equal(rows(answer.env.CONTACT_DB)[0].notification_attempts, 1);
  assert.equal(redirectCalls, 1, "Redirects must neither be followed nor retried");
  const oldTimeout = global.setTimeout;
  global.setTimeout = (fn, ms, ...args) => oldTimeout(fn, ms === 4000 || ms === 1000 ? 1 : ms, ...args);
  try {
    global.fetch = async (_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener("abort", () => reject(new Error("private timeout details")), { once: true });
    });
    answer = await send(payload());
    assert.equal(answer.result.status, 202);
    assert.equal(rows(answer.env.CONTACT_DB)[0].notification_error, "timeout");
    assert.equal(rows(answer.env.CONTACT_DB)[0].notification_attempts, 2);
    let tries = 0;
    global.fetch = async () => new Response("{}", { status: ++tries === 1 ? 503 : 200 });
    answer = await send(payload());
    assert.equal(rows(answer.env.CONTACT_DB)[0].notification_status, "sent");
    assert.equal(rows(answer.env.CONTACT_DB)[0].notification_attempts, 2);
    global.fetch = async () => new Response("{}", { status: 429, headers: { "Retry-After": "60" } });
    answer = await send(payload());
    assert.equal(rows(answer.env.CONTACT_DB)[0].notification_error, "http_429");
    assert.equal(rows(answer.env.CONTACT_DB)[0].notification_attempts, 1, "Do not retry earlier than Discord permits");
    global.fetch = async () => { throw Error("private network details"); };
    answer = await send(payload());
    assert.equal(answer.result.status, 202);
    assert.equal(rows(answer.env.CONTACT_DB)[0].notification_error, "network");
    assert.equal(rows(answer.env.CONTACT_DB)[0].notification_attempts, 2);
  } finally { global.setTimeout = oldTimeout; }

  // A successful webhook followed by a failed status write must never be resent.
  const deliveryDB = database();
  const statusFailureDB = { file: deliveryDB.file, prepare(sql) {
    if (sql === CONTACT_SQL.sent) return { bind() { return { async run() { throw Error("storage unavailable"); } }; } };
    return deliveryDB.prepare(sql);
  } };
  let delivered = 0;
  global.fetch = async () => { delivered += 1; return new Response("{}", { status: 200 }); };
  answer = await send(payload(), { env: environment(statusFailureDB) });
  assert.equal(answer.result.status, 202);
  assert.equal(delivered, 1);
  assert.equal(rows(deliveryDB)[0].notification_status, "pending");

  // Old inquiries are deleted opportunistically; current inquiries and rate indexes remain.
  const retentionDB = database();
  answer = await send(payload(), { env: environment(retentionDB) });
  await retentionDB.prepare("UPDATE contact_inquiries SET created_at = ?1").bind(Date.now() - 91 * 86400000).run();
  answer = await send(payload(), { env: environment(retentionDB) });
  assert.equal(rows(retentionDB).length, 1);
  const schema = python("import json,sqlite3,sys; x=json.load(sys.stdin); c=sqlite3.connect(x['file']); print(json.dumps([r[0] for r in c.execute(\"SELECT name FROM sqlite_master WHERE type='index'\")])); c.close()", { file: retentionDB.file });
  assert.ok(schema.includes("contact_inquiries_created_at"));
  assert.ok(schema.includes("contact_inquiries_rate_hash_created_at"));
  console.log("Website contact API passed: real SQLite schema/queries, 20 concurrent quota writes, validation, streaming size cap, origin/method, idempotency, HMAC, retention, Discord limits/mentions, retry/timeout and storage failures");
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => {
  global.fetch = originalFetch;
  fs.rmSync(temp, { recursive: true, force: true });
});
