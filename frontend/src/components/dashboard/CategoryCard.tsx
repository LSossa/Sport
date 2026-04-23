import { addDays, format, startOfWeek } from 'date-fns';
import type { DaySummary, WaterDaySummary } from '../../api/types';

interface Props {
  label: string;
  icon: string;
  data: DaySummary[] | WaterDaySummary[];
  weekStart: Date;
  waterGoal?: number;
  isWater?: boolean;
  onDayClick?: (date: string) => void;
}

const DAY_LABELS = ['M', 'Tu', 'W', 'Th', 'F', 'Sa', 'Su'];

export function CategoryCard({ label, icon, data, weekStart, waterGoal, isWater, onDayClick }: Props) {
  const days = Array.from({ length: 7 }, (_, i) => format(addDays(startOfWeek(weekStart, { weekStartsOn: 1 }), i), 'yyyy-MM-dd'));

  const byDate = new Map(data.map(d => [d.date, 'count' in d ? d.count : d.total_ml]));

  const totalLogged = isWater
    ? `${Math.round([...byDate.values()].reduce((a, b) => a + b, 0) / 1000)}L`
    : `${days.filter(d => byDate.has(d)).length}/7`;

  return (
    <div className="bg-slate-800 rounded-xl p-4 mb-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <span className="font-semibold text-white">{label}</span>
        </div>
        <span className="text-sm text-slate-400">{totalLogged}</span>
      </div>
      <div className="flex gap-2">
        {days.map(date => {
          const val = byDate.get(date) ?? 0;
          let filled = false;
          let partial = false;
          if (isWater && waterGoal) {
            filled = val >= waterGoal;
            partial = val > 0 && val < waterGoal;
          } else {
            filled = val > 0;
          }
          return (
            <button
              key={date}
              onClick={() => onDayClick?.(date)}
              className={`flex-1 h-8 rounded transition-colors ${
                filled
                  ? 'bg-green-500'
                  : partial
                  ? 'bg-green-800'
                  : 'bg-slate-700 hover:bg-slate-600'
              }`}
              title={`${date}: ${isWater ? `${val}ml` : `${val} logged`}`}
            />
          );
        })}
      </div>
      <div className="flex justify-between mt-1">
        {DAY_LABELS.map((d, i) => (
          <span key={i} className="flex-1 text-center text-xs text-slate-500">{d}</span>
        ))}
      </div>
    </div>
  );
}
