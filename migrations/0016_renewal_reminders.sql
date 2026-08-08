-- Automated 45-day-out renewal reminder texts (Phase 4). renewal_date is set
-- manually by a board admin per member (no payment history to derive it from
-- yet). renewal_reminder_sent_for records which renewal_date a reminder has
-- already gone out for, so the daily cron job doesn't re-text the same cycle.
ALTER TABLE members ADD COLUMN renewal_date TEXT;
ALTER TABLE members ADD COLUMN renewal_reminder_sent_for TEXT;
