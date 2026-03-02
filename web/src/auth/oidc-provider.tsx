import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import type { User } from 'oidc-client-ts';
import { googleManager, azureManager, azureStorageManager, getManager, type OidcConfigId } from './oidc-config';
import { useAuth } from './auth-context';
import { isPCloudConnected, clearPCloudAuth } from './pcloud-auth';
import { isDropboxConnected, clearDropboxAuth } from './dropbox-auth';
import { Spinner } from '@/components/ui/spinner';
import type { ProviderStatus } from '@/api/types';

interface OidcContextValue {
  providers: ProviderStatus[];
  isAnyAuthenticated: boolean;
  login: (configId: OidcConfigId) => void;
  logout: (configId: OidcConfigId) => void;
  logoutAll: () => void;
  getAccessToken: (configId: OidcConfigId) => Promise<string | null>;
  refreshProviderStatus: () => Promise<void>;
  ready: boolean;
}

const OidcContext = createContext<OidcContextValue | null>(null);

const PROVIDER_IDS: OidcConfigId[] = ['google', 'azure', 'azure-storage'];

// Capture callback URL synchronously at module load time,
// before React Router can strip the query params via <Navigate>
const capturedCallbackUrl = (() => {
  const params = new URLSearchParams(window.location.search);
  if (params.has('code') && params.has('state')) {
    return window.location.href;
  }
  return null;
})();

