CREATE TABLE IF NOT EXISTS page_view_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL,
  day TEXT NOT NULL,
  path TEXT NOT NULL,
  country TEXT,
  referrer_host TEXT,
  browser TEXT,
  os TEXT,
  device TEXT,
  ip_hash TEXT,
  bot INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_page_view_day ON page_view_events(day);
CREATE INDEX IF NOT EXISTS idx_page_view_ts ON page_view_events(ts);
CREATE INDEX IF NOT EXISTS idx_page_view_path ON page_view_events(path);
CREATE INDEX IF NOT EXISTS idx_page_view_ip ON page_view_events(ip_hash);

CREATE TABLE IF NOT EXISTS page_view_daily (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  day TEXT NOT NULL,
  path TEXT NOT NULL,
  country TEXT DEFAULT 'unknown',
  referrer_host TEXT DEFAULT 'direct',
  browser TEXT DEFAULT 'unknown',
  os TEXT DEFAULT 'unknown',
  device TEXT DEFAULT 'unknown',
  views INTEGER NOT NULL DEFAULT 1
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_dimensions
  ON page_view_daily(day, path, country, referrer_host, browser, os, device);
CREATE INDEX IF NOT EXISTS idx_daily_day ON page_view_daily(day);

CREATE TABLE IF NOT EXISTS drafts (
  id TEXT PRIMARY KEY,
  domain TEXT NOT NULL,
  dirs TEXT NOT NULL DEFAULT '[]',
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  tags_json TEXT NOT NULL DEFAULT '[]',
  series TEXT,
  lang TEXT NOT NULL DEFAULT 'zh-CN',
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  resource_id TEXT,
  success INTEGER NOT NULL DEFAULT 1,
  ip_hash TEXT,
  details TEXT
);
CREATE INDEX IF NOT EXISTS idx_audit_ts ON audit_logs(ts);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs(actor);
