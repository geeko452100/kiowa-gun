import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const adminUsers = sqliteTable("admin_users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  salt: text("salt").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("board_member"), // "tech_admin" | "president" | "board_member"
  position: text("position"), // free-text title (Vice President, Treasurer, etc.) -- display only, grants no access
  phone: text("phone"),
  createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP"),
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
  createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP"),
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
  updatedAt: text("updated_at").notNull().default("CURRENT_TIMESTAMP"),
});

export const calendarEvents = sqliteTable("calendar_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  start: text("start").notNull(),
  color: text("color").notNull().default("#2c3e1f"),
  description: text("description"),
  imageR2Key: text("image_r2_key"),
  imageFileName: text("image_file_name"),
  createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP"),
});

// Singleton row (id=1) controlling how large the public calendar grid renders --
// a preset dropdown in the admin CMS instead of a raw pixel value, since the
// audience is non-technical board members, not developers.
export const calendarSettings = sqliteTable("calendar_settings", {
  id: integer("id").primaryKey(),
  sizePreset: text("size_preset").notNull().default("comfortable"), // "compact" | "comfortable" | "large"
  updatedAt: text("updated_at").notNull().default("CURRENT_TIMESTAMP"),
});

export const newsPosts = sqliteTable("news_posts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  bodyHtml: text("body_html").notNull(),
  isPublished: integer("is_published").notNull().default(1),
  publishedAt: text("published_at").notNull().default("CURRENT_TIMESTAMP"),
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
  uploadedAt: text("uploaded_at").notNull().default("CURRENT_TIMESTAMP"),
});

export const documents = sqliteTable("documents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  r2Key: text("r2_key").notNull(),
  fileName: text("file_name").notNull(),
  uploadedAt: text("uploaded_at").notNull().default("CURRENT_TIMESTAMP"),
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
  createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP"),
  // Digital signature on the Range Rules acknowledgement, from the Phase 3
  // membership form: the typed name and when they submitted it.
  rulesAcknowledgedName: text("rules_acknowledged_name"),
  rulesAcknowledgedAt: text("rules_acknowledged_at"),
  // Set manually by a board admin (no Stripe payment history to derive it
  // from yet). Drives the automated 45- and 15-day-out renewal reminder texts.
  renewalDate: text("renewal_date"), // "YYYY-MM-DD"
  // The renewalDate value each reminder threshold has already been sent for,
  // so the daily cron job doesn't re-text the same renewal cycle.
  renewal45ReminderSentFor: text("renewal_45_reminder_sent_for"),
  renewal15ReminderSentFor: text("renewal_15_reminder_sent_for"),
});

// One row per completed Stripe Checkout Session for member dues. Rows are
// written by the Stripe webhook (checkout.session.completed), not by the
// checkout-creation route, so a payment only shows up here once Stripe has
// actually confirmed it.
export const payments = sqliteTable("payments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  memberId: integer("member_id").notNull(),
  amountCents: integer("amount_cents").notNull(),
  currency: text("currency").notNull().default("usd"),
  paymentMethodType: text("payment_method_type"), // e.g. "card", "us_bank_account", "cashapp" -- from the Stripe payment intent
  stripeCheckoutSessionId: text("stripe_checkout_session_id").notNull().unique(),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  paidAt: text("paid_at").notNull().default("CURRENT_TIMESTAMP"),
});

export const emailCampaigns = sqliteTable("email_campaigns", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  subject: text("subject").notNull(),
  bodyHtml: text("body_html").notNull(),
  sentAt: text("sent_at").notNull().default("CURRENT_TIMESTAMP"),
  sentCount: integer("sent_count").notNull().default(0),
  failedCount: integer("failed_count").notNull().default(0),
  createdBy: text("created_by"),
  recipientEmail: text("recipient_email"), // set only for single-member sends; null means "all active members"
});

export const smsCampaigns = sqliteTable("sms_campaigns", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  body: text("body").notNull(),
  sentAt: text("sent_at").notNull().default("CURRENT_TIMESTAMP"),
  sentCount: integer("sent_count").notNull().default(0),
  failedCount: integer("failed_count").notNull().default(0),
  createdBy: text("created_by"),
  recipientPhone: text("recipient_phone"), // set only for single-member sends; null means "all contacts"
  // Public R2-backed URL of an attached picture, if any -- turns the send into
  // an MMS. Left in place (not deleted after sending) since carriers fetch it
  // asynchronously and the URL doubles as a record in send history.
  mediaUrl: text("media_url"),
});
