import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Bell, BellOff, Send, RefreshCw, Unlink, ExternalLink } from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { useSettings, useSaveSettings } from '../hooks/useSettings';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { useStravaStatus, useStravaSync, useStravaCallback, useStravaDisconnect, useStravaAuthUrl } from '../hooks/useStrava';
import { useZeppStatus, useZeppSaveCredentials, useZeppSync, useZeppDisconnect } from '../hooks/useZepp';

const CATEGORIES = [
  { key: 'workouts', label: 'Workouts', icon: '🏋️' },
  { key: 'shakes', label: 'Shakes', icon: '🥤' },
  { key: 'vitamins', label: 'Vitamins', icon: '💊' },
  { key: 'water', label: 'Water', icon: '💧' },
];

interface FormValues {
  timezone: string;
  water_goal_ml: string;
  strava_client_id: string;
  strava_client_secret: string;
  strava_redirect_uri: string;
  [key: string]: string | boolean;
}

export function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: settings } = useSettings();
  const { mutateAsync: save, isPending } = useSaveSettings();
  const { subscribed, loading: pushLoading, error: pushError, subscribe, unsubscribe, sendTest } = usePushNotifications();
  const { register, handleSubmit, reset } = useForm<FormValues>();

  const { data: stravaStatus, isLoading: stravaLoading } = useStravaStatus();
  const stravaSync = useStravaSync();
  const stravaCallback = useStravaCallback();
  const stravaDisconnect = useStravaDisconnect();
  const stravaAuthUrl = useStravaAuthUrl();

  const { data: zeppStatus } = useZeppStatus();
  const zeppSaveCreds = useZeppSaveCredentials();
  const zeppSync = useZeppSync();
  const zeppDisconnect = useZeppDisconnect();
  const [zeppEmail, setZeppEmail] = useState('');
  const [zeppPassword, setZeppPassword] = useState('');
  const [zeppResult, setZeppResult] = useState<string | null>(null);
  const [zeppError, setZeppError] = useState<string | null>(null);

  const handleZeppConnect = async () => {
    setZeppError(null);
    setZeppResult(null);
    if (!zeppEmail || !zeppPassword) { setZeppError('Enter email and password'); return; }
    zeppSaveCreds.mutate({ email: zeppEmail, password: zeppPassword }, {
      onSuccess: () => {
        setZeppPassword('');
        zeppSync.mutate(undefined, {
          onSuccess: ({ imported, updated }) => setZeppResult(`Connected! ${imported} entries imported, ${updated} updated`),
          onError: (err) => setZeppError((err as Error).message),
        });
      },
      onError: (err) => setZeppError((err as Error).message),
    });
  };

  const handleZeppSync = () => {
    setZeppError(null);
    setZeppResult(null);
    zeppSync.mutate(undefined, {
      onSuccess: ({ imported, updated }) => setZeppResult(`${imported} new, ${updated} updated`),
      onError: (err) => setZeppError((err as Error).message),
    });
  };

  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [stravaError, setStravaError] = useState<string | null>(null);

  // Handle OAuth callback: detect ?code= in URL after Strava redirect
  useEffect(() => {
    const code = searchParams.get('code');
    const scope = searchParams.get('scope');
    if (!code || !scope) return;

    // Clean the URL immediately so refresh doesn't re-trigger
    setSearchParams({}, { replace: true });

    stravaCallback.mutate(code, {
      onError: (err) => setStravaError((err as Error).message),
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (settings) {
      const vals: Record<string, string> = {
        timezone: settings['timezone'] ?? 'America/New_York',
        water_goal_ml: settings['water_goal_ml'] ?? '2500',
        strava_client_id: settings['strava_client_id'] ?? '',
        strava_client_secret: settings['strava_client_secret'] ?? '',
        strava_redirect_uri: settings['strava_redirect_uri'] ?? window.location.origin,
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
      strava_client_id: values.strava_client_id,
      strava_client_secret: values.strava_client_secret,
      strava_redirect_uri: values.strava_redirect_uri,
    };
    for (const cat of CATEGORIES) {
      payload[`reminder_cutoff_${cat.key}`] = values[`cutoff_${cat.key}`];
      payload[`reminder_enabled_${cat.key}`] = (values[`enabled_${cat.key}`] === true || values[`enabled_${cat.key}`] === 'true') ? 'true' : 'false';
    }
    await save(payload);
  };

  const handleConnect = async (clientId: string) => {
    if (!clientId) { setStravaError('Enter your Strava Client ID first and save settings.'); return; }
    setStravaError(null);
    const { url } = await stravaAuthUrl.mutateAsync(clientId);
    window.location.href = url;
  };

  const handleSync = async () => {
    setSyncResult(null);
    setStravaError(null);
    stravaSync.mutate(undefined, {
      onSuccess: ({ imported, skipped }) => setSyncResult(`${imported} imported, ${skipped} already synced`),
      onError: (err) => setStravaError((err as Error).message),
    });
  };

  const handleDisconnect = () => {
    setStravaError(null);
    setSyncResult(null);
    stravaDisconnect.mutate();
  };

  const lastSyncLabel = stravaStatus?.lastSync
    ? new Date(stravaStatus.lastSync).toLocaleString()
    : 'Never';

  return (
    <Layout title="Settings">
      {/* Zepp / Mi Fit weight sync */}
      <section className="bg-slate-800 rounded-xl p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">⚖️</span>
          <h2 className="font-semibold text-white">Zepp Weight Sync</h2>
          {zeppStatus?.connected && (
            <span className="ml-auto text-xs bg-green-700 text-green-200 rounded-full px-2 py-0.5">Connected</span>
          )}
        </div>

        {zeppError && <p className="text-red-400 text-sm mb-3">{zeppError}</p>}
        {zeppResult && <p className="text-green-400 text-sm mb-3">{zeppResult}</p>}

        {zeppStatus?.connected ? (
          <div className="space-y-3">
            <p className="text-sm text-slate-300">Account: <span className="text-white font-medium">{zeppStatus.email}</span></p>
            {zeppStatus.lastSync && (
              <p className="text-xs text-slate-500">Last sync: {new Date(zeppStatus.lastSync).toLocaleString()}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleZeppSync}
                disabled={zeppSync.isPending}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                <RefreshCw size={15} className={zeppSync.isPending ? 'animate-spin' : ''} />
                {zeppSync.isPending ? 'Syncing…' : 'Sync Now'}
              </button>
              <button
                onClick={() => { setZeppError(null); setZeppResult(null); zeppDisconnect.mutate(); }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 text-slate-300 text-sm hover:bg-slate-600 transition-colors"
              >
                <Unlink size={15} /> Disconnect
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-slate-400">Enter your Zepp Life / Mi Fit account credentials to auto-import weight from your Mi scale.</p>
            <input
              type="email"
              placeholder="Zepp Life email"
              value={zeppEmail}
              onChange={e => setZeppEmail(e.target.value)}
              className="w-full bg-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-green-500"
            />
            <input
              type="password"
              placeholder="Password"
              value={zeppPassword}
              onChange={e => setZeppPassword(e.target.value)}
              className="w-full bg-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-green-500"
            />
            <button
              onClick={handleZeppConnect}
              disabled={zeppSaveCreds.isPending || zeppSync.isPending}
              className="w-full py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {zeppSync.isPending ? 'Connecting & syncing…' : 'Connect & Sync'}
            </button>
          </div>
        )}
      </section>

      {/* Strava section — outside the main form so its inputs don't interfere */}
      <section className="bg-slate-800 rounded-xl p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">🚴</span>
          <h2 className="font-semibold text-white">Strava</h2>
          {!stravaLoading && stravaStatus?.connected && (
            <span className="ml-auto text-xs bg-green-700 text-green-200 rounded-full px-2 py-0.5">Connected</span>
          )}
        </div>

        {stravaError && <p className="text-red-400 text-sm mb-3">{stravaError}</p>}
        {syncResult && <p className="text-green-400 text-sm mb-3">{syncResult}</p>}
        {stravaCallback.isPending && <p className="text-slate-400 text-sm mb-3">Connecting to Strava…</p>}

        {stravaStatus?.connected ? (
          <div className="space-y-3">
            {stravaStatus.athleteName && (
              <p className="text-sm text-slate-300">Athlete: <span className="text-white font-medium">{stravaStatus.athleteName}</span></p>
            )}
            <p className="text-xs text-slate-500">Last sync: {lastSyncLabel}</p>
            <div className="flex gap-2">
              <button
                onClick={handleSync}
                disabled={stravaSync.isPending}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-orange-600 text-white text-sm font-medium hover:bg-orange-700 disabled:opacity-50 transition-colors"
              >
                <RefreshCw size={15} className={stravaSync.isPending ? 'animate-spin' : ''} />
                {stravaSync.isPending ? 'Syncing…' : 'Sync Now'}
              </button>
              <button
                onClick={handleDisconnect}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 text-slate-300 text-sm hover:bg-slate-600 transition-colors"
              >
                <Unlink size={15} /> Disconnect
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-slate-400 leading-relaxed">
              Connect Strava to auto-import runs and CrossFit sessions.{' '}
              <a href="https://www.strava.com/settings/api" target="_blank" rel="noopener noreferrer" className="text-orange-400 underline inline-flex items-center gap-0.5">
                Create a Strava app <ExternalLink size={11} />
              </a>{' '}
              and set the redirect URI to this page's URL.
            </p>
            <p className="text-xs text-slate-500">Save your Client ID &amp; Secret below, then click Connect.</p>
          </div>
        )}
      </section>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Strava credentials — only show when not connected */}
        {!stravaStatus?.connected && (
          <section className="bg-slate-800 rounded-xl p-4">
            <h2 className="font-semibold text-white mb-3">Strava Credentials</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Client ID</label>
                <input {...register('strava_client_id')} placeholder="12345"
                  className="w-full bg-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-orange-500" />
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Client Secret</label>
                <input {...register('strava_client_secret')} type="password" placeholder="••••••••"
                  className="w-full bg-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-orange-500" />
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Redirect URI (this app's URL)</label>
                <input {...register('strava_redirect_uri')} placeholder="http://192.168.x.x:8080"
                  className="w-full bg-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-orange-500" />
              </div>
            </div>
          </section>
        )}

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
                <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-400">
                  <input type="checkbox"
                    {...register(`enabled_${cat.key}`)}
                    className="accent-green-500 w-4 h-4" />
                  On
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
              <select {...register('timezone')}
                className="w-full bg-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:ring-2 focus:ring-green-500">
                <option value="America/New_York">Eastern (ET)</option>
                <option value="America/Chicago">Central (CT)</option>
                <option value="America/Denver">Mountain (MT)</option>
                <option value="America/Los_Angeles">Pacific (PT)</option>
                <option value="America/Phoenix">Arizona (no DST)</option>
                <option value="America/Anchorage">Alaska (AKT)</option>
                <option value="Pacific/Honolulu">Hawaii (HST)</option>
                <option value="Europe/London">London (GMT/BST)</option>
                <option value="Europe/Paris">Paris / Berlin (CET)</option>
                <option value="Europe/Lisbon">Lisbon (WET)</option>
                <option value="UTC">UTC</option>
              </select>
            </div>
          </div>
        </section>

        <button type="submit" disabled={isPending}
          className="w-full py-3 rounded-lg bg-green-600 text-white font-semibold disabled:opacity-50 hover:bg-green-700 transition-colors">
          {isPending ? 'Saving…' : 'Save Settings'}
        </button>

        {/* Connect button lives inside form so it can read clientId from form state */}
        {!stravaStatus?.connected && (
          <button
            type="button"
            onClick={handleSubmit(async (values) => {
              await onSubmit(values);
              handleConnect(values.strava_client_id);
            })}
            disabled={stravaAuthUrl.isPending || stravaCallback.isPending}
            className="w-full py-3 rounded-lg bg-orange-600 text-white font-semibold disabled:opacity-50 hover:bg-orange-700 transition-colors"
          >
            Connect Strava
          </button>
        )}
      </form>
    </Layout>
  );
}
