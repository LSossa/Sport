import db from '../db/client';
import { getLevelFromXp, XP_PER_SOURCE } from './xpConfig';
import { BADGE_DEFINITIONS, BadgeDefinition, BadgeCheckStats } from './badgeDefinitions';

function getWaterGoal(): number {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'water_goal_ml'").get() as { value: string } | undefined;
  return row ? parseInt(row.value, 10) : 2500;
}

function prevDay(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function computeConsecutiveStreak(dates: string[], today: string): number {
  const set = new Set(dates);
  let streak = 0;
  let cursor = today;
  while (set.has(cursor)) {
    streak++;
    cursor = prevDay(cursor);
  }
  return streak;
}

export function computeStreaks(today: string) {
  const runDates = (db.prepare("SELECT DISTINCT date FROM workouts WHERE type = 'Running' ORDER BY date DESC").all() as { date: string }[]).map(r => r.date);
  const wodDates = (db.prepare("SELECT DISTINCT date FROM workouts WHERE type = 'Crossfit' ORDER BY date DESC").all() as { date: string }[]).map(r => r.date);
  const vitaminDates = (db.prepare(
    "SELECT date FROM vitamins WHERE name IN ('Omega-3','Multivitamin') GROUP BY date HAVING COUNT(DISTINCT name) = 2 ORDER BY date DESC"
  ).all() as { date: string }[]).map(r => r.date);
  const shakeDates = (db.prepare('SELECT DISTINCT date FROM shakes ORDER BY date DESC').all() as { date: string }[]).map(r => r.date);

  const waterGoal = getWaterGoal();
  const waterDates = (db.prepare('SELECT date FROM water_logs GROUP BY date HAVING SUM(amount_ml) >= ?').all(waterGoal) as { date: string }[]).map(r => r.date);

  return {
    run:      computeConsecutiveStreak(runDates, today),
    wod:      computeConsecutiveStreak(wodDates, today),
    vitamins: computeConsecutiveStreak(vitaminDates, today),
    shakes:   computeConsecutiveStreak(shakeDates, today),
    water:    computeConsecutiveStreak(waterDates, today),
  };
}

export function getDailyMissions(today: string) {
  const waterGoal = getWaterGoal();

  const runDone = (db.prepare("SELECT COUNT(*) as c FROM workouts WHERE date = ? AND type = 'Running'").get(today) as { c: number }).c > 0;
  const wodDone = (db.prepare("SELECT COUNT(*) as c FROM workouts WHERE date = ? AND type = 'Crossfit'").get(today) as { c: number }).c > 0;
  const omega3Done = (db.prepare("SELECT COUNT(*) as c FROM vitamins WHERE date = ? AND name = 'Omega-3'").get(today) as { c: number }).c > 0;
  const multiDone  = (db.prepare("SELECT COUNT(*) as c FROM vitamins WHERE date = ? AND name = 'Multivitamin'").get(today) as { c: number }).c > 0;
  const vitaminsDone = omega3Done && multiDone;
  const shakesDone = (db.prepare('SELECT COUNT(*) as c FROM shakes WHERE date = ?').get(today) as { c: number }).c > 0;
  const waterAmount = (db.prepare('SELECT COALESCE(SUM(amount_ml),0) as total FROM water_logs WHERE date = ?').get(today) as { total: number }).total;

  return {
    workout:  { done: runDone || wodDone, hasRun: runDone, hasWod: wodDone },
    vitamins: { done: vitaminsDone },
    shakes:   { done: shakesDone },
    water: {
      done:      waterAmount >= waterGoal,
      amount_ml: waterAmount,
      goal_ml:   waterGoal,
      percent:   Math.min(100, Math.round((waterAmount / waterGoal) * 100)),
    },
  };
}

function buildBadgeStats(today: string): BadgeCheckStats {
  const waterGoal = getWaterGoal();
  const streaks = computeStreaks(today);

  const totalRuns = (db.prepare("SELECT COUNT(*) as c FROM workouts WHERE type = 'Running'").get() as { c: number }).c;
  const totalWods = (db.prepare("SELECT COUNT(*) as c FROM workouts WHERE type = 'Crossfit'").get() as { c: number }).c;
  const totalVitaminDays = (db.prepare(
    "SELECT COUNT(*) as c FROM (SELECT date FROM vitamins WHERE name IN ('Omega-3','Multivitamin') GROUP BY date HAVING COUNT(DISTINCT name) = 2)"
  ).get() as { c: number }).c;
  const totalShakeDays = (db.prepare('SELECT COUNT(DISTINCT date) as c FROM shakes').get() as { c: number }).c;
  const totalWaterGoalDays = (db.prepare('SELECT COUNT(*) as c FROM (SELECT date FROM water_logs GROUP BY date HAVING SUM(amount_ml) >= ?)').get(waterGoal) as { c: number }).c;

  // Perfect week: all 5 categories logged on the same day, check consecutive days
  const perfectDays = computePerfectDayStreak(today, waterGoal);

  return {
    totalRuns,
    totalWods,
    totalVitaminDays,
    totalShakeDays,
    totalWaterGoalDays,
    currentRunStreak:     streaks.run,
    currentWodStreak:     streaks.wod,
    currentVitaminStreak: streaks.vitamins,
    currentShakeStreak:   streaks.shakes,
    currentWaterStreak:   streaks.water,
    perfectWeekStreak:    perfectDays,
  };
}

function computePerfectDayStreak(today: string, waterGoal: number): number {
  let streak = 0;
  let cursor = today;
  for (let i = 0; i < 365; i++) {
    const runDone = (db.prepare("SELECT COUNT(*) as c FROM workouts WHERE date = ? AND type = 'Running'").get(cursor) as { c: number }).c > 0;
    const wodDone = (db.prepare("SELECT COUNT(*) as c FROM workouts WHERE date = ? AND type = 'Crossfit'").get(cursor) as { c: number }).c > 0;
    const vitDone = (db.prepare("SELECT COUNT(*) as c FROM vitamins WHERE date = ? AND name = 'Omega-3'").get(cursor) as { c: number }).c > 0
      && (db.prepare("SELECT COUNT(*) as c FROM vitamins WHERE date = ? AND name = 'Multivitamin'").get(cursor) as { c: number }).c > 0;
    const shakeDone = (db.prepare('SELECT COUNT(*) as c FROM shakes WHERE date = ?').get(cursor) as { c: number }).c > 0;
    const waterAmt = (db.prepare('SELECT COALESCE(SUM(amount_ml),0) as total FROM water_logs WHERE date = ?').get(cursor) as { total: number }).total;
    if ((runDone || wodDone) && vitDone && shakeDone && waterAmt >= waterGoal) {
      streak++;
      cursor = prevDay(cursor);
    } else {
      break;
    }
  }
  return streak;
}

function checkAndAwardBadges(today: string): BadgeDefinition[] {
  const earnedIds = new Set(
    (db.prepare('SELECT badge_id FROM earned_badges').all() as { badge_id: string }[]).map(r => r.badge_id)
  );
  const stats = buildBadgeStats(today);
  const newBadges: BadgeDefinition[] = [];

  const insertBadge = db.prepare("INSERT OR IGNORE INTO earned_badges (badge_id) VALUES (?)");
  const insertXp = db.prepare('INSERT INTO xp_log (source, amount) VALUES (?, ?)');
  const updateXp = db.prepare('UPDATE user_xp SET total_xp = total_xp + ?, updated_at = ? WHERE id = 1');
  const now = new Date().toISOString();

  for (const badge of BADGE_DEFINITIONS) {
    if (earnedIds.has(badge.id)) continue;
    if (badge.check(stats)) {
      insertBadge.run(badge.id);
      if (badge.bonusXp > 0) {
        insertXp.run('badge_bonus', badge.bonusXp);
        updateXp.run(badge.bonusXp, now);
      }
      newBadges.push(badge);
    }
  }

  return newBadges;
}

export function awardXp(source: string, refId: number, date: string): { xpEarned: number; newTotal: number; newBadges: BadgeDefinition[] } {
  const baseAmount = XP_PER_SOURCE[source] ?? 0;

  let bonusAmount = 0;
  if (source === 'water_any') {
    const waterGoal = getWaterGoal();
    const totalBefore = (db.prepare('SELECT COALESCE(SUM(amount_ml),0) as total FROM water_logs WHERE date = ? AND id != ?').get(date, refId) as { total: number }).total;
    const totalAfter = (db.prepare('SELECT COALESCE(SUM(amount_ml),0) as total FROM water_logs WHERE date = ?').get(date) as { total: number }).total;
    if (totalBefore < waterGoal && totalAfter >= waterGoal) {
      bonusAmount = XP_PER_SOURCE['water_goal_bonus'] ?? 0;
    }
  }

  const xpEarned = baseAmount + bonusAmount;
  const now = new Date().toISOString();

  const insertXp = db.prepare('INSERT INTO xp_log (source, amount, ref_id) VALUES (?, ?, ?)');
  const updateXp = db.prepare('UPDATE user_xp SET total_xp = total_xp + ?, updated_at = ? WHERE id = 1');

  const txn = db.transaction(() => {
    if (xpEarned > 0) {
      insertXp.run(source, xpEarned, refId);
      updateXp.run(xpEarned, now);
    }
  });
  txn();

  const newTotal = (db.prepare('SELECT total_xp FROM user_xp WHERE id = 1').get() as { total_xp: number }).total_xp;
  const newBadges = checkAndAwardBadges(date);

  return { xpEarned, newTotal, newBadges };
}

export interface GamificationSummary {
  today: string;
  streaks: { run: number; wod: number; vitamins: number; shakes: number; water: number };
  missions: ReturnType<typeof getDailyMissions>;
  xp: {
    total: number;
    level: string;
    levelMinXp: number;
    nextLevelXp: number | null;
    progressPercent: number;
  };
  badges: {
    earned: Array<{ id: string; name: string; description: string; earnedAt: string }>;
    upcoming: Array<{ id: string; name: string; description: string }>;
  };
}

export function getGamificationSummary(today: string): GamificationSummary {
  const streaks = computeStreaks(today);
  const missions = getDailyMissions(today);

  const { total_xp } = db.prepare('SELECT total_xp FROM user_xp WHERE id = 1').get() as { total_xp: number };
  const levelInfo = getLevelFromXp(total_xp);

  const earnedRows = db.prepare('SELECT badge_id, earned_at FROM earned_badges ORDER BY earned_at ASC').all() as { badge_id: string; earned_at: string }[];
  const earnedIds = new Set(earnedRows.map(r => r.badge_id));

  const earned = earnedRows.map(row => {
    const def = BADGE_DEFINITIONS.find(b => b.id === row.badge_id);
    return {
      id: row.badge_id,
      name: def?.name ?? row.badge_id,
      description: def?.description ?? '',
      earnedAt: row.earned_at,
    };
  });

  const upcoming = BADGE_DEFINITIONS
    .filter(b => !earnedIds.has(b.id))
    .slice(0, 3)
    .map(b => ({ id: b.id, name: b.name, description: b.description }));

  return {
    today,
    streaks,
    missions,
    xp: {
      total: total_xp,
      level: levelInfo.name,
      levelMinXp: levelInfo.levelMinXp,
      nextLevelXp: levelInfo.nextLevelXp,
      progressPercent: levelInfo.progressPercent,
    },
    badges: { earned, upcoming },
  };
}
