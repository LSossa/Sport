PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS workouts (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    logged_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
    date         TEXT NOT NULL,
    type         TEXT NOT NULL,
    duration_min INTEGER,
    notes        TEXT,
    is_detailed  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_workouts_date ON workouts(date);

CREATE TABLE IF NOT EXISTS workout_exercises (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    workout_id INTEGER NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    position   INTEGER NOT NULL DEFAULT 0,
    notes      TEXT
);

CREATE TABLE IF NOT EXISTS exercise_sets (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    exercise_id  INTEGER NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
    set_number   INTEGER NOT NULL,
    reps         INTEGER,
    weight_kg    REAL,
    duration_sec INTEGER,
    notes        TEXT
);

CREATE TABLE IF NOT EXISTS meals (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    logged_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
    date        TEXT NOT NULL,
    meal_type   TEXT,
    description TEXT NOT NULL,
    calories    INTEGER,
    protein_g   REAL,
    carbs_g     REAL,
    fat_g       REAL,
    notes       TEXT
);
CREATE INDEX IF NOT EXISTS idx_meals_date ON meals(date);

CREATE TABLE IF NOT EXISTS shakes (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    logged_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
    date      TEXT NOT NULL,
    name      TEXT NOT NULL,
    brand     TEXT,
    serving_g REAL,
    calories  INTEGER,
    protein_g REAL,
    notes     TEXT
);
CREATE INDEX IF NOT EXISTS idx_shakes_date ON shakes(date);

CREATE TABLE IF NOT EXISTS vitamins (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    logged_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
    date      TEXT NOT NULL,
    name      TEXT NOT NULL,
    dose_mg   REAL,
    quantity  INTEGER NOT NULL DEFAULT 1,
    notes     TEXT
);
CREATE INDEX IF NOT EXISTS idx_vitamins_date ON vitamins(date);

CREATE TABLE IF NOT EXISTS water_logs (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    logged_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
    date      TEXT NOT NULL,
    amount_ml INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_water_date ON water_logs(date);

CREATE TABLE IF NOT EXISTS push_subscriptions (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    endpoint   TEXT NOT NULL UNIQUE,
    p256dh     TEXT NOT NULL,
    auth       TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
