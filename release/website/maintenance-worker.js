// Scheduled retention only: no public endpoint and no inquiry contents in logs.
const RETENTION = 90 * 24 * 60 * 60 * 1000;

function webhook(raw) {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || !["discord.com", "discordapp.com"].includes(url.hostname) ||
        url.port || url.username || url.password || !/^\/api\/webhooks\/\d+\/[A-Za-z0-9._-]+$/.test(url.pathname)) return null;
    url.search = "";
    url.hash = "";
    return url;
  } catch { return null; }
}

export default {
  async scheduled(_controller, env) {
    const cutoff = Date.now() - RETENTION;
    const db = env.CONTACT_DB;
    // Local personal data expires independently of Discord availability.
    await db.prepare("DELETE FROM contact_inquiries WHERE created_at < ?")
      .bind(cutoff).run();
    const url = webhook(env.DISCORD_WEBHOOK_URL);
    if (!url) throw new Error("Retention webhook is not configured");
    const webhookId = url.pathname.split("/")[3];
    const expired = await db.prepare(`SELECT message_id, webhook_id FROM contact_discord_messages
      WHERE created_at < ? ORDER BY created_at, message_id LIMIT 20`).bind(cutoff).all();
    let failures = 0;
    for (const row of expired.results || []) {
      // A rotated webhook cannot delete another webhook's messages. Preserve for recovery.
      if (row.webhook_id !== webhookId || !/^\d{6,22}$/.test(row.message_id)) { failures++; continue; }
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      let status;
      let missingMessage = false;
      try {
        const result = await fetch(`${url.href}/messages/${row.message_id}`, {
          method: "DELETE", redirect: "manual", signal: controller.signal,
        });
        status = result.status;
        if (status === 404) {
          // Unknown Message is already gone. Unknown Webhook/token is a configuration failure.
          try { missingMessage = (await result.json()).code === 10008; } catch {}
        } else if (result.body) await result.body.cancel().catch(() => {});
      } catch { failures++; break; }
      finally { clearTimeout(timeout); }
      if (status === 204 || missingMessage) {
        await db.prepare("DELETE FROM contact_discord_messages WHERE message_id = ? AND webhook_id = ?")
          .bind(row.message_id, row.webhook_id).run();
      } else {
        failures++;
        // Respect rate limits; retry remaining identifiers at the next scheduled run.
        if (status === 429 || status === 401 || status === 403 || status === 404 || status >= 500) break;
      }
    }
    if (failures) throw new Error("Discord retention incomplete; deletion identifiers retained for retry");
  },
};
