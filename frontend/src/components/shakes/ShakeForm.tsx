import { useForm } from 'react-hook-form';
import { useCreateShake } from '../../hooks/useShakes';

interface FormValues { name: string; brand: string; serving_g: string; calories: string; protein_g: string; notes: string; }

const SHAKE_PRESETS = ['Protein Shake', 'Pre-Workout', 'Post-Workout', 'Mass Gainer'];

interface Props { date: string; onDone: () => void; }

export function ShakeForm({ date, onDone }: Props) {
  const { mutateAsync, isPending } = useCreateShake();
  const { register, handleSubmit, reset, setValue } = useForm<FormValues>({ defaultValues: { name: '', brand: '', serving_g: '', calories: '', protein_g: '', notes: '' } });

  const onSubmit = async (v: FormValues) => {
    await mutateAsync({
      date, name: v.name, brand: v.brand || null,
      serving_g: v.serving_g ? Number(v.serving_g) : null,
      calories: v.calories ? Number(v.calories) : null,
      protein_g: v.protein_g ? Number(v.protein_g) : null,
      notes: v.notes || null,
    });
    reset(); onDone();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        {SHAKE_PRESETS.map(p => (
          <button key={p} type="button" onClick={() => setValue('name', p)}
            className="px-3 py-1 rounded-full bg-slate-700 text-slate-300 text-sm hover:bg-slate-600">
            {p}
          </button>
        ))}
      </div>
      <input {...register('name', { required: true })} placeholder="Shake / supplement name"
        className="w-full bg-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-green-500" />
      <input {...register('brand')} placeholder="Brand (optional)"
        className="w-full bg-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-green-500" />
      <div className="grid grid-cols-3 gap-2">
        <input {...register('serving_g')} placeholder="Serving (g)" type="number" step="0.1" className="bg-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-green-500" />
        <input {...register('calories')} placeholder="Calories" type="number" className="bg-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-green-500" />
        <input {...register('protein_g')} placeholder="Protein (g)" type="number" step="0.1" className="bg-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-green-500" />
      </div>
      <textarea {...register('notes')} placeholder="Notes" rows={2} className="w-full bg-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-green-500 resize-none" />
      <button type="submit" disabled={isPending} className="w-full py-3 rounded-lg bg-green-600 text-white font-semibold disabled:opacity-50 hover:bg-green-700 transition-colors">
        {isPending ? 'Saving…' : 'Log Shake'}
      </button>
    </form>
  );
}
