-- Boolean-gated payment eligibility: new applicants are blocked from paying
-- until a board member clears their background check, renewing members are
-- blocked if their NRA membership has lapsed, and every payment entry point
-- checks the single derived can_pay flag (see lib/members.ts recomputeCanPay)
-- instead of re-deriving eligibility from status at each checkpoint.
ALTER TABLE members ADD COLUMN background_check_cleared INTEGER NOT NULL DEFAULT 0;
ALTER TABLE members ADD COLUMN nra_active INTEGER NOT NULL DEFAULT 1;
ALTER TABLE members ADD COLUMN nra_expiration_date TEXT;
ALTER TABLE members ADD COLUMN can_pay INTEGER NOT NULL DEFAULT 0;
ALTER TABLE members ADD COLUMN terminated_at TEXT;

-- Existing members are already paid/current -- default them to payable so
-- this migration doesn't lock out the current roster.
UPDATE members SET can_pay = 1 WHERE status = 'Member';

-- One row per invoice link emailed to a newly-cleared applicant, resolved by
-- token on the public /membership/pay/[token] page (no portal login needed).
CREATE TABLE IF NOT EXISTS membership_invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL,
  token TEXT NOT NULL UNIQUE,
  amount_cents INTEGER NOT NULL DEFAULT 15000,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  paid_at TEXT
);

-- Idempotency guard so the daily cron only runs the annual Sept 10
-- termination sweep once per year.
ALTER TABLE site_settings ADD COLUMN last_termination_sweep_year INTEGER;

-- Board-editable orientation schedule blurb, pulled into the approval email
-- sent once a new applicant's background check is cleared.
INSERT INTO page_sections (page_slug, section_key, heading, body_html) VALUES
('membership', 'orientation-schedule', 'Range Orientation', '<p>New members must attend a mandatory in-person range orientation. Contact the club to schedule yours after your dues are paid.</p>');
