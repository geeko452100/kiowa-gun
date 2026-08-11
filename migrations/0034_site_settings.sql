-- Singleton settings row for the editable nav-bar title/subtitle text and
-- its size preset (see lib/schema.ts siteSettings).
CREATE TABLE IF NOT EXISTS site_settings (
  id INTEGER PRIMARY KEY,
  nav_title TEXT NOT NULL DEFAULT 'Kiowa Gun Club',
  nav_subtitle TEXT NOT NULL DEFAULT 'Great Bend, Kansas',
  nav_title_size TEXT NOT NULL DEFAULT 'comfortable',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO site_settings (id, nav_title, nav_subtitle, nav_title_size)
VALUES (1, 'Kiowa Gun Club', 'Great Bend, Kansas', 'comfortable');
