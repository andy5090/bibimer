const BODY_LIMIT = 16 * 1024;
const HOUR = 60 * 60 * 1000;
const RETENTION = 90 * 24 * HOUR;
const CATEGORIES = new Set(["bug", "setup", "feature", "privacy", "other"]);
const LOCALES = new Set(["en", "ko", "pt-BR", "es", "id", "zh-Hans", "ja", "zh-Hant", "fr", "de"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// The quota check and insert are one SQLite statement, so concurrent requests
// cannot all pass a separate read of the same hourly quota.
export const CONTACT_SQL = Object.freeze({
  insert: `INSERT INTO contact_inquiries
    (request_id, content_hash, category, custom_category, subject, message, email, locale,
     consent, created_at, rate_hash, notification_status, notification_attempts)
    SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 1, ?9, ?10, 'pending', 0
    WHERE NOT EXISTS (SELECT 1 FROM contact_inquiries WHERE request_id = ?1)
      AND (SELECT COUNT(*) FROM contact_inquiries
           WHERE rate_hash = ?10 AND created_at > ?11) < 5`,
  receipt: "SELECT content_hash FROM contact_inquiries WHERE request_id = ?1",
  cleanup: "DELETE FROM contact_inquiries WHERE created_at < ?1",
  attempt: `UPDATE contact_inquiries SET notification_attempts = notification_attempts + 1,
    notification_status = 'pending', notification_error = NULL WHERE request_id = ?1`,
  sent: `UPDATE contact_inquiries SET notification_status = 'sent', notification_error = NULL,
    notified_at = ?2 WHERE request_id = ?1`,
  failed: `UPDATE contact_inquiries SET notification_status = 'failed', notification_error = ?2
    WHERE request_id = ?1`,
});

function response(status, body, headers = {}) {
  return new Response(JSON.stringify(body), { status, headers: {
    "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff", ...headers,
  } });
}

function failure(status, error, headers) {
  return response(status, { ok: false, error }, headers);
}

function validOrigin(request) {
  try {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");
    if (!origin || origin !== url.origin) return false;
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (local) return url.protocol === "http:" || url.protocol === "https:";
    return url.protocol === "https:" && (url.hostname === "bibimer.app" ||
      url.hostname === "bibimer.pages.dev" || url.hostname.endsWith(".bibimer.pages.dev"));
  } catch { return false; }
}

async function readBody(request) {
  const declared = request.headers.get("Content-Length");
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > BODY_LIMIT)) {
    throw new Error("payload_too_large");
  }
  if (!request.body) throw new Error("invalid_request");
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > BODY_LIMIT) {
        await reader.cancel().catch(() => {});
        throw new Error("payload_too_large");
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
  catch { throw new Error("invalid_request"); }
}

function validate(input) {
  const keys = new Set(["requestId", "category", "customCategory", "subject", "message", "email", "locale", "consent", "website"]);
  if (!input || typeof input !== "object" || Array.isArray(input) ||
      Object.keys(input).some((key) => !keys.has(key))) return null;
  const text = (value, min, max) => typeof value === "string" &&
    value.trim().length >= min && value.trim().length <= max && !value.includes("\0");
  if (!text(input.requestId, 36, 36) || !UUID.test(input.requestId) ||
      !CATEGORIES.has(input.category) || !LOCALES.has(input.locale) || input.consent !== true ||
      input.website !== "" || !text(input.subject, 1, 120) || !text(input.message, 10, 5000)) return null;
  const custom = input.customCategory ?? "";
  const email = input.email ?? "";
  if (!text(custom, input.category === "other" ? 1 : 0, 80) ||
      (input.category !== "other" && custom.trim() !== "") || !text(email, 0, 254) ||
      (email.trim() && !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email.trim()))) return null;
  return { requestId: input.requestId.toLowerCase(), category: input.category,
    customCategory: custom.trim(), subject: input.subject.trim(), message: input.message.trim(),
    email: email.trim(), locale: input.locale, consent: true };
}

function hex(bytes) {
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hashes(data, ip, secret) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const { requestId, ...content } = data;
  const [contentHash, rateHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(JSON.stringify(content))),
    crypto.subtle.sign("HMAC", key, encoder.encode(ip)),
  ]);
  return { contentHash: hex(contentHash), rateHash: hex(rateHash) };
}

function webhookURL(raw) {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || !["discord.com", "discordapp.com"].includes(url.hostname) ||
        url.port || url.username || url.password || !/^\/api\/webhooks\/\d+\/[A-Za-z0-9._-]+$/.test(url.pathname)) return null;
    url.search = "?wait=true";
    url.hash = "";
    return url.href;
  } catch { return null; }
}

