import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/auth/axios-client';
import type { DropboxFolderResponse, DropboxTokenResponse } from './types';

export function useDropboxFolder(path: string, enabled = true) {
  return useQuery({
    queryKey: ['dropbox', 'folder', path],
    queryFn: () =>
      apiClient
        .get<DropboxFolderResponse>(`dropbox/files/list?path=${encodeURIComponent(path)}`)
        .then((r) => r.data),
    enabled,
  });
}

export function useExchangeDropboxCode() {
  return useMutation({
    mutationFn: (params: { code: string; redirectUri: string }) =>
      apiClient
        .post<DropboxTokenResponse>('dropbox/oauth/callback', params)
        .then((r) => r.data),
  });
}
