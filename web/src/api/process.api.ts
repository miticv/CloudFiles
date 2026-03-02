import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/auth/axios-client';
import type {
  StartJobResponse, OrchestrationInstance, ProcessListParams, ProcessListResponse,
  StartMigrationRequest, StartGoogleStorageRequest, StartGooglePhotosToAzureRequest,
  StartGoogleDriveToAzureRequest, StartGcsToAzureRequest, StartAzureToGcsRequest,
  StartDropboxToAzureRequest, StartAzureToDropboxRequest,
  StartGcsToDropboxRequest, StartGcsToDriveRequest,
  StartDropboxToGcsRequest, StartDropboxToGooglePhotosRequest, StartDropboxToDriveRequest,
  StartAzureToDriveRequest,
  StartGoogleDriveToGcsRequest, StartGoogleDriveToDropboxRequest, StartGoogleDriveToGooglePhotosRequest,
  StartGooglePhotosToGcsRequest, StartGooglePhotosToDropboxRequest, StartGooglePhotosToGoogleDriveRequest,
} from './types';

export function useProcesses(params?: ProcessListParams, refetchInterval?: number | false) {
  return useQuery({
    queryKey: ['processes', params],
    queryFn: () => {
      const searchParams = new URLSearchParams();
      if (params?.pageSize) searchParams.set('pageSize', params.pageSize.toString());
      if (params?.page) searchParams.set('page', params.page.toString());
      if (params?.from) searchParams.set('from', params.from);
      if (params?.to) searchParams.set('to', params.to);
      if (params?.statusList?.length) searchParams.set('statusList', params.statusList.join(','));
      if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
      if (params?.sortDir) searchParams.set('sortDir', params.sortDir);
      if (params?.names?.length) searchParams.set('names', params.names.join(','));
      if (params?.all) searchParams.set('all', 'true');
      const qs = searchParams.toString();
      return apiClient.get<ProcessListResponse>(`process/instances${qs ? '?' + qs : ''}`).then(r => r.data);
    },
    refetchInterval,
  });
}

export function useProcessInstance(instanceId: string | null, enabled = false) {
  return useQuery({
    queryKey: ['process', instanceId],
    queryFn: () => apiClient.get<OrchestrationInstance>(`process/instances/${instanceId}`).then(r => r.data),
    enabled: enabled && !!instanceId,
  });
}

export function usePurgeProcess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (instanceId: string) =>
      apiClient.delete<{ instanceId: string; purged: boolean }>(`process/instances/${instanceId}`).then(r => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['processes'] }),
  });
}

export function useRestartProcess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ instanceId, azureAccessToken }: { instanceId: string; azureAccessToken?: string }) =>
      apiClient.post<{ instanceId: string; restartedFrom: string }>(
        `process/instances/${instanceId}/restart`,
        azureAccessToken ? { azureAccessToken } : undefined,
      ).then(r => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['processes'] }),
  });
}

export function useTerminateProcess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (instanceId: string) =>
      apiClient.post<{ instanceId: string; terminated: boolean }>(
        `process/instances/${instanceId}/terminate`,
      ).then(r => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['processes'] }),
  });
}

export function useStartMigration() {
  return useMutation({
    mutationFn: (request: StartMigrationRequest) =>
      apiClient.post<StartJobResponse>('process/AzureStorageToGooglePhotos/start', request).then(r => r.data),
  });
}

export function useStartGoogleStorageToPhotos() {
  return useMutation({
    mutationFn: (request: StartGoogleStorageRequest) =>
      apiClient.post<StartJobResponse>('process/GoogleStorageToGooglePhotos/start', request).then(r => r.data),
  });
}

export function useStartPhotosToAzure() {
  return useMutation({
    mutationFn: (request: StartGooglePhotosToAzureRequest) =>
      apiClient.post<StartJobResponse>('process/GooglePhotosToAzure/start', request).then(r => r.data),
  });
}

export function useStartDriveToAzure() {
  return useMutation({
    mutationFn: (request: StartGoogleDriveToAzureRequest) =>
      apiClient.post<StartJobResponse>('process/GoogleDriveToAzure/start', request).then(r => r.data),
  });
}

