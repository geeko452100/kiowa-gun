-- Tracks which calendar events were generated together as a recurring
-- series (see lib/recurrence.ts), so the public calendar can show whether
-- an event is recurring and how often instead of guessing from its title.
ALTER TABLE calendar_events ADD COLUMN series_id TEXT;
ALTER TABLE calendar_events ADD COLUMN recurrence_label TEXT;
