-- Adds an editable intro block to the Calendar page (previously the only
-- public page without an in-place-editable page_sections row).
INSERT INTO page_sections (page_slug, section_key, heading, body_html) VALUES
('calendar', 'intro', NULL, '<p>See what''s happening at the range. Click an event for details.</p>');
