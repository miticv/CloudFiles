import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/auth/axios-client';
import type { AzureSubscription, AzureResourceGroup, AzureStorageAccount, AzureContainer } from './types';

export function useSubscriptions() {
  return useQuery({
    queryKey: ['azure', 'subscriptions'],
    queryFn: () => apiClient.get<AzureSubscription[]>('azure/subscription/list').then(r => r.data),
  });
}

export function useResourceGroups(subscriptionId: string | null) {
  return useQuery({
    queryKey: ['azure', 'resourceGroups', subscriptionId],
    queryFn: () => apiClient.get<AzureResourceGroup[]>(`azure/subscription/${subscriptionId}/list`).then(r => r.data),
    enabled: !!subscriptionId,
  });
}

export function useStorageAccounts(subscriptionId: string | null, resourceGroup: string | null) {
  return useQuery({
    queryKey: ['azure', 'storageAccounts', subscriptionId, resourceGroup],
    queryFn: () =>
      apiClient.get<AzureStorageAccount[]>(
        `azure/subscription/${subscriptionId}/ResourceGroup/${resourceGroup}/list`
      ).then(r => r.data),
    enabled: !!subscriptionId && !!resourceGroup,
  });
}

export function useContainers(subscriptionId: string | null, resourceGroup: string | null, accountName: string | null) {
  return useQuery({
    queryKey: ['azure', 'containers', subscriptionId, resourceGroup, accountName],
    queryFn: () =>
      apiClient.get<AzureContainer[]>(
        `azure/subscription/${subscriptionId}/ResourceGroup/${resourceGroup}/accountName/${accountName}/list`
      ).then(r => r.data),
    enabled: !!subscriptionId && !!resourceGroup && !!accountName,
  });
}

export function useAssignRole() {
  return useMutation({
    mutationFn: ({ subscriptionId, resourceGroup, accountName, role }: {
      subscriptionId: string; resourceGroup: string; accountName: string; role?: 'reader' | 'contributor';
    }) => {
      const roleParam = role ? `?role=${role}` : '';
      return apiClient.post<{ success: boolean; alreadyAssigned: boolean }>(
        `azure/subscription/${subscriptionId}/ResourceGroup/${resourceGroup}/accountName/${accountName}/assignRole${roleParam}`,
        {}
      ).then(r => r.data);
    },
  });
}

export function useCheckRole(
  subscriptionId: string | null, resourceGroup: string | null, accountName: string | null,
  role?: 'reader' | 'contributor', enabled = false
) {
  const roleParam = role ? `?role=${role}` : '';
  return useQuery({
    queryKey: ['azure', 'checkRole', subscriptionId, resourceGroup, accountName, role],
    queryFn: () =>
      apiClient.get<{ hasRole: boolean }>(
        `azure/subscription/${subscriptionId}/ResourceGroup/${resourceGroup}/accountName/${accountName}/checkRole${roleParam}`
      ).then(r => r.data),
    enabled: enabled && !!subscriptionId && !!resourceGroup && !!accountName,
  });
}

export function useProbeAccess(accountName: string | null, containerName: string | null, enabled = false) {
  return useQuery({
    queryKey: ['azure', 'probe', accountName, containerName],
    queryFn: () =>
      apiClient.get<{ hasAccess: boolean }>(
        `azure/files/probe?account=${accountName}&container=${containerName}`
      ).then(r => r.data),
    enabled: enabled && !!accountName && !!containerName,
    refetchInterval: false,
  });
}
