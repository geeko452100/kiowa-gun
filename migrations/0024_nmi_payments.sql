-- Switch dues billing from Stripe to NMI (Network Merchants Inc). Stripe's
-- terms restrict firearms-related businesses and gun clubs have had
-- accounts terminated over it, with funds held 90-180 days -- too much risk
-- for a live club running annual auto-renewing dues. NMI is used throughout
-- the firearms industry.
DROP INDEX idx_members_stripe_customer_id;
DROP INDEX idx_members_stripe_subscription_id;
ALTER TABLE members RENAME COLUMN stripe_customer_id TO nmi_customer_vault_id;
ALTER TABLE members RENAME COLUMN stripe_subscription_id TO nmi_subscription_id;
CREATE UNIQUE INDEX idx_members_nmi_customer_vault_id ON members(nmi_customer_vault_id);
CREATE UNIQUE INDEX idx_members_nmi_subscription_id ON members(nmi_subscription_id);

-- payments' Stripe id columns are inline UNIQUE (auto-indexed), which SQLite
-- won't let a plain DROP COLUMN touch -- rebuild the table instead, same as
-- migration 0023 did for this table.
CREATE TABLE payments_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  payment_method_type TEXT,
  -- NMI's transaction id -- present on every sale (first payment and every
  -- renewal alike), so it's this table's idempotency key.
  nmi_transaction_id TEXT UNIQUE,
  paid_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO payments_new (id, member_id, amount_cents, currency, payment_method_type, paid_at)
  SELECT id, member_id, amount_cents, currency, payment_method_type, paid_at FROM payments;
DROP TABLE payments;
ALTER TABLE payments_new RENAME TO payments;
CREATE INDEX idx_payments_member_id ON payments(member_id);
