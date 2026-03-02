import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/auth/axios-client';
import type { GoogleDriveFileListResponse } from './types';

export function useDriveFiles(folderId: string, pageToken?: string | null) {
  return useQuery({
    queryKey: ['drive', 'files', folderId, pageToken],
    queryFn: () => {
      const params: string[] = [`folderId=${encodeURIComponent(folderId)}`];
      if (pageToken) params.push(`pageToken=${encodeURIComponent(pageToken)}`);
      return apiClient.get<GoogleDriveFileListResponse>(
        `google/drive/files?${params.join('&')}`
      ).then(r => r.data);
    },
  });
}
