import express from 'express';
import cors from 'cors';
import { runMigrations } from './db/migrate';
import { initWebPush } from './services/pushService';
import { startReminderScheduler } from './services/reminderScheduler';
import { startBackupScheduler } from './services/backupService';
import { errorHandler } from './middleware/errorHandler';

import workoutsRouter from './routes/workouts';
import shakesRouter from './routes/shakes';
import vitaminsRouter from './routes/vitamins';
import waterRouter from './routes/water';
import dashboardRouter from './routes/dashboard';
import settingsRouter from './routes/settings';
import pushRouter from './routes/push';
import gamificationRouter from './routes/gamification';
import stravaRouter from './routes/strava';
import zeppRouter from './routes/zepp';
import weightRouter from './routes/weight';
import { syncStravaOnStartup } from './services/stravaService';
import { syncZeppOnStartup } from './services/zeppService';

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors());
app.use(express.json());

runMigrations();
initWebPush();
startReminderScheduler();
startBackupScheduler();
syncStravaOnStartup();
syncZeppOnStartup();

app.get('/api/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

app.use('/api/workouts', workoutsRouter);
app.use('/api/shakes', shakesRouter);
app.use('/api/vitamins', vitaminsRouter);
app.use('/api/water', waterRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/push', pushRouter);
app.use('/api/gamification', gamificationRouter);
app.use('/api/strava', stravaRouter);
app.use('/api/zepp', zeppRouter);
app.use('/api/weight', weightRouter);

app.use(errorHandler);

app.listen(PORT, () => console.log(`[server] listening on :${PORT}`));
