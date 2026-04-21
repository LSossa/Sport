import { Router } from 'express';
import { z } from 'zod';
import db from '../db/client';
import { addDays } from '../db/dateUtils';
import type { WaterLog } from '../types';
import { awardXp } from '../services/gamificationService';
import { sendPushToAll } from '../services/pushService';

const router = Router();

const WaterBody = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount_ml: z.number().int().positive(),
});

router.get('/', (req, res) => {
  const { date, week } = req.query;
  if (date) return res.json(db.prepare('SELECT * FROM water_logs WHERE date = ? ORDER BY logged_at DESC').all(date));
  if (week) return res.json(db.prepare('SELECT * FROM water_logs WHERE date >= ? AND date < ? ORDER BY date, logged_at').all(week, addDays(week as string, 7)));
  res.json(db.prepare('SELECT * FROM water_logs ORDER BY date DESC, logged_at DESC LIMIT 50').all());
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM water_logs WHERE id = ?').get(req.params.id) as WaterLog | undefined;
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

router.post('/', (req, res) => {
  const parsed = WaterBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { date, amount_ml } = parsed.data;
  const result = db.prepare('INSERT INTO water_logs (date, amount_ml) VALUES (?, ?)').run(date, amount_ml);
  const row = db.prepare('SELECT * FROM water_logs WHERE id = ?').get(result.lastInsertRowid);
  const { newBadges } = awardXp('water_any', Number(result.lastInsertRowid), date);
  for (const badge of newBadges) {
    sendPushToAll({ title: 'Badge Unlocked!', body: `You earned: ${badge.name}`, category: 'badge', url: '/' }).catch(() => {});
  }
  res.status(201).json(row);
});

router.put('/:id', (req, res) => {
  const parsed = WaterBody.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const existing = db.prepare('SELECT * FROM water_logs WHERE id = ?').get(req.params.id) as WaterLog | undefined;
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const { date, amount_ml } = parsed.data;
  db.prepare('UPDATE water_logs SET date=COALESCE(?,date), amount_ml=COALESCE(?,amount_ml) WHERE id=?')
    .run(date ?? null, amount_ml ?? null, req.params.id);
  res.json(db.prepare('SELECT * FROM water_logs WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM water_logs WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.status(204).send();
});

export default router;
