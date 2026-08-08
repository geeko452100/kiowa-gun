-- Phase 2: Stripe integration for member dues.

CREATE TABLE payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  payment_method_type TEXT,
  stripe_checkout_session_id TEXT NOT NULL UNIQUE,
  stripe_payment_intent_id TEXT,
  paid_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payments_member_id ON payments(member_id);

-- Lets a member-uploaded document (e.g. a cleanup-day discount card) be tied
-- back to the member who submitted it, once Phase 3 adds self-service uploads.
ALTER TABLE documents ADD COLUMN member_id INTEGER;
