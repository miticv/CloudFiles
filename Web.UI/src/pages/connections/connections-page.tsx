import { useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useOidc } from '@/auth/oidc-provider';
import { useAuth } from '@/auth/auth-context';
import { usePageTitle } from '@/hooks/use-page-title';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Chrome, Building2, Check, X, ArrowRight, Cloud } from 'lucide-react';

const PROVIDERS = [
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

export function Component() {
  usePageTitle('Connections');

  const navigate = useNavigate();
  const oidc = useOidc();
  const auth = useAuth();
  const processedRef = useRef(false);

  // Process pending OAuth login (user returns from OAuth redirect)
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

  function isConnected(providerId: string): boolean {
    return oidc.providers.some(
      (p) => p.configId === providerId && p.authenticated
    );
  }

  function handleConnect(providerId: 'google' | 'azure') {
    oidc.login(providerId);
  }

  function handleDisconnect(providerId: 'google' | 'azure') {
    oidc.logout(providerId);
    if (providerId === 'azure') {
      oidc.logout('azure-storage');
    }
  }

  function handleContinue() {
    const redirect = localStorage.getItem('redirect');
    if (redirect) {
      localStorage.removeItem('redirect');
      navigate(redirect);
    } else {
      navigate('/file-manager');
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
          {PROVIDERS.map((provider) => {
            const connected = isConnected(provider.id);
            const Icon = provider.icon;

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
                    {connected ? (
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

        {/* Continue button */}
        <div className="text-center">
          <Button
            size="lg"
            className="min-w-[200px]"
            onClick={handleContinue}
          >
            Continue
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export { Component as ConnectionsPage };
export default Component;
