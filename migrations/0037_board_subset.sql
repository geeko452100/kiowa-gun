-- Board members are a subset of regular Members (like the shooting
-- committee), not a mutually-exclusive status. Board login accounts live in
-- the separate `admins` table, disjoint from `members`, so this flag lets a
-- member's contact row be marked as also belonging to the board -- enabling
-- a "Board" recipient group in Communications the same way Shooting
-- Committee already works.
ALTER TABLE members ADD COLUMN on_board INTEGER NOT NULL DEFAULT 0;
