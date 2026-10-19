-- Times are UTC Unix milliseconds. Do not add raw IP addresses or user agents.
CREATE TABLE IF NOT EXISTS contact_inquiries (
  request_id TEXT PRIMARY KEY NOT NULL,
  content_hash TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('bug', 'setup', 'feature', 'privacy', 'other')),
  custom_category TEXT,
  subject TEXT NOT NULL CHECK (length(subject) BETWEEN 1 AND 120),
  message TEXT NOT NULL CHECK (length(message) BETWEEN 10 AND 5000),
  email TEXT CHECK (email IS NULL OR length(email) BETWEEN 1 AND 254),
  locale TEXT NOT NULL CHECK (locale IN ('en', 'ko', 'pt-BR', 'es', 'id', 'zh-Hans', 'ja', 'zh-Hant', 'fr', 'de')),
  consent INTEGER NOT NULL CHECK (consent = 1),
  created_at INTEGER NOT NULL,
  rate_hash TEXT NOT NULL,
  notification_status TEXT NOT NULL DEFAULT 'pending' CHECK (notification_status IN ('pending', 'sent', 'failed')),
  notification_attempts INTEGER NOT NULL DEFAULT 0,
  notification_error TEXT,
  notified_at INTEGER,
  CHECK ((category = 'other' AND custom_category IS NOT NULL AND length(custom_category) BETWEEN 1 AND 80)
    OR (category <> 'other' AND custom_category IS NULL))
);
CREATE INDEX IF NOT EXISTS contact_inquiries_created_at ON contact_inquiries (created_at);
CREATE INDEX IF NOT EXISTS contact_inquiries_rate_hash_created_at ON contact_inquiries (rate_hash, created_at);
