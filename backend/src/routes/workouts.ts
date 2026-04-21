import { Router } from 'express';
import { z } from 'zod';
import db from '../db/client';
import { addDays } from '../db/dateUtils';
import type { Workout, WorkoutExercise, ExerciseSet } from '../types';
import { awardXp } from '../services/gamificationService';
import { sendPushToAll } from '../services/pushService';

const router = Router();

const WorkoutBody = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: z.string().min(1),
  duration_min: z.number().positive().nullable().optional(),
  distance_km: z.number().positive().nullable().optional(),
  notes: z.string().nullable().optional(),
  is_detailed: z.union([z.boolean(), z.number().int()]).optional(),
});

const ExerciseBody = z.object({
  name: z.string().min(1),
  position: z.number().int().min(0).optional(),
  notes: z.string().nullable().optional(),
});

const SetBody = z.object({
  set_number: z.number().int().positive(),
  reps: z.number().int().positive().nullable().optional(),
  weight_kg: z.number().positive().nullable().optional(),
  duration_sec: z.number().int().positive().nullable().optional(),
  notes: z.string().nullable().optional(),
});

router.get('/', (req, res) => {
  const { date, week } = req.query;
  if (date) {
    const rows = db.prepare('SELECT * FROM workouts WHERE date = ? ORDER BY logged_at DESC').all(date) as Workout[];
    return res.json(rows);
  }
  if (week) {
    const rows = db.prepare(
      'SELECT * FROM workouts WHERE date >= ? AND date < ? ORDER BY date, logged_at'
    ).all(week, addDays(week as string, 7)) as Workout[];
    return res.json(rows);
  }
  const rows = db.prepare('SELECT * FROM workouts ORDER BY date DESC, logged_at DESC LIMIT 50').all() as Workout[];
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const workout = db.prepare('SELECT * FROM workouts WHERE id = ?').get(req.params.id) as Workout | undefined;
  if (!workout) return res.status(404).json({ error: 'Not found' });

  const exercises = db.prepare(
    'SELECT * FROM workout_exercises WHERE workout_id = ? ORDER BY position'
  ).all(req.params.id) as WorkoutExercise[];

  const exercisesWithSets = exercises.map(ex => ({
    ...ex,
    sets: db.prepare('SELECT * FROM exercise_sets WHERE exercise_id = ? ORDER BY set_number').all(ex.id) as ExerciseSet[],
  }));

  res.json({ ...workout, exercises: exercisesWithSets });
});

router.post('/', (req, res) => {
  const parsed = WorkoutBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { date, type, duration_min, distance_km, notes, is_detailed } = parsed.data;
  const result = db.prepare(
    'INSERT INTO workouts (date, type, duration_min, distance_km, notes, is_detailed) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(date, type, duration_min ?? null, distance_km ?? null, notes ?? null, is_detailed ? 1 : 0);
  const row = db.prepare('SELECT * FROM workouts WHERE id = ?').get(result.lastInsertRowid) as Workout;
  const source = type === 'Running' ? 'workout_run' : 'workout_wod';
  const { newBadges } = awardXp(source, Number(result.lastInsertRowid), date);
  for (const badge of newBadges) {
    sendPushToAll({ title: 'Badge Unlocked!', body: `You earned: ${badge.name}`, category: 'badge', url: '/' }).catch(() => {});
  }
  res.status(201).json(row);
});

router.put('/:id', (req, res) => {
  const parsed = WorkoutBody.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { date, type, duration_min, distance_km, notes, is_detailed } = parsed.data;
  const existing = db.prepare('SELECT * FROM workouts WHERE id = ?').get(req.params.id) as Workout | undefined;
  if (!existing) return res.status(404).json({ error: 'Not found' });
  db.prepare(
    'UPDATE workouts SET date=COALESCE(?,date), type=COALESCE(?,type), duration_min=COALESCE(?,duration_min), distance_km=COALESCE(?,distance_km), notes=COALESCE(?,notes), is_detailed=COALESCE(?,is_detailed) WHERE id=?'
  ).run(date ?? null, type ?? null, duration_min ?? null, distance_km ?? null, notes ?? null, is_detailed != null ? (is_detailed ? 1 : 0) : null, req.params.id);
  res.json(db.prepare('SELECT * FROM workouts WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM workouts WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.status(204).send();
});

// Exercises
router.post('/:id/exercises', (req, res) => {
  const workout = db.prepare('SELECT id FROM workouts WHERE id = ?').get(req.params.id);
  if (!workout) return res.status(404).json({ error: 'Workout not found' });
  const parsed = ExerciseBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { name, position, notes } = parsed.data;
  const result = db.prepare(
    'INSERT INTO workout_exercises (workout_id, name, position, notes) VALUES (?, ?, ?, ?)'
  ).run(req.params.id, name, position ?? 0, notes ?? null);
  res.status(201).json(db.prepare('SELECT * FROM workout_exercises WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/:id/exercises/:eid', (req, res) => {
  const parsed = ExerciseBody.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { name, position, notes } = parsed.data;
  const result = db.prepare(
    'UPDATE workout_exercises SET name=COALESCE(?,name), position=COALESCE(?,position), notes=COALESCE(?,notes) WHERE id=? AND workout_id=?'
  ).run(name ?? null, position ?? null, notes ?? null, req.params.eid, req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json(db.prepare('SELECT * FROM workout_exercises WHERE id = ?').get(req.params.eid));
});

router.delete('/:id/exercises/:eid', (req, res) => {
  const result = db.prepare('DELETE FROM workout_exercises WHERE id = ? AND workout_id = ?').run(req.params.eid, req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.status(204).send();
});

// Sets
router.post('/:id/exercises/:eid/sets', (req, res) => {
  const exercise = db.prepare('SELECT id FROM workout_exercises WHERE id = ? AND workout_id = ?').get(req.params.eid, req.params.id);
  if (!exercise) return res.status(404).json({ error: 'Exercise not found' });
  const parsed = SetBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { set_number, reps, weight_kg, duration_sec, notes } = parsed.data;
  const result = db.prepare(
    'INSERT INTO exercise_sets (exercise_id, set_number, reps, weight_kg, duration_sec, notes) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(req.params.eid, set_number, reps ?? null, weight_kg ?? null, duration_sec ?? null, notes ?? null);
  res.status(201).json(db.prepare('SELECT * FROM exercise_sets WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/:id/exercises/:eid/sets/:sid', (req, res) => {
  const parsed = SetBody.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { set_number, reps, weight_kg, duration_sec, notes } = parsed.data;
  const result = db.prepare(
    'UPDATE exercise_sets SET set_number=COALESCE(?,set_number), reps=COALESCE(?,reps), weight_kg=COALESCE(?,weight_kg), duration_sec=COALESCE(?,duration_sec), notes=COALESCE(?,notes) WHERE id=? AND exercise_id=?'
  ).run(set_number ?? null, reps ?? null, weight_kg ?? null, duration_sec ?? null, notes ?? null, req.params.sid, req.params.eid);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json(db.prepare('SELECT * FROM exercise_sets WHERE id = ?').get(req.params.sid));
});

router.delete('/:id/exercises/:eid/sets/:sid', (req, res) => {
  const result = db.prepare('DELETE FROM exercise_sets WHERE id = ? AND exercise_id = ?').run(req.params.sid, req.params.eid);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.status(204).send();
});

export default router;
