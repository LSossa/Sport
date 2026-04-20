import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import db from '../db/client';

const DATA_DIR = path.dirname(process.env.DB_PATH ?? path.join(process.cwd(), 'sport.db'));
const KEEP_DAYS = 7;

export function startBackupScheduler(): void {
  cron.schedule('0 3 * * *', () => {
    try {
      const ts = new Date().toISOString().slice(0, 10);
      const dest = path.join(DATA_DIR, `sport-backup-${ts}.db`);
      db.backup(dest)
        .then(() => {
          console.log(`[backup] wrote ${dest}`);
          pruneOldBackups();
        })
        .catch((err: unknown) => console.error('[backup] failed', err));
    } catch (err) {
      console.error('[backup] failed', err);
    }
  });

  console.log('[backup] nightly backup scheduler started (03:00)');
}

function pruneOldBackups(): void {
  const files = fs.readdirSync(DATA_DIR)
    .filter(f => f.startsWith('sport-backup-') && f.endsWith('.db'))
    .sort();

  const toDelete = files.slice(0, Math.max(0, files.length - KEEP_DAYS));
  for (const f of toDelete) {
    fs.unlinkSync(path.join(DATA_DIR, f));
    console.log(`[backup] pruned ${f}`);
  }
}
