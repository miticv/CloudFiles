import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/auth/axios-client';
import type { PickingSession, PickedMediaItem, PickedMediaItemsResponse } from './types';
import { env } from '@/env';

export function useCreateSession() {
  return useMutation({
    mutationFn: () => apiClient.post<PickingSession>('google/photos/sessions', {}).then(r => r.data),
  });
}

export function usePollSession(sessionId: string | null, enabled = false) {
  return useQuery({
    queryKey: ['photos', 'session', sessionId],
    queryFn: () =>
      apiClient.get<PickingSession>(`google/photos/sessions/${encodeURIComponent(sessionId!)}`).then(r => r.data),
    enabled: enabled && !!sessionId,
    refetchInterval: 3000,
  });
}

export function usePickedItems(sessionId: string | null, enabled = false) {
  return useQuery({
    queryKey: ['photos', 'items', sessionId],
    queryFn: () =>
      apiClient.get<PickedMediaItemsResponse>(
        `google/photos/sessions/${encodeURIComponent(sessionId!)}/media`
      ).then(r => r.data.mediaItems || []) as Promise<PickedMediaItem[]>,
    enabled: enabled && !!sessionId,
  });
}

export function useDeleteSession() {
  return useMutation({
    mutationFn: (sessionId: string) =>
      apiClient.delete(`google/photos/sessions/${encodeURIComponent(sessionId)}`),
  });
}

export function getImageProxyUrl(baseUrl: string, width: number, height: number): string {
  const sizedUrl = `${baseUrl}=w${width}-h${height}-c`;
  return `${env.api}google/photos/image?url=${encodeURIComponent(sizedUrl)}`;
}
