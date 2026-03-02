import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/auth/axios-client';
import type { UserDto } from './types';

export function useUsers() {
  return useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => apiClient.get<UserDto[]>('manage/users').then(r => r.data),
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ partitionKey, rowKey, data }: {
      partitionKey: string; rowKey: string; data: { isActive: boolean; isApproved: boolean };
    }) => apiClient.put<{ success: boolean }>(`manage/users/${partitionKey}/${rowKey}`, data).then(r => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}
