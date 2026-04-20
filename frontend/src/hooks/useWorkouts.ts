import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type { Workout } from '../api/types';

export function useWorkouts(date: string) {
  return useQuery({
    queryKey: ['workouts', date],
    queryFn: () => api.get<Workout[]>(`/workouts?date=${date}`),
  });
}

export function useWorkout(id: number) {
  return useQuery({
    queryKey: ['workouts', 'detail', id],
    queryFn: () => api.get<Workout>(`/workouts/${id}`),
  });
}

export function useCreateWorkout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Workout, 'id' | 'logged_at'>) => api.post<Workout>('/workouts', data),
    onSuccess: (w) => { qc.invalidateQueries({ queryKey: ['workouts', w.date] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); },
  });
}

export function useDeleteWorkout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: number; date: string }) => api.delete(`/workouts/${id}`),
    onSuccess: (_d, v) => { qc.invalidateQueries({ queryKey: ['workouts', v.date] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); },
  });
}
