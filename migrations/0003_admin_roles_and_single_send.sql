ALTER TABLE admin_users ADD COLUMN role TEXT NOT NULL DEFAULT 'board_member';

-- Bootstrap: every admin that already existed before roles were introduced
-- keeps full (president) access, so nobody gets locked out of the CMS.
UPDATE admin_users SET role = 'president';

ALTER TABLE email_campaigns ADD COLUMN recipient_email TEXT;
