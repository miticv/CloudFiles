import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/auth/axios-client';
import type { PCloudFolderResponse, PCloudTokenResponse } from './types';

export function usePCloudFolder(folderId: number, enabled = true) {
  return useQuery({
    queryKey: ['pcloud', 'folder', folderId],
    queryFn: () =>
      apiClient
        .get<PCloudFolderResponse>(`pcloud/files/list?folderId=${folderId}`)
        .then((r) => r.data),
    enabled,
  });
}

export function useExchangePCloudCode() {
  return useMutation({
    mutationFn: (params: { code: string; hostname: string }) =>
      apiClient
        .post<PCloudTokenResponse>('pcloud/oauth/callback', params)
        .then((r) => r.data),
  });
}
