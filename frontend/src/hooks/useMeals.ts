import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type { Meal } from '../api/types';

export function useMeals(date: string) {
  return useQuery({
    queryKey: ['meals', date],
    queryFn: () => api.get<Meal[]>(`/meals?date=${date}`),
  });
}

export function useCreateMeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Meal, 'id' | 'logged_at'>) => api.post<Meal>('/meals', data),
    onSuccess: (m) => { qc.invalidateQueries({ queryKey: ['meals', m.date] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); },
  });
}

export function useDeleteMeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: number; date: string }) => api.delete(`/meals/${id}`),
    onSuccess: (_d, v) => { qc.invalidateQueries({ queryKey: ['meals', v.date] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); },
  });
}
