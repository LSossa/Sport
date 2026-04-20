import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useCreateWorkout } from '../../hooks/useWorkouts';

type ActivityType = 'Running' | 'Crossfit';

interface FormValues {
  distance_km: string;
  duration_min: string;
  notes: string;
}

interface Props {
  date: string;
  onDone: () => void;
}

export function WorkoutForm({ date, onDone }: Props) {
  const [activity, setActivity] = useState<ActivityType | null>(null);
  const { mutateAsync, isPending } = useCreateWorkout();
  const { register, handleSubmit, reset } = useForm<FormValues>({
    defaultValues: { distance_km: '', duration_min: '', notes: '' },
  });

  const onSubmit = async (values: FormValues) => {
    if (!activity) return;
    await mutateAsync({
      date,
      type: activity,
      distance_km: values.distance_km ? Number(values.distance_km) : null,
      duration_min: values.duration_min ? Number(values.duration_min) : null,
      notes: values.notes || null,
      is_detailed: 0,
    });
    reset();
    setActivity(null);
    onDone();
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {(['Running', 'Crossfit'] as ActivityType[]).map(a => (
          <button
            key={a}
            type="button"
            onClick={() => setActivity(a)}
            className={`py-5 rounded-xl text-lg font-semibold transition-colors ${
              activity === a
                ? 'bg-green-600 text-white ring-2 ring-green-400'
                : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
            }`}
          >
            {a === 'Running' ? '🏃' : '🏋️'}<br />
            <span className="text-base">{a}</span>
          </button>
        ))}
      </div>

      {activity && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          {activity === 'Running' && (
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Distance (km)</label>
              <input
                {...register('distance_km', { required: true })}
                type="number"
                step="0.1"
                min="0"
                placeholder="e.g. 5.5"
                autoFocus
                className="w-full bg-slate-700 rounded-lg px-3 py-3 text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-green-500 text-lg"
              />
            </div>
          )}

          {activity === 'Crossfit' && (
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Duration (minutes)</label>
              <input
                {...register('duration_min', { required: true })}
                type="number"
                min="1"
                placeholder="e.g. 45"
                autoFocus
                className="w-full bg-slate-700 rounded-lg px-3 py-3 text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-green-500 text-lg"
              />
            </div>
          )}

          <textarea
            {...register('notes')}
            placeholder="Notes (optional)"
            rows={2}
            className="w-full bg-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-green-500 resize-none"
          />

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-3 rounded-lg bg-green-600 text-white font-semibold disabled:opacity-50 hover:bg-green-700 transition-colors"
          >
            {isPending ? 'Saving…' : `Log ${activity}`}
          </button>
        </form>
      )}
    </div>
  );
}
