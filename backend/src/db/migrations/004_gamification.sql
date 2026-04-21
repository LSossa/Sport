CREATE TABLE IF NOT EXISTS user_xp (
  id         INTEGER PRIMARY KEY CHECK (id = 1),
  total_xp   INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
INSERT OR IGNORE INTO user_xp (id, total_xp) VALUES (1, 0);

CREATE TABLE IF NOT EXISTS xp_log (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  earned_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  source    TEXT NOT NULL,
  amount    INTEGER NOT NULL,
  ref_id    INTEGER
);

CREATE TABLE IF NOT EXISTS earned_badges (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  badge_id  TEXT NOT NULL UNIQUE,
  earned_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
