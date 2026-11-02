-- No content, email or webhook token: deletion identifiers survive inquiry cleanup.
CREATE TABLE IF NOT EXISTS contact_discord_messages (
  message_id TEXT PRIMARY KEY NOT NULL,
  webhook_id TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS contact_discord_messages_created_at
  ON contact_discord_messages (created_at);
