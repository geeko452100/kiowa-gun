-- Board request: members must explicitly opt in before the club texts them.
-- Defaults to opted-out so no existing row starts out eligible for texts
-- without a recorded yes; sms_opt_in_at records when consent was given.
ALTER TABLE members ADD COLUMN sms_opt_in INTEGER NOT NULL DEFAULT 0;
ALTER TABLE members ADD COLUMN sms_opt_in_at TEXT;
