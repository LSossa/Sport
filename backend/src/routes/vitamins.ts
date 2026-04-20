import { Router } from 'express';
import { z } from 'zod';
import db from '../db/client';
import type { Vitamin } from '../types';

const router = Router();

const VitaminBody = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  name: z.string().min(1),
  dose_mg: z.number().positive().nullable().optional(),
  quantity: z.number().int().positive().optional(),
  notes: z.string().nullable().optional(),
});

router.get('/', (req, res) => {
  const { date, week } = req.query;
  if (date) return res.json(db.prepare('SELECT * FROM vitamins WHERE date = ? ORDER BY logged_at DESC').all(date));
  if (week) return res.json(db.prepare('SELECT * FROM vitamins WHERE date >= ? AND date < date(?, "+7 days") ORDER BY date, logged_at').all(week, week));
  res.json(db.prepare('SELECT * FROM vitamins ORDER BY date DESC, logged_at DESC LIMIT 50').all());
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM vitamins WHERE id = ?').get(req.params.id) as Vitamin | undefined;
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

router.post('/', (req, res) => {
  const parsed = VitaminBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const d = parsed.data;
  const result = db.prepare(
    'INSERT INTO vitamins (date, name, dose_mg, quantity, notes) VALUES (?, ?, ?, ?, ?)'
  ).run(d.date, d.name, d.dose_mg ?? null, d.quantity ?? 1, d.notes ?? null);
  res.status(201).json(db.prepare('SELECT * FROM vitamins WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const parsed = VitaminBody.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const existing = db.prepare('SELECT * FROM vitamins WHERE id = ?').get(req.params.id) as Vitamin | undefined;
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const d = parsed.data;
  db.prepare(
    `UPDATE vitamins SET date=COALESCE(?,date), name=COALESCE(?,name), dose_mg=COALESCE(?,dose_mg),
     quantity=COALESCE(?,quantity), notes=COALESCE(?,notes) WHERE id=?`
  ).run(d.date ?? null, d.name ?? null, d.dose_mg ?? null, d.quantity ?? null, d.notes ?? null, req.params.id);
  res.json(db.prepare('SELECT * FROM vitamins WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM vitamins WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.status(204).send();
});

export default router;
