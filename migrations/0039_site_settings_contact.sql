-- Optional club contact info and social links, shown in the footer.
-- See lib/schema.ts siteSettings.
ALTER TABLE site_settings ADD COLUMN contact_phone TEXT;
ALTER TABLE site_settings ADD COLUMN contact_address TEXT;
ALTER TABLE site_settings ADD COLUMN social_facebook TEXT;
ALTER TABLE site_settings ADD COLUMN social_instagram TEXT;
ALTER TABLE site_settings ADD COLUMN social_youtube TEXT;
