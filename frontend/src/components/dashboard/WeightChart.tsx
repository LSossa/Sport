import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { format, parseISO } from 'date-fns';
import { useWeightHistory } from '../../hooks/useWeight';

const RANGES = [
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
  { label: '6m', days: 180 },
];

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ value: number; payload: { body_fat_pct: number | null } }> }) {
  if (!active || !payload?.length) return null;
  const { value, payload: { body_fat_pct } } = payload[0];
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm">
      <p className="text-white font-semibold">{value.toFixed(1)} kg</p>
      {body_fat_pct != null && <p className="text-slate-400">Fat: {body_fat_pct.toFixed(1)}%</p>}
    </div>
  );
}

export function WeightChart() {
  const [days, setDays] = useState(90);
  const { data = [], isLoading } = useWeightHistory(days);

  if (isLoading) return <div className="bg-slate-800 rounded-xl h-48 animate-pulse mb-3" />;
  if (data.length === 0) return null;

  const weights = data.map(d => d.weight_kg);
  const minW = Math.floor(Math.min(...weights)) - 1;
  const maxW = Math.ceil(Math.max(...weights)) + 1;
  const latest = data[data.length - 1];
  const first = data[0];
  const delta = latest.weight_kg - first.weight_kg;
  const deltaLabel = `${delta >= 0 ? '+' : ''}${delta.toFixed(1)} kg`;
  const deltaColor = delta <= 0 ? 'text-green-400' : 'text-red-400';

  const chartData = data.map(d => ({
    date: d.date,
    weight: d.weight_kg,
    body_fat_pct: d.body_fat_pct,
    label: format(parseISO(d.date), 'MMM d'),
  }));

  // Show fewer X-axis ticks on small screens
  const tickCount = days <= 30 ? 6 : days <= 90 ? 6 : 8;
  const step = Math.max(1, Math.floor(chartData.length / tickCount));
  const xTicks = chartData.filter((_, i) => i % step === 0 || i === chartData.length - 1).map(d => d.date);

  return (
    <div className="bg-slate-800 rounded-xl p-4 mb-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">⚖️</span>
          <div>
            <span className="font-semibold text-white">Weight</span>
            <span className="ml-2 text-sm text-white">{latest.weight_kg.toFixed(1)} kg</span>
            <span className={`ml-2 text-xs ${deltaColor}`}>{deltaLabel}</span>
          </div>
        </div>
        <div className="flex gap-1">
          {RANGES.map(r => (
            <button
              key={r.days}
              onClick={() => setDays(r.days)}
              className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${days === r.days ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <XAxis
            dataKey="date"
            ticks={xTicks}
            tickFormatter={d => format(parseISO(d), 'MMM d')}
            tick={{ fill: '#64748b', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[minW, maxW]}
            tick={{ fill: '#64748b', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={v => `${v}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={latest.weight_kg} stroke="#334155" strokeDasharray="3 3" />
          <Line
            type="monotone"
            dataKey="weight"
            stroke="#22c55e"
            strokeWidth={2}
            dot={data.length <= 30 ? { fill: '#22c55e', r: 3, strokeWidth: 0 } : false}
            activeDot={{ r: 5, fill: '#22c55e', strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
