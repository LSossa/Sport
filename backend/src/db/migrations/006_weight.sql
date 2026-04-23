CREATE TABLE IF NOT EXISTS weight_logs (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  logged_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  date         TEXT NOT NULL UNIQUE,
  weight_kg    REAL NOT NULL,
  body_fat_pct REAL,
  source       TEXT NOT NULL DEFAULT 'manual'
);
CREATE INDEX IF NOT EXISTS idx_weight_date ON weight_logs(date);
