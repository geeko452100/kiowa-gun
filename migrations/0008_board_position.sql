-- Board members hold titles (Vice President, Treasurer, Secretary, etc.) that
-- are independent of CMS access level (board_member/president/tech_admin).
-- This is a free-text label only -- it grants no permissions of its own.
ALTER TABLE admin_users ADD COLUMN position TEXT;
