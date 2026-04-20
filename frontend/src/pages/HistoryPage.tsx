import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format, addDays, subDays, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { EmptyState } from '../components/common/EmptyState';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { useDayData } from '../hooks/useDashboard';
import { useDeleteWorkout } from '../hooks/useWorkouts';
import { useDeleteMeal } from '../hooks/useMeals';
import { useDeleteShake } from '../hooks/useShakes';
import { useDeleteVitamin } from '../hooks/useVitamins';
import { useDeleteWater } from '../hooks/useWater';

export function HistoryPage() {
  const [params, setParams] = useSearchParams();
  const dateStr = params.get('date') ?? format(new Date(), 'yyyy-MM-dd');
  const date = parseISO(dateStr + 'T00:00:00');

  const { data, isLoading } = useDayData(dateStr);
  const [confirm, setConfirm] = useState<null | { type: string; id: number }>(null);

  const delWorkout = useDeleteWorkout();
  const delMeal = useDeleteMeal();
  const delShake = useDeleteShake();
  const delVitamin = useDeleteVitamin();
  const delWater = useDeleteWater();

  const setDate = (d: Date) => setParams({ date: format(d, 'yyyy-MM-dd') });

  const handleDelete = async () => {
    if (!confirm) return;
    const opts = { id: confirm.id, date: dateStr };
    if (confirm.type === 'workout') await delWorkout.mutateAsync(opts);
    else if (confirm.type === 'meal') await delMeal.mutateAsync(opts);
    else if (confirm.type === 'shake') await delShake.mutateAsync(opts);
    else if (confirm.type === 'vitamin') await delVitamin.mutateAsync(opts);
    else if (confirm.type === 'water') await delWater.mutateAsync(opts);
    setConfirm(null);
  };

  const Row = ({ label, onDelete }: { label: string; onDelete: () => void }) => (
    <div className="flex items-center justify-between py-2 border-b border-slate-700 last:border-0">
      <span className="text-slate-200 text-sm flex-1">{label}</span>
      <button onClick={onDelete} className="p-1 text-red-400 hover:text-red-300"><Trash2 size={16} /></button>
    </div>
  );

  const Section = ({ title, icon, empty, children }: { title: string; icon: string; empty: boolean; children: React.ReactNode }) => (
    <div className="bg-slate-800 rounded-xl p-4 mb-3">
      <h3 className="font-semibold text-white mb-2">{icon} {title}</h3>
      {empty ? <p className="text-slate-500 text-sm">Nothing logged</p> : children}
    </div>
  );

  return (
    <Layout title={format(date, 'EEEE, MMM d')}>
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setDate(subDays(date, 1))} className="p-2 rounded-lg hover:bg-slate-700"><ChevronLeft size={20} className="text-slate-400" /></button>
        <span className="text-slate-300 font-medium">{format(date, 'MMMM d, yyyy')}</span>
        <button onClick={() => setDate(addDays(date, 1))} className="p-2 rounded-lg hover:bg-slate-700"><ChevronRight size={20} className="text-slate-400" /></button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="bg-slate-800 rounded-xl h-20 animate-pulse" />)}</div>
      ) : data ? (
        <>
          <Section title="Workouts" icon="🏋️" empty={data.workouts.length === 0}>
            {data.workouts.map(w => (
              <Row key={w.id} label={`${w.type}${w.duration_min ? ` — ${w.duration_min}min` : ''}`} onDelete={() => setConfirm({ type: 'workout', id: w.id })} />
            ))}
          </Section>
          <Section title="Meals" icon="🍽️" empty={data.meals.length === 0}>
            {data.meals.map(m => (
              <Row key={m.id} label={`${m.meal_type ? m.meal_type + ' · ' : ''}${m.description}${m.calories ? ` — ${m.calories}kcal` : ''}`} onDelete={() => setConfirm({ type: 'meal', id: m.id })} />
            ))}
          </Section>
          <Section title="Shakes" icon="🥤" empty={data.shakes.length === 0}>
            {data.shakes.map(s => (
              <Row key={s.id} label={`${s.name}${s.protein_g ? ` — ${s.protein_g}g protein` : ''}`} onDelete={() => setConfirm({ type: 'shake', id: s.id })} />
            ))}
          </Section>
          <Section title="Vitamins" icon="💊" empty={data.vitamins.length === 0}>
            {data.vitamins.map(v => (
              <Row key={v.id} label={`${v.name}${v.dose_mg ? ` — ${v.dose_mg}mg` : ''} × ${v.quantity}`} onDelete={() => setConfirm({ type: 'vitamin', id: v.id })} />
            ))}
          </Section>
          <Section title="Water" icon="💧" empty={data.water.length === 0}>
            <div className="mb-2">
              <div className="flex justify-between text-sm text-slate-400 mb-1">
                <span>{data.water_total_ml}ml / {data.water_goal_ml}ml</span>
                <span>{Math.round((data.water_total_ml / data.water_goal_ml) * 100)}%</span>
              </div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${Math.min(100, (data.water_total_ml / data.water_goal_ml) * 100)}%` }} />
              </div>
            </div>
            {data.water.map(w => (
              <Row key={w.id} label={`${w.amount_ml}ml`} onDelete={() => setConfirm({ type: 'water', id: w.id })} />
            ))}
          </Section>
        </>
      ) : <EmptyState message="No data for this day" />}

      {confirm && (
        <ConfirmDialog
          message="Delete this entry?"
          onConfirm={handleDelete}
          onCancel={() => setConfirm(null)}
        />
      )}
    </Layout>
  );
}
