import { CheckCircle2 } from 'lucide-react';
import { useVitamins, useCreateVitamin, useDeleteVitamin } from '../../hooks/useVitamins';

const VITAMINS = [
  { name: 'Omega-3',      icon: '🐟' },
  { name: 'Multivitamin', icon: '💊' },
] as const;

interface Props { date: string; onDone: () => void; }

export function VitaminForm({ date, onDone }: Props) {
  const { data: logged = [] } = useVitamins(date);
  const { mutateAsync: create, isPending: isCreating } = useCreateVitamin();
  const { mutateAsync: remove, isPending: isDeleting } = useDeleteVitamin();
  const isPending = isCreating || isDeleting;

  const tap = async (name: string) => {
    const existing = logged.find(v => v.name === name);
    if (existing) {
      await remove({ id: existing.id, date });
    } else {
      await create({ date, name, dose_mg: null, quantity: 1, notes: null });
      onDone();
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-400 text-center">Tap to mark as taken — tap again to undo</p>
      <div className="grid grid-cols-2 gap-3">
        {VITAMINS.map(({ name, icon }) => {
          const done = logged.some(v => v.name === name);
          return (
            <button
              key={name}
              onClick={() => tap(name)}
              disabled={isPending}
              className={`flex flex-col items-center justify-center gap-2 py-6 rounded-xl font-semibold transition-colors disabled:opacity-50 ${
                done
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              <span className="text-3xl">{icon}</span>
              <span>{name}</span>
              {done && <CheckCircle2 size={18} className="text-green-200" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