export function useStartGcsToAzure() {
  return useMutation({
    mutationFn: (request: StartGcsToAzureRequest) =>
      apiClient.post<StartJobResponse>('process/GoogleStorageToAzure/start', request).then(r => r.data),
  });
}

export function useStartAzureToGcs() {
  return useMutation({
    mutationFn: (request: StartAzureToGcsRequest) =>
      apiClient.post<StartJobResponse>('process/AzureToGcs/start', request).then(r => r.data),
  });
}

export function useStartDropboxToAzure() {
  return useMutation({
    mutationFn: (request: StartDropboxToAzureRequest) =>
      apiClient.post<StartJobResponse>('process/DropboxToAzure/start', request).then(r => r.data),
  });
}

export function useStartAzureToDropbox() {
  return useMutation({
    mutationFn: (request: StartAzureToDropboxRequest) =>
      apiClient.post<StartJobResponse>('process/AzureToDropbox/start', request).then(r => r.data),
  });
}

export function useStartGcsToDropbox() {
  return useMutation({
    mutationFn: (request: StartGcsToDropboxRequest) =>
      apiClient.post<StartJobResponse>('process/GoogleStorageToDropbox/start', request).then(r => r.data),
  });
}

export function useStartGcsToDrive() {
  return useMutation({
    mutationFn: (request: StartGcsToDriveRequest) =>
      apiClient.post<StartJobResponse>('process/GoogleStorageToDrive/start', request).then(r => r.data),
  });
}

export function useStartDropboxToGcs() {
  return useMutation({
    mutationFn: (request: StartDropboxToGcsRequest) =>
      apiClient.post<StartJobResponse>('process/DropboxToGcs/start', request).then(r => r.data),
  });
}

export function useStartDropboxToGooglePhotos() {
  return useMutation({
    mutationFn: (request: StartDropboxToGooglePhotosRequest) =>
      apiClient.post<StartJobResponse>('process/DropboxToGooglePhotos/start', request).then(r => r.data),
  });
}

export function useStartDropboxToDrive() {
  return useMutation({
    mutationFn: (request: StartDropboxToDriveRequest) =>
      apiClient.post<StartJobResponse>('process/DropboxToGoogleDrive/start', request).then(r => r.data),
  });
}

export function useStartAzureToDrive() {
  return useMutation({
    mutationFn: (request: StartAzureToDriveRequest) =>
      apiClient.post<StartJobResponse>('process/AzureToGoogleDrive/start', request).then(r => r.data),
  });
}

export function useStartDriveToGcs() {
  return useMutation({
    mutationFn: (request: StartGoogleDriveToGcsRequest) =>
      apiClient.post<StartJobResponse>('process/GoogleDriveToGcs/start', request).then(r => r.data),
  });
}

export function useStartDriveToDropbox() {
  return useMutation({
    mutationFn: (request: StartGoogleDriveToDropboxRequest) =>
      apiClient.post<StartJobResponse>('process/GoogleDriveToDropbox/start', request).then(r => r.data),
  });
}

export function useStartDriveToGooglePhotos() {
  return useMutation({
    mutationFn: (request: StartGoogleDriveToGooglePhotosRequest) =>
      apiClient.post<StartJobResponse>('process/GoogleDriveToGooglePhotos/start', request).then(r => r.data),
  });
}

export function useStartPhotosToGcs() {
  return useMutation({
    mutationFn: (request: StartGooglePhotosToGcsRequest) =>
      apiClient.post<StartJobResponse>('process/GooglePhotosToGcs/start', request).then(r => r.data),
  });
}

export function useStartPhotosToDropbox() {
  return useMutation({
    mutationFn: (request: StartGooglePhotosToDropboxRequest) =>
      apiClient.post<StartJobResponse>('process/GooglePhotosToDropbox/start', request).then(r => r.data),
  });
}

export function useStartPhotosToGoogleDrive() {
  return useMutation({
    mutationFn: (request: StartGooglePhotosToGoogleDriveRequest) =>
      apiClient.post<StartJobResponse>('process/GooglePhotosToGoogleDrive/start', request).then(r => r.data),
  });
}
