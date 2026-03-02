import { useMemo } from 'react';
import { useAuth } from '@/auth/auth-context';
import { useOidc } from '@/auth/oidc-provider';
import type { MenuItem, ConnectionStatus } from '@/api/types';

export function useNavigation(): MenuItem[] {
  const { isAdmin } = useAuth();
  const { providers } = useOidc();

  return useMemo(() => {
    const connectionStatuses: ConnectionStatus[] = providers
      .filter(s => s.configId === 'google' || s.configId === 'azure' || s.configId === 'pcloud')
      .map(s => ({
        configId: s.configId,
        label: s.configId === 'google' ? 'Google' : s.configId === 'pcloud' ? 'pCloud' : 'Azure',
        connected: s.authenticated,
      }));

    const items: MenuItem[] = [
      { name: 'Storage Browser', type: 'link', icon: 'HardDrive', path: '/storage-browser' },
      { name: 'Google Storage', type: 'link', icon: 'Cloud', path: '/google-storage' },
      { name: 'Google Drive', type: 'link', icon: 'FolderOpen', path: '/google-drive' },
      { name: 'Google Photos', type: 'link', icon: 'Image', path: '/google-photos' },
      { name: 'pCloud', type: 'link', icon: 'CloudCog', path: '/pcloud' },
      { name: 'Apple iCloud Drive', type: 'link', icon: 'CloudOff', path: '/apple-drive' },
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
