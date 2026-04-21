import express from 'express';
import cors from 'cors';
import { runMigrations } from './db/migrate';
import { initWebPush } from './services/pushService';
import { startReminderScheduler } from './services/reminderScheduler';
import { startBackupScheduler } from './services/backupService';
import { errorHandler } from './middleware/errorHandler';

import workoutsRouter from './routes/workouts';
import mealsRouter from './routes/meals';
import shakesRouter from './routes/shakes';
import vitaminsRouter from './routes/vitamins';
import waterRouter from './routes/water';
import dashboardRouter from './routes/dashboard';
import settingsRouter from './routes/settings';
import pushRouter from './routes/push';
import gamificationRouter from './routes/gamification';

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors());
app.use(express.json());

runMigrations();
initWebPush();
startReminderScheduler();
startBackupScheduler();

app.get('/api/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

app.use('/api/workouts', workoutsRouter);
app.use('/api/meals', mealsRouter);
app.use('/api/shakes', shakesRouter);
app.use('/api/vitamins', vitaminsRouter);
app.use('/api/water', waterRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/push', pushRouter);
app.use('/api/gamification', gamificationRouter);

app.use(errorHandler);

app.listen(PORT, () => console.log(`[server] listening on :${PORT}`));
