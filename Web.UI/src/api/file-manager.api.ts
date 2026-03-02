import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/auth/axios-client';
import type { FileItem, FileDetail, StorageContext } from './types';

function buildListUrl(path: string | null, context: StorageContext): string {
  if (context.provider === 'google') {
    const params: string[] = [];
    if (context.bucket) params.push(`bucket=${encodeURIComponent(context.bucket)}`);
    if (path) params.push(`path=${encodeURIComponent(path)}`);
    return `google/files/list${params.length ? '?' + params.join('&') : ''}`;
  }
  const params: string[] = [];
  if (path) params.push(`path=${encodeURIComponent(path)}`);
  if (context.account) params.push(`account=${encodeURIComponent(context.account)}`);
  if (context.container) params.push(`container=${encodeURIComponent(context.container)}`);
  return `azure/files/list${params.length ? '?' + params.join('&') : ''}`;
}

function buildDetailUrl(path: string, context: StorageContext): string {
  if (context.provider === 'google') {
    const params: string[] = [];
    if (context.bucket) params.push(`bucket=${encodeURIComponent(context.bucket)}`);
    params.push(`path=${encodeURIComponent(path)}`);
    return `google/files/json?${params.join('&')}`;
  }
  const params: string[] = [`path=${encodeURIComponent(path)}`];
  if (context.account) params.push(`account=${encodeURIComponent(context.account)}`);
  if (context.container) params.push(`container=${encodeURIComponent(context.container)}`);
  return `azure/files/json?${params.join('&')}`;
}

export function useFolder(path: string | null, context: StorageContext, enabled = true) {
  return useQuery({
    queryKey: ['files', 'folder', context.provider, context.account, context.container, context.bucket, path],
    queryFn: () => apiClient.get<FileItem[]>(buildListUrl(path, context)).then(r => r.data),
    enabled,
  });
}

export function useFileDetail(path: string | null, context: StorageContext, enabled = false) {
  return useQuery({
    queryKey: ['files', 'detail', context.provider, context.account, context.container, context.bucket, path],
    queryFn: () => apiClient.get<FileDetail>(buildDetailUrl(path!, context)).then(r => r.data),
    enabled: enabled && !!path,
  });
}
