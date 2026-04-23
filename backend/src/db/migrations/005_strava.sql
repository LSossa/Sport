ALTER TABLE workouts ADD COLUMN strava_activity_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_workouts_strava_id
  ON workouts(strava_activity_id)
  WHERE strava_activity_id IS NOT NULL;
