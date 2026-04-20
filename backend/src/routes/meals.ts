import { Router } from 'express';
import { z } from 'zod';
import db from '../db/client';
import { addDays } from '../db/dateUtils';
import type { Meal } from '../types';

const router = Router();

const MealBody = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  meal_type: z.string().nullable().optional(),
  description: z.string().min(1),
  calories: z.number().int().positive().nullable().optional(),
  protein_g: z.number().positive().nullable().optional(),
  carbs_g: z.number().positive().nullable().optional(),
  fat_g: z.number().positive().nullable().optional(),
  notes: z.string().nullable().optional(),
});

router.get('/', (req, res) => {
  const { date, week } = req.query;
  if (date) {
    return res.json(db.prepare('SELECT * FROM meals WHERE date = ? ORDER BY logged_at DESC').all(date));
  }
  if (week) {
    return res.json(db.prepare(
      'SELECT * FROM meals WHERE date >= ? AND date < ? ORDER BY date, logged_at'
    ).all(week, addDays(week as string, 7)));
  }
  res.json(db.prepare('SELECT * FROM meals ORDER BY date DESC, logged_at DESC LIMIT 50').all());
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM meals WHERE id = ?').get(req.params.id) as Meal | undefined;
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

router.post('/', (req, res) => {
  const parsed = MealBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const d = parsed.data;
  const result = db.prepare(
    'INSERT INTO meals (date, meal_type, description, calories, protein_g, carbs_g, fat_g, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(d.date, d.meal_type ?? null, d.description, d.calories ?? null, d.protein_g ?? null, d.carbs_g ?? null, d.fat_g ?? null, d.notes ?? null);
  res.status(201).json(db.prepare('SELECT * FROM meals WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const parsed = MealBody.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const existing = db.prepare('SELECT * FROM meals WHERE id = ?').get(req.params.id) as Meal | undefined;
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const d = parsed.data;
  db.prepare(
    `UPDATE meals SET
      date=COALESCE(?,date), meal_type=COALESCE(?,meal_type), description=COALESCE(?,description),
      calories=COALESCE(?,calories), protein_g=COALESCE(?,protein_g), carbs_g=COALESCE(?,carbs_g),
      fat_g=COALESCE(?,fat_g), notes=COALESCE(?,notes)
     WHERE id=?`
  ).run(d.date ?? null, d.meal_type ?? null, d.description ?? null, d.calories ?? null, d.protein_g ?? null, d.carbs_g ?? null, d.fat_g ?? null, d.notes ?? null, req.params.id);
  res.json(db.prepare('SELECT * FROM meals WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM meals WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.status(204).send();
});

export default router;
