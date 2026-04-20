import { Router } from 'express';
import { z } from 'zod';
import db from '../db/client';
import { sendPushToAll } from '../services/pushService';

const router = Router();

const SubscribeBody = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
});

router.get('/vapid-public-key', (_req, res) => {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) return res.status(503).json({ error: 'Push not configured' });
  res.json({ publicKey: key });
});

router.post('/subscribe', (req, res) => {
  const parsed = SubscribeBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { endpoint, keys } = parsed.data;
  db.prepare(
    `INSERT INTO push_subscriptions (endpoint, p256dh, auth)
     VALUES (?, ?, ?)
     ON CONFLICT(endpoint) DO UPDATE SET p256dh=excluded.p256dh, auth=excluded.auth`
  ).run(endpoint, keys.p256dh, keys.auth);
  res.status(201).json({ ok: true });
});

router.delete('/subscribe', (req, res) => {
  const parsed = z.object({ endpoint: z.string() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'endpoint required' });
  db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(parsed.data.endpoint);
  res.status(204).send();
});

router.post('/test', async (_req, res) => {
  await sendPushToAll({
    title: 'Sport Test',
    body: 'Push notifications are working!',
    category: 'test',
    url: '/',
  });
  res.json({ ok: true });
});

export default router;
