import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type { Vitamin } from '../api/types';

export function useVitamins(date: string) {
  return useQuery({
    queryKey: ['vitamins', date],
    queryFn: () => api.get<Vitamin[]>(`/vitamins?date=${date}`),
  });
}

export function useCreateVitamin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Vitamin, 'id' | 'logged_at'>) => api.post<Vitamin>('/vitamins', data),
    onSuccess: (v) => { qc.invalidateQueries({ queryKey: ['vitamins', v.date] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); qc.invalidateQueries({ queryKey: ['gamification'] }); },
  });
}

export function useDeleteVitamin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: number; date: string }) => api.delete(`/vitamins/${id}`),
    onSuccess: (_d, v) => { qc.invalidateQueries({ queryKey: ['vitamins', v.date] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); },
  });
}
