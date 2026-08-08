-- Phase 6: matches gain a discipline field (Defensive Pistol was hardcoded
-- everywhere; the schedule/admin CRUD now support multiple disciplines
-- grouped separately), and per-match photo galleries replace the 4 static
-- images shared across the whole public matches page.
ALTER TABLE matches ADD COLUMN discipline TEXT NOT NULL DEFAULT 'Defensive Pistol';

CREATE TABLE match_photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id INTEGER NOT NULL,
  r2_key TEXT NOT NULL,
  file_name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  uploaded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
