import { Router } from 'express';
import { z } from 'zod';
import db from '../db/client';

const router = Router();

router.get('/', (req, res) => {
  const { days } = req.query;
  const limit = days ? Number(days) : 90;
  const from = new Date();
  from.setDate(from.getDate() - limit);
  const fromStr = from.toISOString().slice(0, 10);
  const rows = db.prepare('SELECT * FROM weight_logs WHERE date >= ? ORDER BY date ASC').all(fromStr);
  res.json(rows);
});

const WeightBody = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weight_kg: z.number().positive(),
  body_fat_pct: z.number().positive().nullable().optional(),
});

router.post('/', (req, res) => {
  const parsed = WeightBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { date, weight_kg, body_fat_pct } = parsed.data;
  db.prepare(
    `INSERT INTO weight_logs (date, weight_kg, body_fat_pct, source)
     VALUES (?, ?, ?, 'manual')
     ON CONFLICT(date) DO UPDATE SET weight_kg = excluded.weight_kg, body_fat_pct = excluded.body_fat_pct, source = 'manual'`
  ).run(date, weight_kg, body_fat_pct ?? null);
  res.status(201).json(db.prepare('SELECT * FROM weight_logs WHERE date = ?').get(date));
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM weight_logs WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.status(204).send();
});

export default router;
