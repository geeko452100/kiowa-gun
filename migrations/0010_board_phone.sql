-- Board member logins had no phone number on file, unlike regular members.
-- Optional, display/contact only -- doesn't affect login or access.
ALTER TABLE admin_users ADD COLUMN phone TEXT;
