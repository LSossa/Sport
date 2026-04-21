import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type { WaterLog } from '../api/types';

export function useWater(date: string) {
  return useQuery({
    queryKey: ['water', date],
    queryFn: () => api.get<WaterLog[]>(`/water?date=${date}`),
  });
}

export function useCreateWater() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { date: string; amount_ml: number }) => api.post<WaterLog>('/water', data),
    onSuccess: (w) => { qc.invalidateQueries({ queryKey: ['water', w.date] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); qc.invalidateQueries({ queryKey: ['gamification'] }); },
  });
}

export function useDeleteWater() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: number; date: string }) => api.delete(`/water/${id}`),
    onSuccess: (_d, v) => { qc.invalidateQueries({ queryKey: ['water', v.date] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); },
  });
}
