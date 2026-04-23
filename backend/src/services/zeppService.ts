import { createHash } from 'crypto';
import db from '../db/client';

const AUTH_URL = 'https://account.huami.com/v2/client/login';
const DATA_URL = 'https://api-mifit-us2.huami.com/v1/data/band_data.json';

function getSetting(key: string): string | undefined {
  return (db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined)?.value;
}

function setSetting(key: string, value: string): void {
  db.prepare('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)').run(key, value, new Date().toISOString());
}

export function isZeppConnected(): boolean {
  return !!(getSetting('zepp_email') && getSetting('zepp_password'));
}

export function getZeppStatus() {
  return {
    connected: isZeppConnected(),
    email: getSetting('zepp_email') ?? null,
    lastSync: getSetting('zepp_last_sync') ?? null,
  };
}

export function saveZeppCredentials(email: string, password: string): void {
  setSetting('zepp_email', email);
  setSetting('zepp_password', password);
  // Clear cached token so next sync re-authenticates
  db.prepare("DELETE FROM settings WHERE key = 'zepp_access_token'").run();
}

export function disconnectZepp(): void {
  for (const key of ['zepp_email', 'zepp_password', 'zepp_access_token', 'zepp_last_sync']) {
    db.prepare('DELETE FROM settings WHERE key = ?').run(key);
  }
}

async function authenticate(): Promise<string> {
  const email = getSetting('zepp_email');
  const password = getSetting('zepp_password');
  if (!email || !password) throw new Error('Zepp credentials not configured');

  const passwordMd5 = createHash('md5').update(password).digest('hex');
  const deviceId = 'e2b1c3d4-f5a6-7890-bcde-f01234567890';

  const body = new URLSearchParams({
    app_name: 'com.xiaomi.hm.health',
    dn: 'account.huami.com,api-user.huami.com,api-watch.huami.com,app-analytics.huami.com',
    device_id: deviceId,
    device_model: 'android_phone',
    grant_type: 'password',
    password: passwordMd5,
    source: 'com.xiaomi.hm.health',
    third_name: 'huami_phone',
    token: '0',
    user_name: email,
  });

  const res = await fetch(AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) throw new Error(`Zepp auth failed: HTTP ${res.status}`);

  const data = await res.json() as {
    token_info?: { login_token?: string };
    error_code?: string;
    message?: string;
  };

  const token = data.token_info?.login_token;
  if (!token) throw new Error(`Zepp auth rejected: ${data.message ?? data.error_code ?? 'unknown error'}`);

  setSetting('zepp_access_token', token);
  return token;
}

interface WeightEntry {
  date: string;      // YYYY-MM-DD
  weight_kg: number;
  body_fat_pct: number | null;
}

function parseWeightItems(items: unknown[]): WeightEntry[] {
  const results: WeightEntry[] = [];
  for (const item of items) {
    if (typeof item !== 'object' || item === null) continue;
    const obj = item as Record<string, unknown>;

    // date_time format: "2024-01-15 08:30:00" or "20240115"
    let date: string | null = null;
    if (typeof obj['date_time'] === 'string') {
      date = (obj['date_time'] as string).slice(0, 10).replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');
    } else if (typeof obj['date'] === 'string') {
      const d = obj['date'] as string;
      date = d.length === 8 ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}` : d.slice(0, 10);
    }
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;

    // weight in grams
    const weightRaw = obj['weight'] ?? obj['weight_kg'];
    if (typeof weightRaw !== 'number') continue;
    const weight_kg = weightRaw > 500 ? weightRaw / 1000 : weightRaw; // grams → kg if > 500

    const fatRaw = obj['body_fat'] ?? obj['fat_rate'] ?? obj['body_fat_pct'];
    const body_fat_pct = typeof fatRaw === 'number' ? fatRaw : null;

    results.push({ date, weight_kg: Math.round(weight_kg * 10) / 10, body_fat_pct });
  }
  return results;
}

export async function syncWeight(): Promise<{ imported: number; updated: number }> {
  let token = getSetting('zepp_access_token');
  if (!token) token = await authenticate();

  const toDate = new Date();
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 90);

  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  const url = new URL(DATA_URL);
  url.searchParams.set('apptoken', token);
  url.searchParams.set('query_type', 'weight');
  url.searchParams.set('device_type', '0i');
  url.searchParams.set('from_date', fmt(fromDate));
  url.searchParams.set('to_date', fmt(toDate));
  url.searchParams.set('limit', '300');

  let res = await fetch(url.toString(), {
    headers: { 'apptoken': token },
  });

  // Token may be stale — re-authenticate once
  if (res.status === 401 || res.status === 403) {
    token = await authenticate();
    url.searchParams.set('apptoken', token);
    res = await fetch(url.toString(), { headers: { 'apptoken': token } });
  }

  if (!res.ok) throw new Error(`Zepp data fetch failed: HTTP ${res.status}`);

  const json = await res.json() as {
    code?: number;
    data?: { items?: unknown[] } | unknown[];
    message?: string;
  };

  if (json.code !== 1 && json.code !== undefined) {
    throw new Error(`Zepp API error: ${json.message ?? JSON.stringify(json)}`);
  }

  // Normalise response shape — some versions wrap in data.items, some return array directly
  let rawItems: unknown[] = [];
  if (Array.isArray(json)) rawItems = json;
  else if (Array.isArray(json.data)) rawItems = json.data;
  else if (json.data && typeof json.data === 'object' && 'items' in json.data) rawItems = (json.data as { items: unknown[] }).items ?? [];

  const entries = parseWeightItems(rawItems);

  const upsert = db.prepare(
    `INSERT INTO weight_logs (date, weight_kg, body_fat_pct, source)
     VALUES (?, ?, ?, 'zepp')
     ON CONFLICT(date) DO UPDATE SET weight_kg = excluded.weight_kg, body_fat_pct = excluded.body_fat_pct, source = 'zepp'`
  );

  let imported = 0;
  let updated = 0;
  for (const e of entries) {
    const existing = db.prepare('SELECT id FROM weight_logs WHERE date = ?').get(e.date);
    upsert.run(e.date, e.weight_kg, e.body_fat_pct);
    existing ? updated++ : imported++;
  }

  setSetting('zepp_last_sync', new Date().toISOString());
  console.log(`[zepp] sync done: ${imported} imported, ${updated} updated`);
  return { imported, updated };
}

export async function syncZeppOnStartup(): Promise<void> {
  if (!isZeppConnected()) return;
  try {
    await syncWeight();
  } catch (err) {
    console.error('[zepp] startup sync failed:', err);
  }
}
