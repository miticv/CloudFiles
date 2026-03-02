import axios from 'axios';
import { env } from '@/env';
import { getManager, type OidcConfigId } from './oidc-config';

export const apiClient = axios.create({
  baseURL: env.api,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
});

type TokenConfigId = OidcConfigId | 'cloudfiles';

function getConfigIdForUrl(url: string): TokenConfigId | null {
  if (url.includes('/manage/') || url.includes('/auth/me')) return 'cloudfiles';
  if (url.includes('/auth/')) return null;
  if (url.includes('/azure/files/')) return 'azure-storage';
  if (url.includes('/azure/')) return 'azure';
  if (url.includes('/google/') || url.includes('/process/')) return 'google';
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
