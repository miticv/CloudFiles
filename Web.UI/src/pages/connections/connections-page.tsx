import { useEffect, useCallback, useRef, useState } from 'react';
import { useOidc } from '@/auth/oidc-provider';
import { useAuth } from '@/auth/auth-context';
import { startPCloudLogin, setPCloudAuth, clearPCloudAuth, isPCloudConnected } from '@/auth/pcloud-auth';
import { startDropboxLogin, setDropboxAuth, clearDropboxAuth, isDropboxConnected } from '@/auth/dropbox-auth';
import { useExchangePCloudCode } from '@/api/pcloud.api';
import { useExchangeDropboxCode } from '@/api/dropbox.api';
import { env } from '@/env';
import { usePageTitle } from '@/hooks/use-page-title';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Chrome, Building2, CloudCog, Droplets, Check, X, Cloud } from 'lucide-react';

const OIDC_PROVIDERS = [
  {
    id: 'google' as const,
    name: 'Google',
    description: 'Access Google Cloud Storage, Google Photos, and Google Drive.',
    icon: Chrome,
    iconColor: 'text-red-500',
    iconBg: 'bg-red-50',
  },
  {
    id: 'azure' as const,
    name: 'Microsoft Azure',
    description: 'Access Azure Blob Storage and manage your Azure resources.',
    icon: Building2,
    iconColor: 'text-blue-600',
    iconBg: 'bg-blue-50',
  },
];

const PCLOUD_PROVIDER = {
  id: 'pcloud' as const,
  name: 'pCloud',
  description: 'Access your pCloud cloud storage.',
  icon: CloudCog,
  iconColor: 'text-teal-600',
  iconBg: 'bg-teal-50',
};

const DROPBOX_PROVIDER = {
  id: 'dropbox' as const,
  name: 'Dropbox',
  description: 'Access your Dropbox files and folders.',
  icon: Droplets,
  iconColor: 'text-blue-500',
  iconBg: 'bg-blue-50',
};

