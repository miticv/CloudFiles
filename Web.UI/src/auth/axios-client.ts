import axios from 'axios';
import { env } from '@/env';
import { getManager, type OidcConfigId } from './oidc-config';
import { getPCloudToken, getPCloudHostname, clearPCloudAuth } from './pcloud-auth';
import { getDropboxToken, getDropboxRefreshToken, isDropboxTokenExpired, setDropboxAuth, clearDropboxAuth } from './dropbox-auth';

export const apiClient = axios.create({
  baseURL: env.api,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
});

type TokenConfigId = OidcConfigId | 'cloudfiles' | 'pcloud' | 'dropbox';

function getConfigIdForUrl(url: string): TokenConfigId | null {
  if (url.includes('manage/') || url.includes('auth/me')) return 'cloudfiles';
  if (url.includes('pcloud/oauth/')) return 'cloudfiles';
  if (url.includes('dropbox/oauth/')) return 'cloudfiles';
  if (url.includes('auth/')) return null;
  if (url.includes('pcloud/')) return 'pcloud';
  if (url.includes('dropbox/')) return 'dropbox';
  if (url.includes('azure/files/')) return 'azure-storage';
  if (url.includes('azure/')) return 'azure';
  if (url.includes('process/DropboxToAzure/') || url.includes('process/AzureToDropbox/')
    || url.includes('process/DropboxToGcs/') || url.includes('process/DropboxToGooglePhotos/')
    || url.includes('process/DropboxToGoogleDrive/')) return 'dropbox';
  if (url.includes('google/') || url.includes('process/')) return 'google';
  return null;
}

// Request interceptor: attach the correct token
apiClient.interceptors.request.use(async (config) => {
  const url = config.url || '';
  const configId = getConfigIdForUrl(url);

  if (!configId) return config;

  if (configId === 'cloudfiles') {
    const token = localStorage.getItem('cf_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  }

  if (configId === 'pcloud') {
    const token = getPCloudToken();
    const hostname = getPCloudHostname();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (hostname) {
      config.headers['X-PCloud-Hostname'] = hostname;
    }
    return config;
  }

  if (configId === 'dropbox') {
    let token = getDropboxToken();
    if (token && isDropboxTokenExpired()) {
      const refreshToken = getDropboxRefreshToken();
      if (refreshToken) {
        try {
          const res = await axios.post<{ accessToken: string; refreshToken: string; expiresIn: number }>(
            `${env.api}dropbox/oauth/refresh`,
            { refreshToken },
            { headers: { Authorization: `Bearer ${localStorage.getItem('cf_token')}` } },
          );
          setDropboxAuth(res.data.accessToken, res.data.refreshToken, res.data.expiresIn);
          token = res.data.accessToken;
        } catch {
          console.warn('[Auth Interceptor] Dropbox token refresh failed — clearing auth');
          clearDropboxAuth();
          window.location.href = '/connections';
          return config;
        }
      }
    }
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  }

  try {
    const user = await getManager(configId).getUser();
    if (user?.access_token) {
      config.headers.Authorization = `Bearer ${user.access_token}`;
    } else {
      console.warn(`[Auth Interceptor] no token for "${configId}" — request may fail:`, url);
    }
  } catch {
    console.warn(`[Auth Interceptor] error getting token for "${configId}":`, url);
  }

  return config;
});

// Response interceptor: handle 401s
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      const configId = getConfigIdForUrl(url);

      if (configId === 'cloudfiles') {
        console.warn('[Auth Interceptor] 401 from CloudFiles JWT — session expired:', url);
        localStorage.removeItem('cf_token');
        localStorage.removeItem('cf_user');
        window.location.href = '/sessions/login';
      } else if (configId === 'pcloud') {
        console.warn('[Auth Interceptor] 401 from pCloud — token revoked:', url);
        clearPCloudAuth();
        window.location.href = '/connections';
      } else if (configId === 'dropbox') {
        const refreshToken = getDropboxRefreshToken();
        if (refreshToken && !error.config._dropboxRetried) {
          try {
            const res = await axios.post<{ accessToken: string; refreshToken: string; expiresIn: number }>(
              `${env.api}dropbox/oauth/refresh`,
              { refreshToken },
              { headers: { Authorization: `Bearer ${localStorage.getItem('cf_token')}` } },
            );
            setDropboxAuth(res.data.accessToken, res.data.refreshToken, res.data.expiresIn);
            error.config._dropboxRetried = true;
            error.config.headers.Authorization = `Bearer ${res.data.accessToken}`;
            return apiClient.request(error.config);
          } catch {
            // refresh failed — fall through to clear
          }
        }
        console.warn('[Auth Interceptor] 401 from Dropbox — token expired:', url);
        clearDropboxAuth();
        window.location.href = '/connections';
      } else if (configId) {
        console.warn(`[Auth Interceptor] 401 from "${configId}" — token expired:`, url);
        try {
          await getManager(configId as OidcConfigId).removeUser();
        } catch { /* ignore */ }
        window.location.href = '/connections';
      }
    }
    return Promise.reject(error);
  }
);
