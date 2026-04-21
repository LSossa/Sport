import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ScanLine, X } from 'lucide-react';
import { useCreateMeal } from '../../hooks/useMeals';
import { BarcodeScanner } from './BarcodeScanner';
import { lookupBarcode, FoodProduct } from './foodLookup';

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
  const { register, handleSubmit, reset, setValue } = useForm<FormValues>({
    defaultValues: { meal_type: '', description: '', calories: '', protein_g: '', carbs_g: '', fat_g: '', notes: '' },
  });

  const [scanning, setScanning] = useState(false);
  const [looking, setLooking] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [product, setProduct] = useState<FoodProduct | null>(null);
  const [servingGrams, setServingGrams] = useState('');

  const onSubmit = async (v: FormValues) => {
    await mutateAsync({
      date, meal_type: v.meal_type || null, description: v.description,
      calories: v.calories ? Number(v.calories) : null,
      protein_g: v.protein_g ? Number(v.protein_g) : null,
      carbs_g: v.carbs_g ? Number(v.carbs_g) : null,
      fat_g: v.fat_g ? Number(v.fat_g) : null,
      notes: v.notes || null,
    });
    reset();
    setProduct(null);
    setServingGrams('');
    onDone();
  };

  const handleBarcode = async (barcode: string) => {
    setScanning(false);
    setLooking(true);
    setLookupError(null);
    try {
      const result = await lookupBarcode(barcode);
      if (!result) {
        setLookupError(`Product not found for barcode ${barcode}. Fill in manually.`);
      } else {
        setProduct(result);
        setServingGrams(String(result.servingGrams));
      }
    } catch {
      setLookupError('Could not reach food database. Check your connection.');
    } finally {
      setLooking(false);
    }
  };

  const applyProduct = () => {
    if (!product) return;
    const grams = parseFloat(servingGrams) || 100;
    const scale = grams / 100;
    setValue('description', product.name);
    setValue('calories',  String(Math.round(product.per100g.calories  * scale)));
    setValue('protein_g', String(Math.round(product.per100g.protein_g * scale * 10) / 10));
    setValue('carbs_g',   String(Math.round(product.per100g.carbs_g   * scale * 10) / 10));
    setValue('fat_g',     String(Math.round(product.per100g.fat_g     * scale * 10) / 10));
    setProduct(null);
    setServingGrams('');
  };

  const grams = parseFloat(servingGrams) || 100;
  const scale = grams / 100;

  return (
    <>
      {scanning && (
        <BarcodeScanner
          onDetected={handleBarcode}
          onCancel={() => setScanning(false)}
        />
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <div className="flex gap-2 flex-wrap">
          {MEAL_TYPES.map(t => (
            <label key={t} className="flex items-center gap-1 cursor-pointer">
              <input type="radio" value={t} {...register('meal_type')} className="accent-green-500" />
              <span className="text-sm text-slate-300">{t}</span>
            </label>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setScanning(true)}
          disabled={looking}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-slate-700 text-slate-200 font-medium hover:bg-slate-600 disabled:opacity-50 transition-colors"
        >
          <ScanLine size={18} />
          {looking ? 'Looking up product…' : 'Scan Barcode'}
        </button>

        {lookupError && (
          <p className="text-yellow-400 text-sm text-center">{lookupError}</p>
        )}

        {product && (
          <div className="bg-slate-700 rounded-xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-white font-medium text-sm">{product.name || 'Unknown product'}</p>
                <p className="text-slate-400 text-xs mt-0.5">per 100g: {product.per100g.calories} kcal · {product.per100g.protein_g}g protein · {product.per100g.carbs_g}g carbs · {product.per100g.fat_g}g fat</p>
              </div>
              <button type="button" onClick={() => setProduct(null)} className="text-slate-400 hover:text-white shrink-0"><X size={16} /></button>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-300 shrink-0">How many grams?</label>
              <input
                value={servingGrams}
                onChange={e => setServingGrams(e.target.value)}
                type="number"
                min="1"
                className="w-24 bg-slate-600 rounded-lg px-3 py-1.5 text-white outline-none text-sm focus:ring-2 focus:ring-green-500"
              />
              <span className="text-slate-400 text-sm">g</span>
            </div>

            <div className="grid grid-cols-4 gap-1 text-center text-xs">
              {[
                { label: 'Calories', value: Math.round(product.per100g.calories  * scale) },
                { label: 'Protein',  value: `${Math.round(product.per100g.protein_g * scale * 10) / 10}g` },
                { label: 'Carbs',    value: `${Math.round(product.per100g.carbs_g   * scale * 10) / 10}g` },
                { label: 'Fat',      value: `${Math.round(product.per100g.fat_g     * scale * 10) / 10}g` },
              ].map(({ label, value }) => (
                <div key={label} className="bg-slate-600 rounded-lg py-2">
                  <div className="text-white font-semibold">{value}</div>
                  <div className="text-slate-400">{label}</div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={applyProduct}
              className="w-full py-2 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 transition-colors text-sm"
            >
              Fill in form
            </button>
          </div>
        )}

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
    </>
  );
}
