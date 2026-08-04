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
  eventDate: text("event_date").notNull(),
  eventTime: text("event_time").notNull(),
  notes: text("notes"),
  resultsUrl: text("results_url"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const documents = sqliteTable("documents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  r2Key: text("r2_key").notNull(),
  fileName: text("file_name").notNull(),
  uploadedAt: text("uploaded_at").notNull().default("CURRENT_TIMESTAMP"),
});

export const members = sqliteTable("members", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  status: text("status").notNull().default("active"),
  createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP"),
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
