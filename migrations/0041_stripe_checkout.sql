-- Switch live dues charges from NMI Collect.js to Stripe Checkout Sessions
-- (one-time payment mode only -- no Customer vault, no subscriptions).
-- Existing NMI transaction ids stay on historical rows; new payments write
-- stripe_checkout_session_id instead.
ALTER TABLE payments ADD COLUMN stripe_checkout_session_id TEXT;
CREATE UNIQUE INDEX idx_payments_stripe_checkout_session_id ON payments(stripe_checkout_session_id);
