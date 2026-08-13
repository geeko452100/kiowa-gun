-- Phase 4: per-recipient SMS delivery analytics, reported asynchronously by
-- SignalWire's status callback (app/api/webhooks/sms-status). One row per
-- member a text campaign was actually sent to -- mirrors
-- email_campaign_recipients (migration 0020), but SMS has no
-- opens/clicks/spam-complaint concept, only delivery status.
CREATE TABLE sms_campaign_recipients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id INTEGER NOT NULL,
  member_id INTEGER,
  phone TEXT NOT NULL,
  signalwire_sid TEXT,
  send_error TEXT,
  status TEXT,
  delivered_at TEXT,
  failed_at TEXT,
  error_code TEXT
);

CREATE INDEX sms_campaign_recipients_campaign_id ON sms_campaign_recipients (campaign_id);
CREATE INDEX sms_campaign_recipients_signalwire_sid ON sms_campaign_recipients (signalwire_sid);
