import { createHash } from 'crypto';
import db from '../db/client';

// Try EU endpoint first (user is in NL), fall back to US
const AUTH_ENDPOINTS = [
  'https://account-eu.huami.com/v2/client/login',
  'https://account.huami.com/v2/client/login',
];
const DATA_ENDPOINTS = [
  'https://api-mifit-eu.huami.com/v1/data/band_data.json',
  'https://api-mifit-us2.huami.com/v1/data/band_data.json',
];

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
  db.prepare("DELETE FROM settings WHERE key IN ('zepp_access_token','zepp_data_url')").run();
}

export function disconnectZepp(): void {
  for (const key of ['zepp_email', 'zepp_password', 'zepp_access_token', 'zepp_last_sync', 'zepp_data_url']) {
    db.prepare('DELETE FROM settings WHERE key = ?').run(key);
  }
}

function buildAuthBody(email: string, password: string): URLSearchParams {
  return new URLSearchParams({
    app_name: 'com.xiaomi.hm.health',
    dn: 'account.huami.com,api-user.huami.com,api-watch.huami.com,app-analytics.huami.com',
    device_id: 'e2b1c3d4-f5a6-7890-bcde-f01234567890',
    device_model: 'android_phone',
    grant_type: 'password',
    password,
    source: 'com.xiaomi.hm.health',
    third_name: 'huami_phone',
    token: '0',
    user_name: email,
  });
}

async function tryAuth(authUrl: string, email: string, password: string): Promise<string | null> {
  // Try plain-text password first, then MD5 — newer API versions dropped the MD5 requirement
  for (const pwd of [password, createHash('md5').update(password).digest('hex')]) {
    const res = await fetch(authUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: buildAuthBody(email, pwd).toString(),
    });

    const text = await res.text();
    console.log(`[zepp] auth ${authUrl} status=${res.status} body=${text.slice(0, 300)}`);

    if (!res.ok) continue;

    let data: { token_info?: { login_token?: string }; error_code?: string; message?: string };
    try { data = JSON.parse(text); } catch { continue; }

    const token = data.token_info?.login_token;
    if (token) return token;
  }
  return null;
}

async function authenticate(): Promise<{ token: string; dataUrl: string }> {
  const email = getSetting('zepp_email');
  const password = getSetting('zepp_password');
  if (!email || !password) throw new Error('Zepp credentials not configured');

  // Try every auth endpoint until one works
  for (let i = 0; i < AUTH_ENDPOINTS.length; i++) {
    const token = await tryAuth(AUTH_ENDPOINTS[i], email, password);
    if (token) {
      const dataUrl = DATA_ENDPOINTS[i] ?? DATA_ENDPOINTS[0];
      setSetting('zepp_access_token', token);
      setSetting('zepp_data_url', dataUrl);
      console.log(`[zepp] authenticated via ${AUTH_ENDPOINTS[i]}`);
      return { token, dataUrl };
    }
  }

  throw new Error(
    'Zepp authentication failed. Check your email and password. ' +
    'Make sure you created a Zepp account with email/password (not Google login). ' +
    'Check the server logs for the exact API response.'
  );
}

interface WeightEntry {
  date: string;
  weight_kg: number;
  body_fat_pct: number | null;
}

function parseWeightItems(items: unknown[]): WeightEntry[] {
  const results: WeightEntry[] = [];
  for (const item of items) {
    if (typeof item !== 'object' || item === null) continue;
    const obj = item as Record<string, unknown>;

    let date: string | null = null;
    if (typeof obj['date_time'] === 'string') {
      // "2024-01-15 08:30:00" or "20240115083000"
      const raw = (obj['date_time'] as string).replace(/\s.*/, '').replace(/^(\d{4})(\d{2})(\d{2}).*/, '$1-$2-$3');
      date = raw;
    } else if (typeof obj['date'] === 'string') {
      const d = obj['date'] as string;
      date = d.length === 8 ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}` : d.slice(0, 10);
    }
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;

    const weightRaw = obj['weight'] ?? obj['weight_kg'];
    if (typeof weightRaw !== 'number') continue;
    // Zepp returns weight in grams (e.g. 75500), but some endpoints return kg directly
    const weight_kg = weightRaw > 500 ? weightRaw / 1000 : weightRaw;

    const fatRaw = obj['body_fat'] ?? obj['fat_rate'] ?? obj['body_fat_pct'];
    const body_fat_pct = typeof fatRaw === 'number' ? fatRaw : null;

    results.push({ date, weight_kg: Math.round(weight_kg * 10) / 10, body_fat_pct });
  }
  return results;
}

export async function syncWeight(): Promise<{ imported: number; updated: number }> {
  let token = getSetting('zepp_access_token');
  let dataUrl = getSetting('zepp_data_url') ?? DATA_ENDPOINTS[0];

  if (!token) {
    const auth = await authenticate();
    token = auth.token;
    dataUrl = auth.dataUrl;
  }

  const toDate = new Date();
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 90);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  const url = new URL(dataUrl);
  url.searchParams.set('apptoken', token);
  url.searchParams.set('query_type', 'weight');
  url.searchParams.set('device_type', '0i');
  url.searchParams.set('from_date', fmt(fromDate));
  url.searchParams.set('to_date', fmt(toDate));
  url.searchParams.set('limit', '300');

  let res = await fetch(url.toString(), { headers: { apptoken: token } });

  if (res.status === 401 || res.status === 403) {
    const auth = await authenticate();
    token = auth.token;
    dataUrl = auth.dataUrl;
    url.hostname = new URL(dataUrl).hostname;
    url.searchParams.set('apptoken', token);
    res = await fetch(url.toString(), { headers: { apptoken: token } });
  }

  const text = await res.text();
  console.log(`[zepp] data status=${res.status} body=${text.slice(0, 500)}`);

  if (!res.ok) throw new Error(`Zepp data fetch failed: HTTP ${res.status} — ${text.slice(0, 200)}`);

  let json: { code?: number; data?: { items?: unknown[] } | unknown[]; message?: string };
  try { json = JSON.parse(text); } catch { throw new Error(`Zepp returned non-JSON: ${text.slice(0, 200)}`); }

  if (json.code !== undefined && json.code !== 1) {
    throw new Error(`Zepp API error (code ${json.code}): ${json.message ?? text.slice(0, 200)}`);
  }

  let rawItems: unknown[] = [];
  if (Array.isArray(json)) rawItems = json;
  else if (Array.isArray(json.data)) rawItems = json.data;
  else if (json.data && typeof json.data === 'object' && 'items' in json.data) {
    rawItems = (json.data as { items: unknown[] }).items ?? [];
  }

  console.log(`[zepp] parsed ${rawItems.length} raw items`);

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
