export interface BadgeCheckStats {
  totalRuns: number;
  totalWods: number;
  totalVitaminDays: number;
  totalShakeDays: number;
  totalWaterGoalDays: number;
  currentRunStreak: number;
  currentWodStreak: number;
  currentVitaminStreak: number;
  currentShakeStreak: number;
  currentWaterStreak: number;
  perfectWeekStreak: number;
}

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  bonusXp: number;
  check: (stats: BadgeCheckStats) => boolean;
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    id: 'first_run',
    name: 'First Steps',
    description: 'Log your first run.',
    bonusXp: 50,
    check: s => s.totalRuns >= 1,
  },
  {
    id: 'first_wod',
    name: 'WOD Warrior',
    description: 'Log your first CrossFit WOD.',
    bonusXp: 50,
    check: s => s.totalWods >= 1,
  },
  {
    id: 'runs_10',
    name: 'Road Runner',
    description: 'Log 10 runs.',
    bonusXp: 100,
    check: s => s.totalRuns >= 10,
  },
  {
    id: 'runs_50',
    name: 'Marathon Mind',
    description: 'Log 50 runs.',
    bonusXp: 200,
    check: s => s.totalRuns >= 50,
  },
  {
    id: 'wods_25',
    name: 'CrossFit Grind',
    description: 'Log 25 CrossFit WODs.',
    bonusXp: 150,
    check: s => s.totalWods >= 25,
  },
  {
    id: 'streak_run_7',
    name: 'On Fire',
    description: 'Run 7 days in a row.',
    bonusXp: 75,
    check: s => s.currentRunStreak >= 7,
  },
  {
    id: 'streak_vitamins_30',
    name: 'Supplement Stack',
    description: 'Log vitamins 30 days in a row.',
    bonusXp: 100,
    check: s => s.currentVitaminStreak >= 30,
  },
  {
    id: 'streak_water_14',
    name: 'Hydration Hero',
    description: 'Hit your water goal 14 days in a row.',
    bonusXp: 75,
    check: s => s.currentWaterStreak >= 14,
  },
  {
    id: 'water_goal_100',
    name: 'H2O Century',
    description: 'Hit your daily water goal 100 times.',
    bonusXp: 200,
    check: s => s.totalWaterGoalDays >= 100,
  },
  {
    id: 'streak_shakes_14',
    name: 'Shake Habit',
    description: 'Log a protein shake 14 days in a row.',
    bonusXp: 75,
    check: s => s.currentShakeStreak >= 14,
  },
  {
    id: 'perfect_week',
    name: 'Perfect Week',
    description: 'Log all five categories every day for 7 days straight.',
    bonusXp: 250,
    check: s => s.perfectWeekStreak >= 7,
  },
];
