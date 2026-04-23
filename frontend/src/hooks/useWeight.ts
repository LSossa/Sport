import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import type { WeightLog } from '../api/types';

export function useWeightHistory(days = 90) {
  return useQuery({
    queryKey: ['weight', days],
    queryFn: () => api.get<WeightLog[]>(`/weight?days=${days}`),
  });
}
