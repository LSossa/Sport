import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Bell, BellOff, Send } from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { useSettings, useSaveSettings } from '../hooks/useSettings';
import { usePushNotifications } from '../hooks/usePushNotifications';

const CATEGORIES = [
  { key: 'workouts', label: 'Workouts', icon: '🏋️' },
  { key: 'meals', label: 'Meals', icon: '🍽️' },
  { key: 'shakes', label: 'Shakes', icon: '🥤' },
  { key: 'vitamins', label: 'Vitamins', icon: '💊' },
  { key: 'water', label: 'Water', icon: '💧' },
];

interface FormValues {
  timezone: string;
  water_goal_ml: string;
  [key: string]: string | boolean;
}

export function SettingsPage() {
  const { data: settings } = useSettings();
  const { mutateAsync: save, isPending } = useSaveSettings();
  const { subscribed, loading: pushLoading, error: pushError, subscribe, unsubscribe, sendTest } = usePushNotifications();
  const { register, handleSubmit, reset } = useForm<FormValues>();

  useEffect(() => {
    if (settings) {
      const vals: Record<string, string> = {
        timezone: settings['timezone'] ?? 'America/New_York',
        water_goal_ml: settings['water_goal_ml'] ?? '2500',
      };
      for (const cat of CATEGORIES) {
        vals[`cutoff_${cat.key}`] = settings[`reminder_cutoff_${cat.key}`] ?? '21:00';
        vals[`enabled_${cat.key}`] = (settings[`reminder_enabled_${cat.key}`] ?? 'true') === 'true';
      }
      reset(vals);
    }
  }, [settings, reset]);

  const onSubmit = async (values: FormValues) => {
    const payload: Record<string, string> = {
      timezone: values.timezone,
      water_goal_ml: values.water_goal_ml,
    };
    for (const cat of CATEGORIES) {
      payload[`reminder_cutoff_${cat.key}`] = values[`cutoff_${cat.key}`];
      payload[`reminder_enabled_${cat.key}`] = (values[`enabled_${cat.key}`] === true || values[`enabled_${cat.key}`] === 'true') ? 'true' : 'false';
    }
    await save(payload);
  };

  return (
    <Layout title="Settings">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <section className="bg-slate-800 rounded-xl p-4">
          <h2 className="font-semibold text-white mb-3">Push Notifications</h2>
          {pushError && <p className="text-red-400 text-sm mb-2">{pushError}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={subscribed ? unsubscribe : subscribe} disabled={pushLoading}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 ${subscribed ? 'bg-red-700 text-white hover:bg-red-800' : 'bg-green-600 text-white hover:bg-green-700'}`}>
              {subscribed ? <><BellOff size={16} /> Disable</> : <><Bell size={16} /> Enable</>}
            </button>
            {subscribed && (
              <button type="button" onClick={sendTest}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 text-slate-200 text-sm hover:bg-slate-600 transition-colors">
                <Send size={16} /> Test
              </button>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-2">Notifications fire when you haven't logged a category by its cutoff time.</p>
        </section>

        <section className="bg-slate-800 rounded-xl p-4">
          <h2 className="font-semibold text-white mb-3">Reminder Cutoff Times</h2>
          <div className="space-y-3">
            {CATEGORIES.map(cat => (
              <div key={cat.key} className="flex items-center gap-3">
                <span className="text-lg w-7">{cat.icon}</span>
                <span className="text-slate-300 flex-1 text-sm">{cat.label}</span>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input type="checkbox"
                    {...register(`enabled_${cat.key}`)}
                    className="accent-green-500 w-4 h-4" />
                </label>
                <input type="time" {...register(`cutoff_${cat.key}`)}
                  className="bg-slate-700 rounded px-2 py-1 text-white text-sm outline-none focus:ring-2 focus:ring-green-500" />
              </div>
            ))}
          </div>
        </section>

        <section className="bg-slate-800 rounded-xl p-4">
          <h2 className="font-semibold text-white mb-3">General</h2>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Daily water goal (ml)</label>
              <input {...register('water_goal_ml')} type="number" min="500" step="100"
                className="w-full bg-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Timezone</label>
              <input {...register('timezone')} placeholder="e.g. America/New_York"
                className="w-full bg-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-green-500" />
            </div>
          </div>
        </section>

        <button type="submit" disabled={isPending}
          className="w-full py-3 rounded-lg bg-green-600 text-white font-semibold disabled:opacity-50 hover:bg-green-700 transition-colors">
          {isPending ? 'Saving…' : 'Save Settings'}
        </button>
      </form>
    </Layout>
  );
}
