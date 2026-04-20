import { Router } from 'express';
import { z } from 'zod';
import db from '../db/client';
import { addDays } from '../db/dateUtils';
import type { Shake } from '../types';

const router = Router();

const ShakeBody = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  name: z.string().min(1),
  brand: z.string().nullable().optional(),
  serving_g: z.number().positive().nullable().optional(),
  calories: z.number().int().positive().nullable().optional(),
  protein_g: z.number().positive().nullable().optional(),
  notes: z.string().nullable().optional(),
});

router.get('/', (req, res) => {
  const { date, week } = req.query;
  if (date) return res.json(db.prepare('SELECT * FROM shakes WHERE date = ? ORDER BY logged_at DESC').all(date));
  if (week) return res.json(db.prepare('SELECT * FROM shakes WHERE date >= ? AND date < ? ORDER BY date, logged_at').all(week, addDays(week as string, 7)));
  res.json(db.prepare('SELECT * FROM shakes ORDER BY date DESC, logged_at DESC LIMIT 50').all());
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM shakes WHERE id = ?').get(req.params.id) as Shake | undefined;
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

router.post('/', (req, res) => {
  const parsed = ShakeBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const d = parsed.data;
  const result = db.prepare(
    'INSERT INTO shakes (date, name, brand, serving_g, calories, protein_g, notes) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(d.date, d.name, d.brand ?? null, d.serving_g ?? null, d.calories ?? null, d.protein_g ?? null, d.notes ?? null);
  res.status(201).json(db.prepare('SELECT * FROM shakes WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const parsed = ShakeBody.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const existing = db.prepare('SELECT * FROM shakes WHERE id = ?').get(req.params.id) as Shake | undefined;
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const d = parsed.data;
  db.prepare(
    `UPDATE shakes SET date=COALESCE(?,date), name=COALESCE(?,name), brand=COALESCE(?,brand),
     serving_g=COALESCE(?,serving_g), calories=COALESCE(?,calories), protein_g=COALESCE(?,protein_g),
     notes=COALESCE(?,notes) WHERE id=?`
  ).run(d.date ?? null, d.name ?? null, d.brand ?? null, d.serving_g ?? null, d.calories ?? null, d.protein_g ?? null, d.notes ?? null, req.params.id);
  res.json(db.prepare('SELECT * FROM shakes WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM shakes WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.status(204).send();
});

export default router;
