-- Promote the existing bootstrap admin(s) to tech_admin, the top of the role
-- hierarchy (tech_admin > president > board_member). This keeps whoever was
-- already running the CMS in full control, and lets them appoint/replace the
-- club president (and other board members) at any time going forward.
UPDATE admin_users SET role = 'tech_admin' WHERE role = 'president';
