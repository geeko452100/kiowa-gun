-- Two members were able to save the same NRA number with no conflict --
-- nothing enforced uniqueness below the app layer, and the app layer never
-- checked it either. SQLite UNIQUE indexes treat each NULL as distinct, so
-- this doesn't block members who haven't provided a number yet (same pattern
-- as members.nmi_customer_vault_id / nmi_subscription_id).
CREATE UNIQUE INDEX idx_members_nra_number_unique ON members(nra_number);