function webhookBody(data) {
  let description = data.message;
  if (description.length > 3500) {
    description = description.slice(0, 3500).replace(/[\uD800-\uDBFF]$/, "") +
      "\n\n[Message shortened. Full message is stored with this receipt in the inquiry database.]";
  }
  return { allowed_mentions: { parse: [] }, embeds: [{ title: "Bibimer website inquiry",
    description, fields: [
      { name: "Receipt", value: data.requestId },
      { name: "Category", value: data.category === "other" ? `other: ${data.customCategory}` : data.category, inline: true },
      { name: "Language", value: data.locale, inline: true },
      { name: "Subject", value: data.subject },
      { name: "Reply email", value: data.email || "Not provided" },
    ], footer: { text: "Submitted through bibimer.app" } }] };
}

async function run(db, sql, ...args) {
  const result = await db.prepare(sql).bind(...args).run();
  if (result.success === false) throw new Error("storage");
  return result;
}

async function notify(db, data, rawURL) {
  const url = webhookURL(rawURL);
  if (!url) {
    await run(db, CONTACT_SQL.failed, data.requestId, rawURL ? "invalid_webhook" : "missing_webhook");
    return;
  }
  // Two bounded attempts (4 seconds each + at most a 5 second pause), within waitUntil's
  // 30 second extension. A saved failed/pending row remains available to operators.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await run(db, CONTACT_SQL.attempt, data.requestId);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    let error = "network";
    let retry = true;
    let delivered = false;
    let retryDelay = 1000;
    try {
      // Workers supports manual/follow only. Manual also keeps webhook tokens
      // and inquiry content from being forwarded to a redirect destination.
      const result = await fetch(url, { method: "POST", redirect: "manual",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify(webhookBody(data)),
        signal: controller.signal });
      // Never retain or log Discord's response body, webhook URL, or user content.
      if (result.body) await result.body.cancel().catch(() => {});
      if (result.ok) {
        delivered = true;
      } else {
        error = `http_${result.status}`;
        retry = result.status === 429 || result.status >= 500;
        if (result.status === 429) {
          const after = Number(result.headers.get("Retry-After"));
          if (Number.isFinite(after) && after > 0) {
            retryDelay = Math.ceil(after * 1000);
            if (retryDelay > 5000) retry = false;
          }
        }
      }
    } catch { error = controller.signal.aborted ? "timeout" : "network"; }
    finally { clearTimeout(timeout); }
    if (delivered) {
      // A failed status write must not trigger another Discord delivery.
      await run(db, CONTACT_SQL.sent, data.requestId, Date.now());
      return;
    }
    await run(db, CONTACT_SQL.failed, data.requestId, error);
    if (!retry || attempt === 1) return;
    await new Promise((resolve) => setTimeout(resolve, retryDelay));
  }
}

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== "POST") return failure(405, "method_not_allowed", { Allow: "POST" });
  if (!validOrigin(request)) return failure(403, "invalid_origin");
  if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers.get("Content-Type") || "")) {
    return failure(415, "unsupported_media_type");
  }
  let data;
  try { data = validate(await readBody(request)); }
  catch (error) { return failure(error.message === "payload_too_large" ? 413 : 400,
    error.message === "payload_too_large" ? "payload_too_large" : "invalid_request"); }
  if (!data) return failure(400, "invalid_request");
  if (!env.CONTACT_DB || typeof env.CONTACT_RATE_KEY !== "string" || env.CONTACT_RATE_KEY.length < 32) {
    return failure(503, "unavailable");
  }
  try {
    const now = Date.now();
    const { contentHash, rateHash } = await hashes(data,
      request.headers.get("CF-Connecting-IP") || "unknown", env.CONTACT_RATE_KEY);
    const db = env.CONTACT_DB;
    const result = await run(db, CONTACT_SQL.insert, data.requestId, contentHash, data.category,
      data.customCategory || null, data.subject, data.message, data.email || null, data.locale,
      now, rateHash, now - HOUR);
    if (result.meta?.changes !== 1) {
      const existing = await db.prepare(CONTACT_SQL.receipt).bind(data.requestId).first();
      if (existing) return existing.content_hash === contentHash
        ? response(202, { ok: true, requestId: data.requestId }) : failure(409, "id_conflict");
      return failure(429, "rate_limited", { "Retry-After": "3600" });
    }
    const background = Promise.allSettled([
      notify(db, data, env.DISCORD_WEBHOOK_URL),
      run(db, CONTACT_SQL.cleanup, now - RETENTION),
    ]);
    if (typeof context.waitUntil === "function") context.waitUntil(background);
    else await background;
    return response(202, { ok: true, requestId: data.requestId });
  } catch { return failure(503, "unavailable"); }
}
