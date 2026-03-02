import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/auth/axios-client';
import type {
  StartJobResponse, OrchestrationInstance, ProcessListParams,
  StartMigrationRequest, StartGoogleStorageRequest, StartGooglePhotosToAzureRequest,
  StartGoogleDriveToAzureRequest, StartGcsToAzureRequest, StartAzureToGcsRequest,
} from './types';

export function useProcesses(params?: ProcessListParams, refetchInterval?: number | false) {
  return useQuery({
    queryKey: ['processes', params],
    queryFn: () => {
      const searchParams = new URLSearchParams();
      if (params?.pageSize) searchParams.set('pageSize', params.pageSize.toString());
      if (params?.from) searchParams.set('from', params.from);
      if (params?.to) searchParams.set('to', params.to);
      if (params?.statusList?.length) searchParams.set('statusList', params.statusList.join(','));
      if (params?.all) searchParams.set('all', 'true');
      const qs = searchParams.toString();
      return apiClient.get<OrchestrationInstance[]>(`process/instances${qs ? '?' + qs : ''}`).then(r => r.data);
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
