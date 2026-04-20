import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import type { WeekData, DayData } from '../api/types';
import { startOfWeek, format } from 'date-fns';

export function useWeeklyDashboard(date: Date) {
  const start = format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  return useQuery({
    queryKey: ['dashboard', 'week', start],
    queryFn: () => api.get<WeekData>(`/dashboard/week?start=${start}`),
  });
}

export function useDayData(date: string) {
  return useQuery({
    queryKey: ['dashboard', 'day', date],
    queryFn: () => api.get<DayData>(`/dashboard/day?date=${date}`),
  });
}
