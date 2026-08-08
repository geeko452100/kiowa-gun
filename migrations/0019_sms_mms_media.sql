-- Texts can now include one picture (MMS) via a publicly-hosted R2 URL.
ALTER TABLE sms_campaigns ADD COLUMN media_url TEXT;
