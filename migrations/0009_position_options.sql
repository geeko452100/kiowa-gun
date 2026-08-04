-- Board titles (Vice President, Treasurer, etc.) used to be a hardcoded
-- suggestion list in the UI. Moving them into a real table lets presidents
-- and tech admins grow the list themselves from the Board Members page,
-- instead of a developer editing code for every new title.
CREATE TABLE position_options (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  label TEXT NOT NULL UNIQUE
);

INSERT INTO position_options (label) VALUES
  ('Vice President'),
  ('Treasurer'),
  ('Secretary'),
  ('Range Officer'),
  ('Membership Chair');
