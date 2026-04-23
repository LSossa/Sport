import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type { ZeppStatus } from '../api/types';

export function useZeppStatus() {
  return useQuery({
    queryKey: ['zepp-status'],
    queryFn: () => api.get<ZeppStatus>('/zepp/status'),
    refetchOnWindowFocus: false,
  });
}

export function useZeppSaveCredentials() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { email: string; password: string }) => api.post('/zepp/credentials', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['zepp-status'] }),
  });
}

export function useZeppSync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ imported: number; updated: number }>('/zepp/sync', {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['zepp-status'] });
      qc.invalidateQueries({ queryKey: ['weight'] });
    },
  });
}

export function useZeppDisconnect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete('/zepp/disconnect'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['zepp-status'] });
      qc.invalidateQueries({ queryKey: ['weight'] });
    },
  });
}
