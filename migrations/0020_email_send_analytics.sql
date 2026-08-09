-- Phase 4: per-recipient email analytics (opens, clicks, bounces, spam
-- complaints), reported asynchronously by Postmark's webhook. One row per
-- member a campaign was actually sent to.
CREATE TABLE email_campaign_recipients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id INTEGER NOT NULL,
  member_id INTEGER,
  email TEXT NOT NULL,
  postmark_message_id TEXT,
  send_error TEXT,
  delivered_at TEXT,
  opened_at TEXT,
  clicked_at TEXT,
  bounced_at TEXT,
  bounce_type TEXT,
  spam_complaint_at TEXT
);

CREATE INDEX email_campaign_recipients_campaign_id ON email_campaign_recipients (campaign_id);
CREATE INDEX email_campaign_recipients_postmark_message_id ON email_campaign_recipients (postmark_message_id);
