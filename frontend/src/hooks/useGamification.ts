import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import type { GamificationSummary } from '../api/types';
import { format } from 'date-fns';

export function useGamification(date?: Date) {
  const today = format(date ?? new Date(), 'yyyy-MM-dd');
  return useQuery({
    queryKey: ['gamification', today],
    queryFn: () => api.get<GamificationSummary>(`/gamification/summary?date=${today}`),
    staleTime: 30_000,
  });
}
