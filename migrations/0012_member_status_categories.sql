-- members.status moves from active/inactive to three categories: Waiting List,
-- Non-Member, Member. Existing active members become Member (they were already
-- being treated as the club's real membership); existing inactive members become
-- Non-Member (they were already excluded from newsletters, same as the new
-- Non-Member category).
UPDATE members SET status = 'Member' WHERE status = 'active';
UPDATE members SET status = 'Non-Member' WHERE status = 'inactive';
