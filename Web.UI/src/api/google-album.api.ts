import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/auth/axios-client';
import type { GoogleAlbum, AlbumListResponse } from './types';

export function useAlbums() {
  return useQuery({
    queryKey: ['albums'],
    queryFn: () => apiClient.get<AlbumListResponse>('google/album/list').then(r => r.data.albums || []) as Promise<GoogleAlbum[]>,
  });
}

export function useCreateAlbum() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (title: string) => apiClient.post<GoogleAlbum>('google/album', { title }).then(r => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['albums'] }),
  });
}
