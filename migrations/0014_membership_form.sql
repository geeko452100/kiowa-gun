-- Phase 3: public membership form (self-service renewal/waiting-list
-- application). Adds the fields it collects that didn't exist yet, plus a
-- review flag so the board can tell self-uploaded documents apart from the
-- ones they manage themselves.

ALTER TABLE members ADD COLUMN address TEXT;
ALTER TABLE members ADD COLUMN rules_acknowledged_name TEXT;
ALTER TABLE members ADD COLUMN rules_acknowledged_at TEXT;

-- Defaults to 1 (reviewed) so existing board-uploaded documents need no
-- backfill; the public membership-form upload path explicitly inserts 0.
ALTER TABLE documents ADD COLUMN reviewed INTEGER NOT NULL DEFAULT 1;
