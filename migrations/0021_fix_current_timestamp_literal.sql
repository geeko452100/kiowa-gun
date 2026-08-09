-- lib/schema.ts's timestamp columns used .default("CURRENT_TIMESTAMP"), a
-- plain JS string default. Drizzle resolves column defaults itself at
-- insert time for any field omitted from .values({...}), so it was writing
-- the literal text "CURRENT_TIMESTAMP" instead of ever letting SQLite's own
-- (correctly-defined) column default run. Fixed in schema.ts by using
-- sql`CURRENT_TIMESTAMP` instead.
--
-- This backfills existing rows stuck with the literal string. The true
-- original timestamp isn't recoverable, so affected rows are stamped with
-- the time of this migration rather than left showing broken text.
UPDATE admin_users SET created_at = CURRENT_TIMESTAMP WHERE created_at = 'CURRENT_TIMESTAMP';
UPDATE password_reset_tokens SET created_at = CURRENT_TIMESTAMP WHERE created_at = 'CURRENT_TIMESTAMP';
UPDATE page_sections SET updated_at = CURRENT_TIMESTAMP WHERE updated_at = 'CURRENT_TIMESTAMP';
UPDATE calendar_events SET created_at = CURRENT_TIMESTAMP WHERE created_at = 'CURRENT_TIMESTAMP';
UPDATE calendar_settings SET updated_at = CURRENT_TIMESTAMP WHERE updated_at = 'CURRENT_TIMESTAMP';
UPDATE news_posts SET published_at = CURRENT_TIMESTAMP WHERE published_at = 'CURRENT_TIMESTAMP';
UPDATE match_photos SET uploaded_at = CURRENT_TIMESTAMP WHERE uploaded_at = 'CURRENT_TIMESTAMP';
UPDATE documents SET uploaded_at = CURRENT_TIMESTAMP WHERE uploaded_at = 'CURRENT_TIMESTAMP';
UPDATE members SET created_at = CURRENT_TIMESTAMP WHERE created_at = 'CURRENT_TIMESTAMP';
UPDATE payments SET paid_at = CURRENT_TIMESTAMP WHERE paid_at = 'CURRENT_TIMESTAMP';
UPDATE email_campaigns SET sent_at = CURRENT_TIMESTAMP WHERE sent_at = 'CURRENT_TIMESTAMP';
UPDATE sms_campaigns SET sent_at = CURRENT_TIMESTAMP WHERE sent_at = 'CURRENT_TIMESTAMP';
