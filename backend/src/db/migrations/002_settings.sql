CREATE TABLE IF NOT EXISTS settings (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

INSERT OR IGNORE INTO settings (key, value) VALUES
    ('reminder_cutoff_workouts',  '21:00'),
    ('reminder_cutoff_meals',     '20:00'),
    ('reminder_cutoff_shakes',    '19:00'),
    ('reminder_cutoff_vitamins',  '22:00'),
    ('reminder_cutoff_water',     '21:00'),
    ('reminder_enabled_workouts', 'true'),
    ('reminder_enabled_meals',    'true'),
    ('reminder_enabled_shakes',   'true'),
    ('reminder_enabled_vitamins', 'true'),
    ('reminder_enabled_water',    'true'),
    ('water_goal_ml',             '2500'),
    ('timezone',                  'America/New_York');
