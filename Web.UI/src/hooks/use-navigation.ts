import { useMemo } from 'react';
import { useAuth } from '@/auth/auth-context';
import { useOidc } from '@/auth/oidc-provider';
import { env } from '@/env';
import type { MenuItem, ConnectionStatus } from '@/api/types';

export function useNavigation(): MenuItem[] {
  const { isAdmin } = useAuth();
  const { providers } = useOidc();

  return useMemo(() => {
    const connectionStatuses: ConnectionStatus[] = providers
      .filter(s => {
        if (s.configId === 'pcloud' && !env.featurePCloud) return false;
        return s.configId === 'google' || s.configId === 'azure' || s.configId === 'pcloud' || s.configId === 'dropbox';
      })
      .map(s => ({
        configId: s.configId,
        label: s.configId === 'google' ? 'Google' : s.configId === 'azure' ? 'Azure' : s.configId === 'pcloud' ? 'pCloud' : 'Dropbox',
        connected: s.authenticated,
      }));

    const items: MenuItem[] = [
      { name: 'Azure Storage', type: 'link', icon: 'HardDrive', path: '/storage-browser' },
      { name: 'Google Storage', type: 'link', icon: 'Cloud', path: '/google-storage' },
      { name: 'Google Drive', type: 'link', icon: 'FolderOpen', path: '/google-drive' },
      { name: 'Google Photos', type: 'link', icon: 'Image', path: '/google-photos' },
      ...(env.featurePCloud ? [{ name: 'pCloud', type: 'link' as const, icon: 'CloudCog', path: '/pcloud' }] : []),
      { name: 'Dropbox', type: 'link', icon: 'Droplets', path: '/dropbox' },
      ...(env.featureAppleDrive ? [{ name: 'Apple iCloud Drive', type: 'link' as const, icon: 'CloudOff', path: '/apple-drive' }] : []),
      { name: 'Processes', type: 'link', icon: 'RefreshCw', path: '/processes' },
    ];

    if (isAdmin) {
      items.push(
        { type: 'separator', name: 'Admin' },
        { name: 'User Management', type: 'link', icon: 'Users', path: '/admin/users' },
      );
    }

    items.push(
      { type: 'separator', name: 'Account' },
      { name: 'Connections', type: 'link', icon: 'Link', path: '/connections', connectionStatuses },
    );

    return items;
  }, [isAdmin, providers]);
}
