-- Shooting committee is a subset of regular Members (like board members),
-- not a mutually-exclusive status -- a committee member keeps status =
-- 'Member' and is additionally flagged here, so recipient grouping in
-- Communications can target the committee on top of the Member group.
ALTER TABLE members ADD COLUMN on_shooting_committee INTEGER NOT NULL DEFAULT 0;
