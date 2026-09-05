import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const pageViewEvents = sqliteTable(
  "page_view_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    ts: integer("ts").notNull(),
    day: text("day").notNull(),
    path: text("path").notNull(),
    country: text("country"),
    referrerHost: text("referrer_host"),
    browser: text("browser"),
    os: text("os"),
    device: text("device"),
    ipHash: text("ip_hash"),
    bot: integer("bot", { mode: "boolean" }).notNull().default(false),
  },
  (table) => [
    index("idx_page_view_day").on(table.day),
    index("idx_page_view_ts").on(table.ts),
    index("idx_page_view_path").on(table.path),
    index("idx_page_view_ip").on(table.ipHash),
  ],
);

export const pageViewDaily = sqliteTable(
  "page_view_daily",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    day: text("day").notNull(),
    path: text("path").notNull(),
    country: text("country").default("unknown"),
    referrerHost: text("referrer_host").default("direct"),
    browser: text("browser").default("unknown"),
    os: text("os").default("unknown"),
    device: text("device").default("unknown"),
    views: integer("views").notNull().default(1),
  },
  (table) => [
    uniqueIndex("idx_daily_dimensions").on(
      table.day,
      table.path,
      table.country,
      table.referrerHost,
      table.browser,
      table.os,
      table.device,
    ),
    index("idx_daily_day").on(table.day),
  ],
);

export const drafts = sqliteTable("drafts", {
  id: text("id").primaryKey(),
  domain: text("domain").notNull(),
  dirs: text("dirs").notNull().default("[]"),
  slug: text("slug").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  tagsJson: text("tags_json").notNull().default("[]"),
  series: text("series"),
  lang: text("lang").notNull().default("zh-CN"),
  body: text("body").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const auditLogs = sqliteTable("audit_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ts: integer("ts").notNull(),
  actor: text("actor").notNull(),
  action: text("action").notNull(),
  resource: text("resource").notNull(),
  resourceId: text("resource_id"),
  success: integer("success", { mode: "boolean" }).notNull().default(true),
  ipHash: text("ip_hash"),
  details: text("details"),
});

export type PageViewEvent = typeof pageViewEvents.$inferSelect;
export type DraftRow = typeof drafts.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
