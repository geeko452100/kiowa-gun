-- Requirement #2c: calendar events can attach a document and/or a link, not
-- just an image.
ALTER TABLE calendar_events ADD COLUMN document_r2_key TEXT;
ALTER TABLE calendar_events ADD COLUMN document_file_name TEXT;
ALTER TABLE calendar_events ADD COLUMN link_url TEXT;
ALTER TABLE calendar_events ADD COLUMN link_label TEXT;
