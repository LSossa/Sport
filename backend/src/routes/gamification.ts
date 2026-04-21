import { Router } from 'express';
import { getGamificationSummary } from '../services/gamificationService';
import { getToday } from '../db/dateUtils';
import db from '../db/client';

const router = Router();

router.get('/summary', (req, res) => {
  const timezone = (db.prepare("SELECT value FROM settings WHERE key = 'timezone'").get() as { value: string } | undefined)?.value ?? 'UTC';
  const today = (req.query.date as string) ?? getToday(timezone);
  res.json(getGamificationSummary(today));
});

export default router;
