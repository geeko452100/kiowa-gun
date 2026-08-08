-- Add a second, 15-day-out renewal reminder alongside the 45-day one.
-- Rename the original tracking column to be explicit about which threshold
-- it covers, and add a matching one for the new 15-day threshold.
ALTER TABLE members RENAME COLUMN renewal_reminder_sent_for TO renewal_45_reminder_sent_for;
ALTER TABLE members ADD COLUMN renewal_15_reminder_sent_for TEXT;