export function OidcProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();

  const [providers, setProviders] = useState<ProviderStatus[]>([
    ...PROVIDER_IDS.map(id => ({ configId: id, authenticated: false })),
    { configId: 'pcloud', authenticated: false },
    { configId: 'dropbox', authenticated: false },
  ]);
  const [ready, setReady] = useState(false);
  const [processingCallback, setProcessingCallback] = useState(!!capturedCallbackUrl);
  const initializedRef = useRef(false);

  const refreshProviderStatus = useCallback(async () => {
    const oidcStatuses = await Promise.all(
      PROVIDER_IDS.map(async (configId) => {
        try {
          const user = await getManager(configId).getUser();
          return { configId, authenticated: !!user && !user.expired };
        } catch {
          return { configId, authenticated: false };
        }
      })
    );
    const pcloudStatus: ProviderStatus = { configId: 'pcloud', authenticated: isPCloudConnected() };
    const dropboxStatus: ProviderStatus = { configId: 'dropbox', authenticated: isDropboxConnected() };
    setProviders([...oidcStatuses, pcloudStatus, dropboxStatus]);
  }, []);

  // Initialize: process callbacks and check existing sessions
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const init = async () => {
      // Step 1: Process OIDC callback if we captured one
      if (capturedCallbackUrl) {
        let callbackHandled = false;
        for (const manager of [googleManager, azureManager, azureStorageManager]) {
          try {
            await manager.signinRedirectCallback(capturedCallbackUrl);
            callbackHandled = true;
            break;
          } catch {
            // Not for this manager, try next
          }
        }

        // Clean URL (remove code/state params)
        window.history.replaceState({}, '', window.location.pathname);

        // Step 2: If this was an OAuth login flow, exchange OIDC token for CloudFiles JWT
        const pendingProvider = localStorage.getItem('cf_oauth_pending');
        if (callbackHandled && pendingProvider) {
          try {
            const configId = pendingProvider as OidcConfigId;
            const user = await getManager(configId).getUser();
            if (user?.access_token) {
              await auth.oauthLogin(user.access_token, pendingProvider);
              console.log('[Auth] OAuth login completed for', pendingProvider);
            }
          } catch (err) {
            console.error('[Auth] OAuth login exchange failed:', err);
          }
          auth.clearOAuthPending();
        }

        setProcessingCallback(false);
      }

      // Step 3: Refresh provider status
      await refreshProviderStatus();

      // Step 4: Process auth chain (azure login triggers azure-storage)
      const chain = localStorage.getItem('auth_chain');
      if (chain) {
        localStorage.removeItem('auth_chain');
        try {
          const user = await getManager(chain as OidcConfigId).getUser();
          if (!user || user.expired) {
            console.log(`[Auth] chaining auth for "${chain}"`);
            getManager(chain as OidcConfigId).signinRedirect();
            return; // Don't set ready — we're redirecting
          }
        } catch {
          // Ignore
        }
      }

      setReady(true);
    };

    init();
  }, [refreshProviderStatus, auth]);

  // Listen for auth-status-changed events from the axios interceptor
  useEffect(() => {
    const handler = () => refreshProviderStatus();
    window.addEventListener('auth-status-changed', handler);
    return () => window.removeEventListener('auth-status-changed', handler);
  }, [refreshProviderStatus]);

  // Event listeners for token lifecycle
  useEffect(() => {
    const managers = [
      { id: 'google', mgr: googleManager },
      { id: 'azure', mgr: azureManager },
      { id: 'azure-storage', mgr: azureStorageManager },
    ];

    const cleanups: (() => void)[] = [];

    for (const { id, mgr } of managers) {
      const onLoaded = () => {
        console.log(`[Auth] user loaded for "${id}"`);
        refreshProviderStatus();
      };
      const onUnloaded = () => {
        console.log(`[Auth] user unloaded for "${id}"`);
        refreshProviderStatus();
      };
      const onRenewError = (error: Error) => {
        console.error(`[Auth] silent renew failed for "${id}":`, error);
        mgr.removeUser();
        refreshProviderStatus();
      };

      mgr.events.addUserLoaded(onLoaded);
      mgr.events.addUserUnloaded(onUnloaded);
      mgr.events.addSilentRenewError(onRenewError);

      cleanups.push(() => {
        mgr.events.removeUserLoaded(onLoaded);
        mgr.events.removeUserUnloaded(onUnloaded);
        mgr.events.removeSilentRenewError(onRenewError);
      });
    }

    return () => cleanups.forEach(fn => fn());
  }, [refreshProviderStatus]);

  const login = useCallback((configId: OidcConfigId) => {
    console.log(`[Auth] login initiated for "${configId}"`);
    if (configId === 'azure') {
      localStorage.setItem('auth_chain', 'azure-storage');
    }
    getManager(configId).signinRedirect().catch((err) => {
      console.error(`[Auth] signinRedirect failed for "${configId}":`, err);
    });
  }, []);

  const logout = useCallback((configId: OidcConfigId) => {
    console.log(`[Auth] logout for "${configId}"`);
    getManager(configId).removeUser().then(refreshProviderStatus);
  }, [refreshProviderStatus]);

  const logoutAll = useCallback(() => {
    console.log('[Auth] logout all providers');
    clearPCloudAuth();
    clearDropboxAuth();
    Promise.all(PROVIDER_IDS.map(id => getManager(id).removeUser())).then(refreshProviderStatus);
  }, [refreshProviderStatus]);

  const getAccessToken = useCallback(async (configId: OidcConfigId): Promise<string | null> => {
    try {
      const user: User | null = await getManager(configId).getUser();
      return user?.access_token ?? null;
    } catch {
      return null;
    }
  }, []);

  const isAnyAuthenticated = providers.some(p => p.authenticated);

  const contextValue: OidcContextValue = {
    providers, isAnyAuthenticated, login, logout, logoutAll, getAccessToken, refreshProviderStatus, ready,
  };

  // Block rendering children while processing OIDC callback
  // This prevents the router from navigating away before we handle the code/state params
  if (processingCallback) {
    return (
      <OidcContext.Provider value={contextValue}>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center space-y-3">
            <Spinner size={28} />
            <p className="text-sm text-muted-foreground">Completing sign-in...</p>
          </div>
        </div>
      </OidcContext.Provider>
    );
  }

  return (
    <OidcContext.Provider value={contextValue}>
      {children}
    </OidcContext.Provider>
  );
}

export function useOidc() {
  const context = useContext(OidcContext);
  if (!context) throw new Error('useOidc must be used within OidcProvider');
  return context;
}
