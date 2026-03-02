import { env } from '@/env';

const PCLOUD_TOKEN_KEY = 'pcloud_token';
const PCLOUD_HOSTNAME_KEY = 'pcloud_hostname';

export function getPCloudToken(): string | null {
  return localStorage.getItem(PCLOUD_TOKEN_KEY);
}

export function getPCloudHostname(): string | null {
  return localStorage.getItem(PCLOUD_HOSTNAME_KEY);
}

export function isPCloudConnected(): boolean {
  return !!getPCloudToken() && !!getPCloudHostname();
}

export function setPCloudAuth(token: string, hostname: string): void {
  localStorage.setItem(PCLOUD_TOKEN_KEY, token);
  localStorage.setItem(PCLOUD_HOSTNAME_KEY, hostname);
}

export function clearPCloudAuth(): void {
  localStorage.removeItem(PCLOUD_TOKEN_KEY);
  localStorage.removeItem(PCLOUD_HOSTNAME_KEY);
}

export function startPCloudLogin(): void {
  const redirectUri = `${window.location.origin}/connections`;
  const params = new URLSearchParams({
    client_id: env.pCloudClientId,
    response_type: 'code',
    redirect_uri: redirectUri,
  });
  window.location.href = `https://my.pcloud.com/oauth2/authorize?${params.toString()}`;
}
