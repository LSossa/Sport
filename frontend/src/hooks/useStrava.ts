import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type { StravaStatus } from '../api/types';

export function useStravaStatus() {
  return useQuery({
    queryKey: ['strava-status'],
    queryFn: () => api.get<StravaStatus>('/strava/status'),
    refetchOnWindowFocus: false,
  });
}

export function useStravaSync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ imported: number; skipped: number }>('/strava/sync', {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['strava-status'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['gamification'] });
    },
  });
}

export function useStravaCallback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => api.post<{ athleteName: string }>('/strava/callback', { code }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['strava-status'] }),
  });
}

export function useStravaDisconnect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete('/strava/disconnect'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['strava-status'] }),
  });
}

export function useStravaAuthUrl() {
  return useMutation({
    mutationFn: (clientId: string) => api.get<{ url: string }>(`/strava/auth-url?clientId=${encodeURIComponent(clientId)}`),
  });
}
