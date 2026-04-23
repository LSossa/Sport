import { CheckCircle2 } from 'lucide-react';
import { useShakes, useCreateShake, useDeleteShake } from '../../hooks/useShakes';

const SHAKES = [
  { name: 'Protein Shake',        icon: '🥛', optional: false },
  { name: 'Creatine Monohydrate', icon: '💪', optional: false },
  { name: 'Pre-Workout',          icon: '⚡', optional: true  },
] as const;

interface Props { date: string; onDone: () => void; }

export function ShakeForm({ date, onDone }: Props) {
  const { data: logged = [] } = useShakes(date);
  const { mutateAsync: create, isPending: isCreating } = useCreateShake();
  const { mutateAsync: remove, isPending: isDeleting } = useDeleteShake();
  const isPending = isCreating || isDeleting;

  const tap = async (name: string) => {
    const existing = logged.find(s => s.name === name);
    if (existing) {
      await remove({ id: existing.id, date });
    } else {
      await create({ date, name, brand: null, serving_g: null, calories: null, protein_g: null, notes: null });
      onDone();
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-400 text-center">Tap to log — tap again to undo</p>
      <div className="grid grid-cols-2 gap-3">
        {SHAKES.slice(0, 2).map(({ name, icon }) => {
          const done = logged.some(s => s.name === name);
          return (
            <button
              key={name}
              onClick={() => tap(name)}
              disabled={isPending}
              className={`flex flex-col items-center justify-center gap-2 py-6 rounded-xl font-semibold transition-colors disabled:opacity-50 ${
                done ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              <span className="text-3xl">{icon}</span>
              <span className="text-sm text-center leading-tight">{name}</span>
              {done && <CheckCircle2 size={18} className="text-green-200" />}
            </button>
          );
        })}
      </div>
      {(() => {
        const { name, icon, optional } = SHAKES[2];
        const done = logged.some(s => s.name === name);
        return (
          <button
            onClick={() => tap(name)}
            disabled={isPending}
            className={`w-full flex items-center justify-between px-5 py-4 rounded-xl font-semibold transition-colors disabled:opacity-50 ${
              done ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{icon}</span>
              <span>{name}</span>
              {optional && <span className="text-xs text-slate-400 font-normal">optional</span>}
            </div>
            {done && <CheckCircle2 size={20} className="text-green-200" />}
          </button>
        );
      })()}
    </div>
  );
}
