import { useForm } from 'react-hook-form';
import { useCreateMeal } from '../../hooks/useMeals';

interface FormValues {
  meal_type: string;
  description: string;
  calories: string;
  protein_g: string;
  carbs_g: string;
  fat_g: string;
  notes: string;
}

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

interface Props { date: string; onDone: () => void; }

export function MealForm({ date, onDone }: Props) {
  const { mutateAsync, isPending } = useCreateMeal();
  const { register, handleSubmit, reset } = useForm<FormValues>({ defaultValues: { meal_type: '', description: '', calories: '', protein_g: '', carbs_g: '', fat_g: '', notes: '' } });

  const onSubmit = async (v: FormValues) => {
    await mutateAsync({
      date, meal_type: v.meal_type || null, description: v.description,
      calories: v.calories ? Number(v.calories) : null,
      protein_g: v.protein_g ? Number(v.protein_g) : null,
      carbs_g: v.carbs_g ? Number(v.carbs_g) : null,
      fat_g: v.fat_g ? Number(v.fat_g) : null,
      notes: v.notes || null,
    });
    reset(); onDone();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        {MEAL_TYPES.map(t => (
          <label key={t} className="flex items-center gap-1 cursor-pointer">
            <input type="radio" value={t} {...register('meal_type')} className="accent-green-500" />
            <span className="text-sm text-slate-300">{t}</span>
          </label>
        ))}
      </div>
      <input {...register('description', { required: true })} placeholder="What did you eat?"
        className="w-full bg-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-green-500" />
      <div className="grid grid-cols-2 gap-2">
        <input {...register('calories')} placeholder="Calories" type="number" className="bg-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-green-500" />
        <input {...register('protein_g')} placeholder="Protein (g)" type="number" step="0.1" className="bg-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-green-500" />
        <input {...register('carbs_g')} placeholder="Carbs (g)" type="number" step="0.1" className="bg-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-green-500" />
        <input {...register('fat_g')} placeholder="Fat (g)" type="number" step="0.1" className="bg-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-green-500" />
      </div>
      <textarea {...register('notes')} placeholder="Notes" rows={2} className="w-full bg-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-green-500 resize-none" />
      <button type="submit" disabled={isPending} className="w-full py-3 rounded-lg bg-green-600 text-white font-semibold disabled:opacity-50 hover:bg-green-700 transition-colors">
        {isPending ? 'Saving…' : 'Log Meal'}
      </button>
    </form>
  );
}
