import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/auth/axios-client';
import type { PCloudFolderResponse, PCloudTokenResponse, PCloudFileForCopy } from './types';

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

export async function listAllPCloudFilesInFolder(
  folderId: number,
  prefix: string
): Promise<PCloudFileForCopy[]> {
  const files: PCloudFileForCopy[] = [];
  const res = await apiClient.get<PCloudFolderResponse>(
    `pcloud/files/list?folderId=${folderId}`
  );
  for (const item of res.data.items) {
    if (item.isFolder) {
      const subFiles = await listAllPCloudFilesInFolder(item.folderId, `${prefix}${item.name}/`);
      files.push(...subFiles);
    } else {
      files.push({
        fileId: item.fileId,
        name: `${prefix}${item.name}`,
        size: item.size,
      });
    }
  }
  return files;
}
