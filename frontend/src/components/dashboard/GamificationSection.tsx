import { CheckCircle2, Circle } from 'lucide-react';
import { useGamification } from '../../hooks/useGamification';
import type { GamificationStreaks, GamificationMissions, GamificationXp, GamificationBadge } from '../../api/types';

function StreaksCard({ streaks }: { streaks: GamificationStreaks }) {
  const items: { label: string; icon: string; value: number }[] = [
    { label: 'Run',      icon: '🏃', value: streaks.run },
    { label: 'WOD',      icon: '🏋️', value: streaks.wod },
    { label: 'Vitamins', icon: '💊', value: streaks.vitamins },
    { label: 'Shakes',   icon: '🥤', value: streaks.shakes },
    { label: 'Water',    icon: '💧', value: streaks.water },
  ];

  return (
    <div className="bg-slate-800 rounded-xl p-4 mb-3">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">🔥</span>
        <span className="font-semibold text-white">Streaks</span>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {items.map(({ label, icon, value }) => (
          <div key={label} className="flex flex-col items-center gap-1">
            <span className="text-lg">{icon}</span>
            {value > 0 ? (
              <span className="text-base font-bold text-orange-400">🔥{value}</span>
            ) : (
              <span className="text-base text-slate-500">—</span>
            )}
            <span className="text-xs text-slate-400">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DailyMissionsCard({ missions }: { missions: GamificationMissions }) {
  const simpleItems = [
    { label: 'Vitamins', icon: '💊', done: missions.vitamins.done },
    { label: 'Shakes',   icon: '🥤', done: missions.shakes.done },
  ];

  return (
    <div className="bg-slate-800 rounded-xl p-4 mb-3">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">🎯</span>
        <span className="font-semibold text-white">Today's Missions</span>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>🏃</span>
            <span className="text-sm text-slate-300">Workout</span>
            {missions.workout.done && (
              <div className="flex gap-1 ml-1">
                {missions.workout.hasRun && <span className="text-xs bg-slate-600 rounded px-1 text-slate-300">Run</span>}
                {missions.workout.hasWod && <span className="text-xs bg-slate-600 rounded px-1 text-slate-300">WOD</span>}
              </div>
            )}
          </div>
          {missions.workout.done
            ? <CheckCircle2 size={18} className="text-green-400" />
            : <Circle size={18} className="text-slate-600" />
          }
        </div>
        {simpleItems.map(({ label, icon, done }) => (
          <div key={label} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>{icon}</span>
              <span className="text-sm text-slate-300">{label}</span>
            </div>
            {done
              ? <CheckCircle2 size={18} className="text-green-400" />
              : <Circle size={18} className="text-slate-600" />
            }
          </div>
        ))}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>💧</span>
            <span className="text-sm text-slate-300">Water</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-20 h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${missions.water.percent}%` }}
              />
            </div>
            <span className="text-xs text-slate-400 w-8 text-right">{missions.water.percent}%</span>
            {missions.water.done
              ? <CheckCircle2 size={18} className="text-green-400" />
              : <Circle size={18} className="text-slate-600" />
            }
          </div>
        </div>
      </div>
    </div>
  );
}

function XpLevelCard({ xp }: { xp: GamificationXp }) {
  const xpToNext = xp.nextLevelXp != null ? xp.nextLevelXp - xp.total : null;

  return (
    <div className="bg-slate-800 rounded-xl p-4 mb-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">⚡</span>
          <span className="font-semibold text-white">{xp.level}</span>
        </div>
        <span className="text-sm text-slate-400">{xp.total.toLocaleString()} XP</span>
      </div>
      <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden mb-1">
        <div
          className="h-full bg-yellow-400 rounded-full transition-all"
          style={{ width: `${xp.progressPercent}%` }}
        />
      </div>
      <span className="text-xs text-slate-500">
        {xpToNext != null ? `${xpToNext} XP to next level` : 'Max level reached'}
      </span>
    </div>
  );
}

function BadgesCard({ earned, upcoming }: { earned: GamificationBadge[]; upcoming: GamificationBadge[] }) {
  return (
    <div className="bg-slate-800 rounded-xl p-4 mb-3">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">🏅</span>
        <span className="font-semibold text-white">Badges</span>
        <span className="text-xs text-slate-400 ml-auto">{earned.length} earned</span>
      </div>
      {earned.length === 0 && upcoming.length === 0 && (
        <p className="text-sm text-slate-500">Log activities to earn badges!</p>
      )}
      <div className="flex flex-wrap gap-2">
        {earned.map(badge => (
          <div
            key={badge.id}
            title={`${badge.name}: ${badge.description}`}
            className="flex items-center gap-1 bg-slate-700 rounded-lg px-2 py-1 cursor-default"
          >
            <span>🏅</span>
            <span className="text-xs text-white">{badge.name}</span>
          </div>
        ))}
        {upcoming.map(badge => (
          <div
            key={badge.id}
            title={badge.description}
            className="flex items-center gap-1 bg-slate-700/50 rounded-lg px-2 py-1 cursor-default opacity-50"
          >
            <span className="text-slate-500">○</span>
            <span className="text-xs text-slate-400">{badge.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function GamificationSection() {
  const { data, isLoading, isError } = useGamification();

  if (isLoading) {
    return <div className="bg-slate-800 rounded-xl h-32 animate-pulse mb-3" />;
  }

  if (isError || !data) return null;

  return (
    <>
      <DailyMissionsCard missions={data.missions} />
      <StreaksCard streaks={data.streaks} />
      <XpLevelCard xp={data.xp} />
      <BadgesCard earned={data.badges.earned} upcoming={data.badges.upcoming} />
    </>
  );
}
