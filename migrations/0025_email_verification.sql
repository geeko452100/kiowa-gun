-- Portal signup lets a member pick any email address directly with no proof
-- of ownership (a deliberate simplicity tradeoff at the time). This adds a
-- verify-your-email link, sent on signup, that confirms it after the fact.
ALTER TABLE members ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0;

CREATE TABLE member_email_verification_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);
CREATE INDEX idx_member_email_verification_tokens_member ON member_email_verification_tokens(member_id);
