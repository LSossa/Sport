import { Router } from 'express';
import db from '../db/client';
import { addDays } from '../db/dateUtils';

const router = Router();

function weekData(table: string, start: string, end: string) {
  return db.prepare(
    `SELECT date, COUNT(*) as count FROM ${table} WHERE date >= ? AND date < ? GROUP BY date`
  ).all(start, end) as { date: string; count: number }[];
}

router.get('/week', (req, res) => {
  const start = (req.query.start as string) ?? new Date().toISOString().slice(0, 10);
  const end = addDays(start, 7);

  const waterGoal = Number((db.prepare("SELECT value FROM settings WHERE key='water_goal_ml'").get() as { value: string } | undefined)?.value ?? 2500);

  const waterRows = db.prepare(
    `SELECT date, SUM(amount_ml) as total_ml FROM water_logs WHERE date >= ? AND date < ? GROUP BY date`
  ).all(start, end) as { date: string; total_ml: number }[];

  res.json({
    start,
    workouts: weekData('workouts', start, end),
    meals: weekData('meals', start, end),
    shakes: weekData('shakes', start, end),
    vitamins: weekData('vitamins', start, end),
    water: waterRows,
    water_goal_ml: waterGoal,
  });
});

router.get('/day', (req, res) => {
  const date = (req.query.date as string) ?? new Date().toISOString().slice(0, 10);

  const waterTotal = (db.prepare('SELECT SUM(amount_ml) as total FROM water_logs WHERE date = ?').get(date) as { total: number | null }).total ?? 0;
  const waterGoal = Number((db.prepare("SELECT value FROM settings WHERE key='water_goal_ml'").get() as { value: string } | undefined)?.value ?? 2500);

  res.json({
    date,
    workouts: db.prepare('SELECT * FROM workouts WHERE date = ? ORDER BY logged_at').all(date),
    meals: db.prepare('SELECT * FROM meals WHERE date = ? ORDER BY logged_at').all(date),
    shakes: db.prepare('SELECT * FROM shakes WHERE date = ? ORDER BY logged_at').all(date),
    vitamins: db.prepare('SELECT * FROM vitamins WHERE date = ? ORDER BY logged_at').all(date),
    water: db.prepare('SELECT * FROM water_logs WHERE date = ? ORDER BY logged_at').all(date),
    water_total_ml: waterTotal,
    water_goal_ml: waterGoal,
  });
});

export default router;
