-- Login had no brute-force protection: unlimited password attempts against a
-- known/guessed admin email. This adds a per-account lockout counter enforced
-- in app/api/admin/login/route.ts.
ALTER TABLE admin_users ADD COLUMN failed_login_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE admin_users ADD COLUMN locked_until INTEGER;
