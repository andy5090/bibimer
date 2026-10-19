// Scheduled retention only: no public endpoint and no inquiry contents in logs.
export default {
  async scheduled(_controller, env) {
    await env.CONTACT_DB.prepare("DELETE FROM contact_inquiries WHERE created_at < ?")
      .bind(Date.now() - 90 * 24 * 60 * 60 * 1000).run();
  },
};
