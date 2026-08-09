import { sql } from "drizzle-orm";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// A plain string default (e.g. .default("CURRENT_TIMESTAMP")) is inserted
// literally by Drizzle -- it doesn't ask SQLite to evaluate anything. This
// wraps the raw SQL expression so the DB actually fills in the real time.
const now = sql`CURRENT_TIMESTAMP`;

export const adminUsers = sqliteTable("admin_users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  salt: text("salt").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("board_member"), // "tech_admin" | "president" | "board_member"
  position: text("position"), // free-text title (Vice President, Treasurer, etc.) -- display only, grants no access
  phone: text("phone"),
  createdAt: text("created_at").notNull().default(now),
  failedLoginCount: integer("failed_login_count").notNull().default(0),
  lockedUntil: integer("locked_until"), // epoch ms; login is blocked while this is in the future
});

// Shared, growable list of board titles (Vice President, Treasurer, etc.)
// offered in the Board Members "Title" dropdown. Presidents/tech admins can
// add to it; a member's actual title (admin_users.position) is still free
// text, so nothing breaks if this list doesn't have every title ever used.
export const positionOptions = sqliteTable("position_options", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  label: text("label").notNull().unique(),
});

// One-time links for setting up a new board member login or resetting a
// password. Whoever triggers this never sees the resulting password — only
// the person with access to that inbox can complete it.
export const passwordResetTokens = sqliteTable("password_reset_tokens", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  adminUserId: integer("admin_user_id").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: integer("expires_at").notNull(),
  createdAt: text("created_at").notNull().default(now),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  adminUserId: integer("admin_user_id").notNull(),
  expiresAt: integer("expires_at").notNull(),
});

export const pageSections = sqliteTable("page_sections", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  pageSlug: text("page_slug").notNull(),
  sectionKey: text("section_key").notNull(),
  heading: text("heading"),
  bodyHtml: text("body_html").notNull(),
  updatedAt: text("updated_at").notNull().default(now),
});

export const calendarEvents = sqliteTable("calendar_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  start: text("start").notNull(),
  color: text("color").notNull().default("#2c3e1f"),
  description: text("description"),
  imageR2Key: text("image_r2_key"),
  imageFileName: text("image_file_name"),
  createdAt: text("created_at").notNull().default(now),
});

// Singleton row (id=1) controlling how large the public calendar grid renders --
// a preset dropdown in the admin CMS instead of a raw pixel value, since the
// audience is non-technical board members, not developers.
export const calendarSettings = sqliteTable("calendar_settings", {
  id: integer("id").primaryKey(),
  sizePreset: text("size_preset").notNull().default("comfortable"), // "compact" | "comfortable" | "large"
  updatedAt: text("updated_at").notNull().default(now),
});

export const newsPosts = sqliteTable("news_posts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  bodyHtml: text("body_html").notNull(),
  isPublished: integer("is_published").notNull().default(1),
  publishedAt: text("published_at").notNull().default(now),
});

export const matches = sqliteTable("matches", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  // Free text rather than an enum -- board members occasionally add a new
  // discipline and shouldn't need a code change to do it.
  discipline: text("discipline").notNull().default("Defensive Pistol"),
  eventDate: text("event_date").notNull(),
  eventTime: text("event_time").notNull(),
  notes: text("notes"),
  resultsUrl: text("results_url"),
  sortOrder: integer("sort_order").notNull().default(0),
});

// Photos scoped to a single match date, shown in that match's public gallery.
// Replaces the old 4 hardcoded images shared across the whole matches page.
export const matchPhotos = sqliteTable("match_photos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  matchId: integer("match_id").notNull(),
  r2Key: text("r2_key").notNull(),
  fileName: text("file_name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  uploadedAt: text("uploaded_at").notNull().default(now),
});

export const documents = sqliteTable("documents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  r2Key: text("r2_key").notNull(),
  fileName: text("file_name").notNull(),
  uploadedAt: text("uploaded_at").notNull().default(now),
  // Set when a member uploads this themselves (e.g. a cleanup-day discount
  // card) via the Phase 3 membership form; null for board-managed documents
  // like the range rules PDF.
  memberId: integer("member_id"),
  // Whether a board member has reviewed this upload. Defaults to 1 (already
  // reviewed) since board-managed uploads don't need review; the public
  // membership form explicitly inserts 0 for self-service uploads.
  reviewed: integer("reviewed").notNull().default(1),
});

export const MEMBER_STATUSES = ["Waiting List", "Non-Member", "Member"] as const;

