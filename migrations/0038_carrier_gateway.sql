-- Texts now go out through each carrier's email-to-SMS gateway (lib/sms.ts)
-- instead of SignalWire's Messages API, using Veriphone (lib/veriphone.ts) to
-- look up which carrier a number is on. carrier caches that lookup on the
-- member row so repeat sends don't re-query Veriphone. gateway_email records
-- the <number>@<carrier gateway> address a given send actually went to, for
-- troubleshooting -- signalwire_sid/status/delivered_at/failed_at/error_code
-- on sms_campaign_recipients stay in place but only ever get populated by
-- pre-existing rows from before this switch.
ALTER TABLE members ADD COLUMN carrier TEXT;
ALTER TABLE sms_campaign_recipients ADD COLUMN gateway_email TEXT;
