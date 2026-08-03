-- Board members are club members too. Going forward, adding a board member
-- login also adds them to the members list; this backfills anyone already
-- in admin_users so existing board members show up on the Members page and
-- receive newsletters.
INSERT INTO members (name, email, status)
SELECT name, email, 'active' FROM admin_users
WHERE email NOT IN (SELECT email FROM members);