export const members = sqliteTable("members", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  address: text("address"),
  status: text("status").notNull().default("Member"), // one of MEMBER_STATUSES
  // A subset of Member -- shooting committee members are still regular
  // members (same status), just also on the committee. Independent of
  // status so recipient grouping can target the committee on top of, not
  // instead of, the Member group.
  onShootingCommittee: integer("on_shooting_committee").notNull().default(0),
  createdAt: text("created_at").notNull().default(now),
  // Digital signature on the Range Rules acknowledgement, from the Phase 3
  // membership form: the typed name and when they submitted it.
  rulesAcknowledgedName: text("rules_acknowledged_name"),
  rulesAcknowledgedAt: text("rules_acknowledged_at"),
  // Set manually by a board admin, or advanced automatically by the NMI
  // webhook (app/api/webhooks/nmi) on each successful renewal charge. Drives
  // the automated 45- and 15-day-out renewal reminder texts.
  renewalDate: text("renewal_date"), // "YYYY-MM-DD"
  // The renewalDate value each reminder threshold has already been sent for,
  // so the daily cron job doesn't re-text the same renewal cycle.
  renewal45ReminderSentFor: text("renewal_45_reminder_sent_for"),
  renewal15ReminderSentFor: text("renewal_15_reminder_sent_for"),
  // Portal login (Phase 5). Null until the member sets up their own login via
  // the emailed setup link -- most existing rows predate the portal.
  passwordHash: text("password_hash"),
  salt: text("salt"),
  failedLoginCount: integer("failed_login_count").notNull().default(0),
  lockedUntil: integer("locked_until"), // epoch ms; login is blocked while this is in the future
  // Set once a member starts a dues subscription via NMI (app/api/payments/subscribe).
  nmiCustomerVaultId: text("nmi_customer_vault_id").unique(),
  nmiSubscriptionId: text("nmi_subscription_id").unique(),
  subscriptionStatus: text("subscription_status"), // e.g. "active", "past_due" -- set from NMI webhook events
});

// One-time links for a member to set up their portal login or reset their
// password -- same dual-purpose pattern as passwordResetTokens above, just
// keyed to a member instead of an admin.
export const memberPasswordResetTokens = sqliteTable("member_password_reset_tokens", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  memberId: integer("member_id").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: integer("expires_at").notNull(),
  createdAt: text("created_at").notNull().default(now),
});

export const memberSessions = sqliteTable("member_sessions", {
  id: text("id").primaryKey(),
  memberId: integer("member_id").notNull(),
  expiresAt: integer("expires_at").notNull(),
});

// One row per successful NMI sale for member dues (first payment and every
// renewal alike). Rows are written by the NMI webhook (app/api/webhooks/nmi,
// event "transaction.sale.success"), not by the subscribe route, so a
// payment only shows up here once NMI has actually confirmed it.
export const payments = sqliteTable("payments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  memberId: integer("member_id").notNull(),
  amountCents: integer("amount_cents").notNull(),
  currency: text("currency").notNull().default("usd"),
  paymentMethodType: text("payment_method_type"), // e.g. "card", "check"
  // NMI's transaction id -- present on every sale, so it doubles as this
  // table's idempotency key (the webhook may redeliver the same event).
  nmiTransactionId: text("nmi_transaction_id").unique(),
  paidAt: text("paid_at").notNull().default(now),
});

export const emailCampaigns = sqliteTable("email_campaigns", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  subject: text("subject").notNull(),
  bodyHtml: text("body_html").notNull(),
  sentAt: text("sent_at").notNull().default(now),
  sentCount: integer("sent_count").notNull().default(0),
  failedCount: integer("failed_count").notNull().default(0),
  createdBy: text("created_by"),
  recipientEmail: text("recipient_email"), // set only for single-member sends; null means "all active members"
});

// One row per member a campaign was actually sent to, keyed to Postmark's
// per-message MessageID so the webhook (app/api/webhooks/postmark) can match
// an open/click/bounce/spam event back to the right recipient.
export const emailCampaignRecipients = sqliteTable("email_campaign_recipients", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  campaignId: integer("campaign_id").notNull(),
  memberId: integer("member_id"),
  email: text("email").notNull(),
  postmarkMessageId: text("postmark_message_id"),
  sendError: text("send_error"),
  deliveredAt: text("delivered_at"),
  openedAt: text("opened_at"),
  clickedAt: text("clicked_at"),
  bouncedAt: text("bounced_at"),
  bounceType: text("bounce_type"), // Postmark's bounce Type, e.g. "HardBounce", "SpamNotification"
  spamComplaintAt: text("spam_complaint_at"),
});

export const smsCampaigns = sqliteTable("sms_campaigns", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  body: text("body").notNull(),
  sentAt: text("sent_at").notNull().default(now),
  sentCount: integer("sent_count").notNull().default(0),
  failedCount: integer("failed_count").notNull().default(0),
  createdBy: text("created_by"),
  recipientPhone: text("recipient_phone"), // set only for single-member sends; null means "all contacts"
  // Public R2-backed URL of an attached picture, if any -- turns the send into
  // an MMS. Left in place (not deleted after sending) since carriers fetch it
  // asynchronously and the URL doubles as a record in send history.
  mediaUrl: text("media_url"),
});
