export const XP_PER_SOURCE: Record<string, number> = {
  workout_run:        30,
  workout_wod:        25,
  vitamins:           15,
  shakes:             10,
  water_any:           5,
  water_goal_bonus:    5,
  badge_bonus:         0, // badge bonusXp is added per-badge, not from this map
};

export const LEVELS = [
  { name: 'Rookie',  minXp: 0    },
  { name: 'Athlete', minXp: 500  },
  { name: 'Beast',   minXp: 1500 },
] as const;

export interface LevelInfo {
  name: string;
  levelMinXp: number;
  nextLevelXp: number | null;
  progressPercent: number;
}

export function getLevelFromXp(xp: number): LevelInfo {
  const levels = [...LEVELS];
  let idx = 0;
  for (let i = 0; i < levels.length; i++) {
    if (xp >= levels[i].minXp) idx = i;
  }
  const current = levels[idx];
  const next = idx < levels.length - 1 ? levels[idx + 1] : null;
  const progressPercent = next
    ? Math.min(100, Math.round(((xp - current.minXp) / (next.minXp - current.minXp)) * 100))
    : 100;
  return {
    name: current.name,
    levelMinXp: current.minXp,
    nextLevelXp: next ? next.minXp : null,
    progressPercent,
  };
}
