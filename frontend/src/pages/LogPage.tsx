import { useState } from 'react';
import { format } from 'date-fns';
import { Layout } from '../components/layout/Layout';
import { WorkoutForm } from '../components/workouts/WorkoutForm';
import { MealForm } from '../components/meals/MealForm';
import { ShakeForm } from '../components/shakes/ShakeForm';
import { VitaminForm } from '../components/vitamins/VitaminForm';
import { WaterForm } from '../components/water/WaterForm';

const TABS = [
  { id: 'workout', label: 'Workout', icon: '🏋️' },
  { id: 'meal', label: 'Meal', icon: '🍽️' },
  { id: 'shake', label: 'Shake', icon: '🥤' },
  { id: 'vitamin', label: 'Vitamin', icon: '💊' },
  { id: 'water', label: 'Water', icon: '💧' },
] as const;

type TabId = typeof TABS[number]['id'];

export function LogPage() {
  const [active, setActive] = useState<TabId>('workout');
  const [saved, setSaved] = useState(false);
  const today = format(new Date(), 'yyyy-MM-dd');

  const onDone = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  return (
    <Layout title="Log Entry">
      {saved && (
        <div className="mb-4 py-2 px-4 bg-green-700 text-white rounded-lg text-center text-sm font-medium animate-pulse">
          Saved!
        </div>
      )}

      <div className="flex gap-1 mb-6 bg-slate-800 rounded-xl p-1">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActive(tab.id)}
            className={`flex-1 flex flex-col items-center py-2 rounded-lg text-xs font-medium transition-colors ${active === tab.id ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
            <span className="text-lg">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {active === 'workout' && <WorkoutForm date={today} onDone={onDone} />}
      {active === 'meal' && <MealForm date={today} onDone={onDone} />}
      {active === 'shake' && <ShakeForm date={today} onDone={onDone} />}
      {active === 'vitamin' && <VitaminForm date={today} onDone={onDone} />}
      {active === 'water' && <WaterForm date={today} onDone={onDone} />}
    </Layout>
  );
}
