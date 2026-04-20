import { Router } from 'express';
import { z } from 'zod';
import db from '../db/client';

const router = Router();

router.get('/', (_req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
  const result: Record<string, string> = {};
  for (const row of rows) result[row.key] = row.value;
  res.json(result);
});

router.put('/', (req, res) => {
  const parsed = z.record(z.string()).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const upsert = db.prepare(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, strftime('%Y-%m-%dT%H:%M:%SZ','now'))
     ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at`
  );

  const txn = db.transaction((entries: [string, string][]) => {
    for (const [key, value] of entries) upsert.run(key, value);
  });

  txn(Object.entries(parsed.data));
  res.json({ ok: true });
});

export default router;
