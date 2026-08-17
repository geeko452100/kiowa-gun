-- Optional club contact email, shown in the footer alongside phone/address.
-- See lib/schema.ts siteSettings.
ALTER TABLE site_settings ADD COLUMN contact_email TEXT;
