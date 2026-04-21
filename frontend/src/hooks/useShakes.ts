import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type { Shake } from '../api/types';

export function useShakes(date: string) {
  return useQuery({
    queryKey: ['shakes', date],
    queryFn: () => api.get<Shake[]>(`/shakes?date=${date}`),
  });
}

export function useCreateShake() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Shake, 'id' | 'logged_at'>) => api.post<Shake>('/shakes', data),
    onSuccess: (s) => { qc.invalidateQueries({ queryKey: ['shakes', s.date] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); qc.invalidateQueries({ queryKey: ['gamification'] }); },
  });
}

export function useDeleteShake() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: number; date: string }) => api.delete(`/shakes/${id}`),
    onSuccess: (_d, v) => { qc.invalidateQueries({ queryKey: ['shakes', v.date] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); },
  });
}
