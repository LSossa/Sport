import { useState } from 'react';
import { useCreateWater } from '../../hooks/useWater';

const PRESETS = [250, 500, 750, 1000];

interface Props { date: string; onDone: () => void; }

export function WaterForm({ date, onDone }: Props) {
  const { mutateAsync, isPending } = useCreateWater();
  const [custom, setCustom] = useState('');

  const log = async (ml: number) => {
    await mutateAsync({ date, amount_ml: ml });
    setCustom('');
    onDone();
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {PRESETS.map(ml => (
          <button key={ml} onClick={() => log(ml)} disabled={isPending}
            className="py-4 rounded-xl bg-blue-600 text-white font-semibold text-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {ml >= 1000 ? `${ml / 1000}L` : `${ml}ml`}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={custom} onChange={e => setCustom(e.target.value)} placeholder="Custom (ml)" type="number" min="1"
          className="flex-1 bg-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500" />
        <button onClick={() => custom && log(Number(custom))} disabled={!custom || isPending}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium disabled:opacity-50 hover:bg-blue-700 transition-colors">
          Log
        </button>
      </div>
    </div>
  );
}
