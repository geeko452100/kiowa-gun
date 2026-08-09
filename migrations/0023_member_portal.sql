-- Phase 5: Member Portal. Members/applicants get their own login (separate
-- from admin_users/sessions) to view and update their own info, mirroring
-- the admin login/lockout/password-reset pattern.
ALTER TABLE members ADD COLUMN password_hash TEXT;
ALTER TABLE members ADD COLUMN salt TEXT;
ALTER TABLE members ADD COLUMN failed_login_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE members ADD COLUMN locked_until INTEGER;

-- Dues move from a one-time Stripe Checkout to a recurring annual
-- subscription, so members can manage payment method via Stripe's Billing
-- Portal instead of re-paying manually each year.
ALTER TABLE members ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE members ADD COLUMN stripe_subscription_id TEXT;
ALTER TABLE members ADD COLUMN subscription_status TEXT;
-- SQLite UNIQUE indexes don't treat NULLs as conflicting with each other, so
-- this stays fine for the many members who have no Stripe subscription yet.
CREATE UNIQUE INDEX idx_members_stripe_customer_id ON members(stripe_customer_id);
CREATE UNIQUE INDEX idx_members_stripe_subscription_id ON members(stripe_subscription_id);

CREATE TABLE member_password_reset_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);
CREATE INDEX idx_member_password_reset_tokens_member ON member_password_reset_tokens(member_id);

CREATE TABLE member_sessions (
  id TEXT PRIMARY KEY,
  member_id INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);
CREATE INDEX idx_member_sessions_member ON member_sessions(member_id);

-- Subscription renewal charges arrive via `invoice.paid`, which has no
-- Checkout Session to key off of -- only the very first payment does -- so
-- stripe_checkout_session_id must become nullable. SQLite has no ALTER
-- COLUMN, so rebuild the table.
CREATE TABLE payments_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  payment_method_type TEXT,
  stripe_checkout_session_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  stripe_invoice_id TEXT UNIQUE,
  paid_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO payments_new (id, member_id, amount_cents, currency, payment_method_type, stripe_checkout_session_id, stripe_payment_intent_id, paid_at)
  SELECT id, member_id, amount_cents, currency, payment_method_type, stripe_checkout_session_id, stripe_payment_intent_id, paid_at FROM payments;
DROP TABLE payments;
ALTER TABLE payments_new RENAME TO payments;
CREATE INDEX idx_payments_member_id ON payments(member_id);
