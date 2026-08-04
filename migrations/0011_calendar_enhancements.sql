-- Calendar events gain optional description + image; calendar display size becomes a
-- board-configurable setting instead of a hardcoded CSS value.
ALTER TABLE calendar_events ADD COLUMN description TEXT;
ALTER TABLE calendar_events ADD COLUMN image_r2_key TEXT;
ALTER TABLE calendar_events ADD COLUMN image_file_name TEXT;

CREATE TABLE calendar_settings (
  id INTEGER PRIMARY KEY,
  size_preset TEXT NOT NULL DEFAULT 'comfortable',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO calendar_settings (id, size_preset) VALUES (1, 'comfortable');
