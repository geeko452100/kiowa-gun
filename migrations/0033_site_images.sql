-- Board-swappable copies of the site's hard-coded images (nav logo/hero,
-- range rules photo, matches flyer). No row for a key means "use the
-- bundled default asset" -- see lib/siteImages.ts.
CREATE TABLE IF NOT EXISTS site_images (
  key TEXT PRIMARY KEY,
  r2_key TEXT NOT NULL,
  file_name TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
