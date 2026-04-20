import { useForm } from 'react-hook-form';
import { useCreateVitamin } from '../../hooks/useVitamins';

interface FormValues { name: string; dose_mg: string; quantity: string; notes: string; }

const VITAMIN_PRESETS = ['Vitamin D3', 'Vitamin C', 'Omega-3', 'Magnesium', 'Zinc', 'B12', 'Multivitamin'];

interface Props { date: string; onDone: () => void; }

export function VitaminForm({ date, onDone }: Props) {
  const { mutateAsync, isPending } = useCreateVitamin();
  const { register, handleSubmit, reset, setValue } = useForm<FormValues>({ defaultValues: { name: '', dose_mg: '', quantity: '1', notes: '' } });

  const onSubmit = async (v: FormValues) => {
    await mutateAsync({
      date, name: v.name,
      dose_mg: v.dose_mg ? Number(v.dose_mg) : null,
      quantity: v.quantity ? Number(v.quantity) : 1,
      notes: v.notes || null,
    });
    reset(); onDone();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        {VITAMIN_PRESETS.map(p => (
          <button key={p} type="button" onClick={() => setValue('name', p)}
            className="px-3 py-1 rounded-full bg-slate-700 text-slate-300 text-sm hover:bg-slate-600">
            {p}
          </button>
        ))}
      </div>
      <input {...register('name', { required: true })} placeholder="Vitamin / supplement name"
        className="w-full bg-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-green-500" />
      <div className="grid grid-cols-2 gap-2">
        <input {...register('dose_mg')} placeholder="Dose (mg)" type="number" step="0.1" className="bg-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-green-500" />
        <input {...register('quantity')} placeholder="Quantity" type="number" min="1" className="bg-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-green-500" />
      </div>
      <textarea {...register('notes')} placeholder="Notes" rows={2} className="w-full bg-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-green-500 resize-none" />
      <button type="submit" disabled={isPending} className="w-full py-3 rounded-lg bg-green-600 text-white font-semibold disabled:opacity-50 hover:bg-green-700 transition-colors">
        {isPending ? 'Saving…' : 'Log Vitamin'}
      </button>
    </form>
  );
}
