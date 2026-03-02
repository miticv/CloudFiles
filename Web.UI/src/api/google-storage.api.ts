import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/auth/axios-client';
import type { GoogleBucketItem, FileItem } from './types';

export function useBuckets(projectId: string | null) {
  return useQuery({
    queryKey: ['gcs', 'buckets', projectId],
    queryFn: () =>
      apiClient.get<GoogleBucketItem[]>(
        `google/storage/buckets?projectId=${encodeURIComponent(projectId!)}`
      ).then(r => r.data),
    enabled: !!projectId,
  });
}

export function useGcsFiles(bucket: string | null, path?: string | null) {
  return useQuery({
    queryKey: ['gcs', 'files', bucket, path],
    queryFn: () => {
      const params: string[] = [`bucket=${encodeURIComponent(bucket!)}`];
      if (path) params.push(`path=${encodeURIComponent(path)}`);
      return apiClient.get<FileItem[]>(`google/files/list?${params.join('&')}`).then(r => r.data);
    },
    enabled: !!bucket,
  });
}
