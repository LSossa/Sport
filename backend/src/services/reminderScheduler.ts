import cron from 'node-cron';
import { DateTime } from 'luxon';
import db from '../db/client';
import { sendPushToAll } from './pushService';

const CATEGORIES = ['workouts', 'shakes', 'vitamins', 'water'] as const;
type Category = typeof CATEGORIES[number];

const TABLE: Record<Category, string> = {
  workouts: 'workouts',
  shakes: 'shakes',
  vitamins: 'vitamins',
  water: 'water_logs',
};

const LABELS: Record<Category, string> = {
  workouts: 'Workout',
  shakes: 'Shake',
  vitamins: 'Vitamins',
  water: 'Water',
};

function getSettings(): Record<string, string> {
  const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;
  return map;
}

export function startReminderScheduler(): void {
  cron.schedule('* * * * *', async () => {
    const settings = getSettings();
    const timezone = settings['timezone'] ?? 'UTC';
    const now = DateTime.now().setZone(timezone);
    const currentTime = now.toFormat('HH:mm');
    const today = now.toFormat('yyyy-MM-dd');

    for (const category of CATEGORIES) {
      const enabled = settings[`reminder_enabled_${category}`] === 'true';
      const cutoff = settings[`reminder_cutoff_${category}`];

      if (!enabled || currentTime !== cutoff) continue;

      const { count } = db.prepare(
        `SELECT COUNT(*) as count FROM ${TABLE[category]} WHERE date = ?`
      ).get(today) as { count: number };

      if (count === 0) {
        await sendPushToAll({
          title: `${LABELS[category]} Reminder`,
          body: `You haven't logged your ${LABELS[category].toLowerCase()} today yet.`,
          category,
          url: `/${category}`,
        });
        console.log(`[scheduler] sent reminder for ${category}`);
      }
    }
  });

  console.log('[scheduler] reminder scheduler started');
}
