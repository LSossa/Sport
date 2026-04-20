import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useCreateWorkout } from '../../hooks/useWorkouts';
import { api } from '../../api/client';

interface SetInput {
  reps: string;
  weight_kg: string;
  duration_sec: string;
}

interface ExerciseInput {
  name: string;
  sets: SetInput[];
}

interface FormValues {
  type: string;
  duration_min: string;
  notes: string;
  exercises: ExerciseInput[];
}

interface Props {
  date: string;
  onDone: () => void;
}

export function WorkoutForm({ date, onDone }: Props) {
  const [mode, setMode] = useState<'simple' | 'detailed'>('simple');
  const { mutateAsync: createWorkout, isPending } = useCreateWorkout();
  const { register, control, handleSubmit, reset } = useForm<FormValues>({
    defaultValues: { type: '', duration_min: '', notes: '', exercises: [] },
  });
  const { fields: exercises, append, remove } = useFieldArray({ control, name: 'exercises' });
  const [expandedEx, setExpandedEx] = useState<number[]>([]);

  const onSubmit = async (values: FormValues) => {
    if (mode === 'simple') {
      await createWorkout({
        date, type: values.type, duration_min: values.duration_min ? Number(values.duration_min) : null,
        notes: values.notes || null, is_detailed: 0,
      });
    } else {
      const workout = await createWorkout({ date, type: values.type, duration_min: null, notes: values.notes || null, is_detailed: 1 });
      for (let i = 0; i < values.exercises.length; i++) {
        const ex = values.exercises[i];
        const exercise = await api.post<{ id: number }>(`/workouts/${workout.id}/exercises`, { name: ex.name, position: i });
        for (let j = 0; j < ex.sets.length; j++) {
          const s = ex.sets[j];
          await api.post(`/workouts/${workout.id}/exercises/${exercise.id}/sets`, {
            set_number: j + 1,
            reps: s.reps ? Number(s.reps) : null,
            weight_kg: s.weight_kg ? Number(s.weight_kg) : null,
            duration_sec: s.duration_sec ? Number(s.duration_sec) : null,
          });
        }
      }
    }
    reset();
    onDone();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="flex gap-2">
        {(['simple', 'detailed'] as const).map(m => (
          <button key={m} type="button" onClick={() => setMode(m)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${mode === m ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-300'}`}>
            {m === 'simple' ? 'Quick Log' : 'Detailed'}
          </button>
        ))}
      </div>

      <input {...register('type', { required: true })} placeholder="Activity (e.g. Running, Lifting)"
        className="w-full bg-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-green-500" />

      {mode === 'simple' && (
        <input {...register('duration_min')} placeholder="Duration (minutes)" type="number" min="1"
          className="w-full bg-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-green-500" />
      )}

      {mode === 'detailed' && (
        <div className="space-y-3">
          {exercises.map((ex, i) => (
            <div key={ex.id} className="bg-slate-700 rounded-lg overflow-hidden">
              <div className="flex items-center gap-2 p-3">
                <input {...register(`exercises.${i}.name`)} placeholder="Exercise name"
                  className="flex-1 bg-transparent text-white placeholder-slate-400 outline-none" />
                <button type="button" onClick={() => setExpandedEx(p => p.includes(i) ? p.filter(x => x !== i) : [...p, i])}>
                  {expandedEx.includes(i) ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                </button>
                <button type="button" onClick={() => remove(i)}><Trash2 size={16} className="text-red-400" /></button>
              </div>
              {expandedEx.includes(i) && (
                <ExerciseSetsInput control={control} exerciseIndex={i} />
              )}
            </div>
          ))}
          <button type="button" onClick={() => { append({ name: '', sets: [{ reps: '', weight_kg: '', duration_sec: '' }] }); setExpandedEx(p => [...p, exercises.length]); }}
            className="w-full py-2 rounded-lg bg-slate-700 text-slate-300 text-sm flex items-center justify-center gap-2 hover:bg-slate-600">
            <Plus size={16} /> Add Exercise
          </button>
        </div>
      )}

      <textarea {...register('notes')} placeholder="Notes (optional)" rows={2}
        className="w-full bg-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-green-500 resize-none" />

      <button type="submit" disabled={isPending}
        className="w-full py-3 rounded-lg bg-green-600 text-white font-semibold disabled:opacity-50 hover:bg-green-700 transition-colors">
        {isPending ? 'Saving…' : 'Log Workout'}
      </button>
    </form>
  );
}

function ExerciseSetsInput({ control, exerciseIndex }: { control: ReturnType<typeof useForm<FormValues>>['control']; exerciseIndex: number }) {
  const { fields, append, remove } = useFieldArray({ control, name: `exercises.${exerciseIndex}.sets` });
  const { register } = useForm<FormValues>();
  return (
    <div className="border-t border-slate-600 p-3 space-y-2">
      {fields.map((set, j) => (
        <div key={set.id} className="flex gap-2 items-center">
          <span className="text-slate-400 text-xs w-5">{j + 1}</span>
          <input {...control.register(`exercises.${exerciseIndex}.sets.${j}.reps`)} placeholder="Reps" type="number"
            className="flex-1 bg-slate-600 rounded px-2 py-1 text-white text-sm placeholder-slate-400 outline-none" />
          <input {...control.register(`exercises.${exerciseIndex}.sets.${j}.weight_kg`)} placeholder="kg" type="number" step="0.5"
            className="flex-1 bg-slate-600 rounded px-2 py-1 text-white text-sm placeholder-slate-400 outline-none" />
          <button type="button" onClick={() => remove(j)}><Trash2 size={14} className="text-red-400" /></button>
        </div>
      ))}
      <button type="button" onClick={() => append({ reps: '', weight_kg: '', duration_sec: '' })}
        className="text-xs text-green-400 flex items-center gap-1 hover:text-green-300">
        <Plus size={12} /> Add set
      </button>
    </div>
  );
}