export function Component() {
  usePageTitle('Connections');

  const oidc = useOidc();
  const auth = useAuth();
  const processedRef = useRef(false);
  const pcloudProcessedRef = useRef(false);
  const dropboxProcessedRef = useRef(false);
  const [pcloudLoading, setPcloudLoading] = useState(false);
  const [dropboxLoading, setDropboxLoading] = useState(false);
  const exchangeCode = useExchangePCloudCode();
  const exchangeDropboxCode = useExchangeDropboxCode();

  // Process pending OIDC OAuth login (user returns from OAuth redirect)
  const processPendingOAuth = useCallback(async () => {
    if (processedRef.current) return;
    const pendingProvider = auth.oauthPending;
    if (!pendingProvider) return;

    processedRef.current = true;
    try {
      const configId = pendingProvider as 'google' | 'azure';
      const accessToken = await oidc.getAccessToken(configId);
      if (accessToken) {
        await auth.oauthLogin(accessToken, pendingProvider);
      }
    } catch (err) {
      console.error('[Connections] Failed to process OAuth login:', err);
    } finally {
      auth.clearOAuthPending();
    }
  }, [auth, oidc]);

  useEffect(() => {
    if (oidc.ready) {
      processPendingOAuth();
    }
  }, [oidc.ready, processPendingOAuth]);

  // Process pCloud OAuth callback (code + hostname in URL params)
  useEffect(() => {
    if (pcloudProcessedRef.current) return;

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const locationid = params.get('locationid');

    // pCloud redirects back with code + locationid + hostname
    if (!code || !locationid) return;

    // Derive hostname from locationid (1=US, 2=EU)
    const pcloudHostname = params.get('hostname') || (locationid === '2' ? 'eapi.pcloud.com' : 'api.pcloud.com');

    pcloudProcessedRef.current = true;
    setPcloudLoading(true);

    // Clean URL immediately
    window.history.replaceState({}, '', window.location.pathname);

    exchangeCode.mutateAsync({ code, hostname: pcloudHostname })
      .then((response) => {
        setPCloudAuth(response.accessToken, response.hostname);
        console.log('[Connections] pCloud connected successfully');
      })
      .catch((err) => {
        console.error('[Connections] pCloud OAuth exchange failed:', err);
      })
      .finally(() => {
        setPcloudLoading(false);
      });
  }, [exchangeCode]);

  // Process Dropbox OAuth callback (code in URL params, no locationid = Dropbox)
  useEffect(() => {
    if (dropboxProcessedRef.current) return;

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const locationid = params.get('locationid');

    // Dropbox returns code without locationid (pCloud returns locationid)
    if (!code || locationid) return;

    // Also skip if this is an OIDC callback (has state param)
    if (params.has('state')) return;

    dropboxProcessedRef.current = true;
    setDropboxLoading(true);

    // Clean URL immediately
    window.history.replaceState({}, '', window.location.pathname);

    const redirectUri = `${window.location.origin}/connections`;
    exchangeDropboxCode.mutateAsync({ code, redirectUri })
      .then((response) => {
        setDropboxAuth(response.accessToken, response.refreshToken, response.expiresIn);
        console.log('[Connections] Dropbox connected successfully');
      })
      .catch((err) => {
        console.error('[Connections] Dropbox OAuth exchange failed:', err);
      })
      .finally(() => {
        setDropboxLoading(false);
      });
  }, [exchangeDropboxCode]);

  function isConnected(providerId: string): boolean {
    if (providerId === 'pcloud') return isPCloudConnected();
    if (providerId === 'dropbox') return isDropboxConnected();
    return oidc.providers.some(
      (p) => p.configId === providerId && p.authenticated
    );
  }

  function handleConnect(providerId: string) {
    if (providerId === 'pcloud') {
      startPCloudLogin();
      return;
    }
    if (providerId === 'dropbox') {
      startDropboxLogin();
      return;
    }
    oidc.login(providerId as 'google' | 'azure');
  }

  function handleDisconnect(providerId: string) {
    if (providerId === 'pcloud') {
      clearPCloudAuth();
      // Force re-render
      setPcloudLoading(false);
      return;
    }
    if (providerId === 'dropbox') {
      clearDropboxAuth();
      setDropboxLoading(false);
      return;
    }
    oidc.logout(providerId as 'google' | 'azure');
    if (providerId === 'azure') {
      oidc.logout('azure-storage');
    }
  }

  if (!oidc.ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <Spinner size={28} />
          <p className="text-sm text-muted-foreground">Loading providers...</p>
        </div>
      </div>
    );
  }

  const allProviders = [
    ...OIDC_PROVIDERS.map((p) => ({ ...p, type: 'oidc' as const })),
    ...(env.featurePCloud ? [{ ...PCLOUD_PROVIDER, type: 'pcloud' as const }] : []),
    { ...DROPBOX_PROVIDER, type: 'dropbox' as const },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-slate-100">
      <div className="max-w-2xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary text-primary-foreground mb-4 shadow-lg">
            <Cloud className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Connect Your Cloud Providers
          </h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
            Sign in with one or more providers to browse your cloud storage
          </p>
        </div>

        {/* Provider cards */}
        <div className="space-y-4 mb-8">
          {allProviders.map((provider) => {
            const connected = isConnected(provider.id);
            const Icon = provider.icon;
            const loading = (provider.id === 'pcloud' && pcloudLoading) || (provider.id === 'dropbox' && dropboxLoading);

            return (
              <div
                key={provider.id}
                className="bg-card rounded-xl border border-border shadow-[var(--shadow-card)] p-5 flex items-center gap-4 transition-shadow hover:shadow-[var(--shadow-card-hover)]"
              >
                {/* Icon */}
                <div
                  className={`flex-shrink-0 w-12 h-12 rounded-xl ${provider.iconBg} flex items-center justify-center`}
                >
                  <Icon className={`w-6 h-6 ${provider.iconColor}`} />
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-semibold text-card-foreground">
                      {provider.name}
                    </h3>
                    {loading ? (
                      <Badge variant="secondary" className="gap-1">
                        <Spinner size={12} />
                        Connecting...
                      </Badge>
                    ) : connected ? (
                      <Badge variant="success" className="gap-1">
                        <Check className="w-3 h-3" />
                        Connected
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1">
                        <X className="w-3 h-3" />
                        Not connected
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {provider.description}
                  </p>
                </div>

                {/* Action */}
                <div className="flex-shrink-0">
                  {connected ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDisconnect(provider.id)}
                    >
                      Disconnect
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      disabled={loading}
                      onClick={() => handleConnect(provider.id)}
                    >
                      Connect
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}

export { Component as ConnectionsPage };
export default Component;
