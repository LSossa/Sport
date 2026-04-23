import { Router } from 'express';
import db from '../db/client';
import {
  isStravaConnected,
  getStravaTokens,
  getAuthUrl,
  exchangeCode,
  syncActivities,
  disconnect,
} from '../services/stravaService';

const router = Router();

function getSetting(key: string): string | undefined {
  return (db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined)?.value;
}

router.get('/status', (_req, res) => {
  const connected = isStravaConnected();
  res.json({
    connected,
    athleteName: connected ? (getSetting('strava_athlete_name') ?? null) : null,
    lastSync: connected ? (getSetting('strava_last_sync') ?? null) : null,
  });
});

router.get('/auth-url', (req, res) => {
  const { clientId } = req.query as { clientId?: string };
  const stored = getStravaTokens();
  const id = clientId ?? stored?.clientId;
  if (!id) return res.status(400).json({ error: 'clientId required' });
  res.json({ url: getAuthUrl(id) });
});

router.post('/callback', async (req, res) => {
  const { code } = req.body as { code?: string };
  if (!code) return res.status(400).json({ error: 'code required' });
  try {
    const result = await exchangeCode(code);
    res.json(result);
  } catch (err) {
    res.status(502).json({ error: (err as Error).message });
  }
});

router.post('/sync', async (_req, res) => {
  if (!isStravaConnected()) return res.status(400).json({ error: 'Strava not connected' });
  try {
    const result = await syncActivities();
    res.json(result);
  } catch (err) {
    res.status(502).json({ error: (err as Error).message });
  }
});

router.delete('/disconnect', (_req, res) => {
  disconnect();
  res.status(204).send();
});

export default router;
