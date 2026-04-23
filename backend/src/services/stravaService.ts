import db from '../db/client';
import { awardXp } from './gamificationService';
import { sendPushToAll } from './pushService';

const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token';
const STRAVA_ACTIVITIES_URL = 'https://www.strava.com/api/v3/athlete/activities';
const STRAVA_ATHLETE_URL = 'https://www.strava.com/api/v3/athlete';

const RUN_TYPES = new Set(['Run', 'VirtualRun', 'TrailRun']);
const WOD_TYPES = new Set(['Workout', 'CrossFit', 'HIIT', 'Crosstraining', 'WeightTraining']);

interface StravaTokens {
  clientId: string;
  clientSecret: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

function getSetting(key: string): string | undefined {
  return (db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined)?.value;
}

function setSetting(key: string, value: string): void {
  db.prepare('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)').run(key, value, new Date().toISOString());
}

export function getStravaTokens(): StravaTokens | null {
  const clientId = getSetting('strava_client_id');
  const clientSecret = getSetting('strava_client_secret');
  const accessToken = getSetting('strava_access_token');
  const refreshToken = getSetting('strava_refresh_token');
  const expiresAt = getSetting('strava_token_expires_at');

  if (!clientId || !clientSecret || !accessToken || !refreshToken || !expiresAt) return null;
  return { clientId, clientSecret, accessToken, refreshToken, expiresAt: Number(expiresAt) };
}

export function isStravaConnected(): boolean {
  return getStravaTokens() !== null;
}

async function refreshIfNeeded(tokens: StravaTokens): Promise<string> {
  if (Date.now() / 1000 < tokens.expiresAt - 60) return tokens.accessToken;

  const res = await fetch(STRAVA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: tokens.clientId,
      client_secret: tokens.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: tokens.refreshToken,
    }),
  });

  if (!res.ok) throw new Error(`Strava token refresh failed: ${res.status}`);

  const data = await res.json() as { access_token: string; refresh_token: string; expires_at: number };
  setSetting('strava_access_token', data.access_token);
  setSetting('strava_refresh_token', data.refresh_token);
  setSetting('strava_token_expires_at', String(data.expires_at));
  return data.access_token;
}

export async function exchangeCode(code: string): Promise<{ athleteName: string }> {
  const tokens = getStravaTokens();
  if (!tokens?.clientId || !tokens?.clientSecret) throw new Error('Strava client credentials not configured');

  const res = await fetch(STRAVA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: tokens.clientId,
      client_secret: tokens.clientSecret,
      grant_type: 'authorization_code',
      code,
    }),
  });

  if (!res.ok) throw new Error(`Strava token exchange failed: ${res.status}`);

  const data = await res.json() as {
    access_token: string;
    refresh_token: string;
    expires_at: number;
    athlete: { firstname: string; lastname: string };
  };

  setSetting('strava_access_token', data.access_token);
  setSetting('strava_refresh_token', data.refresh_token);
  setSetting('strava_token_expires_at', String(data.expires_at));

  const name = `${data.athlete.firstname} ${data.athlete.lastname}`.trim();
  setSetting('strava_athlete_name', name);

  return { athleteName: name };
}

export function getAuthUrl(clientId: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${getSetting('strava_redirect_uri') ?? 'http://localhost:8080'}/settings`,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'activity:read_all',
  });
  return `https://www.strava.com/oauth/authorize?${params}`;
}

export function disconnect(): void {
  for (const key of ['strava_access_token', 'strava_refresh_token', 'strava_token_expires_at', 'strava_athlete_name', 'strava_last_sync']) {
    db.prepare('DELETE FROM settings WHERE key = ?').run(key);
  }
}

export async function syncActivities(): Promise<{ imported: number; skipped: number }> {
  const tokens = getStravaTokens();
  if (!tokens) throw new Error('Strava not connected');

  const accessToken = await refreshIfNeeded(tokens);
  const lastSync = getSetting('strava_last_sync');
  const after = lastSync ? Math.floor(new Date(lastSync).getTime() / 1000) : Math.floor(Date.now() / 1000) - 90 * 24 * 60 * 60;

  const res = await fetch(`${STRAVA_ACTIVITIES_URL}?after=${after}&per_page=100`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) throw new Error(`Strava activities fetch failed: ${res.status}`);

  const activities = await res.json() as Array<{
    id: number;
    sport_type: string;
    start_date_local: string;
    distance: number;
    moving_time: number;
    name: string;
  }>;

  let imported = 0;
  let skipped = 0;

  const insert = db.prepare(
    'INSERT OR IGNORE INTO workouts (date, type, duration_min, distance_km, notes, strava_activity_id) VALUES (?, ?, ?, ?, ?, ?)'
  );

  for (const act of activities) {
    const date = act.start_date_local.slice(0, 10);
    const stravaId = String(act.id);

    if (RUN_TYPES.has(act.sport_type)) {
      const result = insert.run(date, 'Running', null, act.distance > 0 ? Math.round(act.distance / 10) / 100 : null, act.name, stravaId);
      if (result.changes > 0) {
        const workoutId = Number(result.lastInsertRowid);
        const { newBadges } = awardXp('workout_run', workoutId, date);
        for (const badge of newBadges) {
          sendPushToAll({ title: 'Badge Unlocked!', body: `You earned: ${badge.name}`, category: 'badge', url: '/' }).catch(() => {});
        }
        imported++;
      } else {
        skipped++;
      }
    } else if (WOD_TYPES.has(act.sport_type)) {
      const result = insert.run(date, 'Crossfit', act.moving_time > 0 ? Math.round(act.moving_time / 60) : null, null, act.name, stravaId);
      if (result.changes > 0) {
        const workoutId = Number(result.lastInsertRowid);
        const { newBadges } = awardXp('workout_wod', workoutId, date);
        for (const badge of newBadges) {
          sendPushToAll({ title: 'Badge Unlocked!', body: `You earned: ${badge.name}`, category: 'badge', url: '/' }).catch(() => {});
        }
        imported++;
      } else {
        skipped++;
      }
    }
  }

  setSetting('strava_last_sync', new Date().toISOString());
  console.log(`[strava] sync done: ${imported} imported, ${skipped} skipped`);
  return { imported, skipped };
}

export async function syncStravaOnStartup(): Promise<void> {
  if (!isStravaConnected()) return;
  try {
    const { imported } = await syncActivities();
    if (imported > 0) console.log(`[strava] startup sync imported ${imported} activities`);
  } catch (err) {
    console.error('[strava] startup sync failed:', err);
  }
}
