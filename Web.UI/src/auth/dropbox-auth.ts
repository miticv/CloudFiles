import { env } from '@/env';

const DROPBOX_TOKEN_KEY = 'dropbox_token';
const DROPBOX_REFRESH_KEY = 'dropbox_refresh_token';
const DROPBOX_EXPIRES_KEY = 'dropbox_expires_at';

export function getDropboxToken(): string | null {
  return localStorage.getItem(DROPBOX_TOKEN_KEY);
}

export function isDropboxConnected(): boolean {
  return !!getDropboxToken();
}

export function setDropboxAuth(accessToken: string, refreshToken: string, expiresIn: number): void {
  localStorage.setItem(DROPBOX_TOKEN_KEY, accessToken);
  if (refreshToken) {
    localStorage.setItem(DROPBOX_REFRESH_KEY, refreshToken);
  }
  if (expiresIn > 0) {
    const expiresAt = Date.now() + expiresIn * 1000;
    localStorage.setItem(DROPBOX_EXPIRES_KEY, expiresAt.toString());
  }
}

export function clearDropboxAuth(): void {
  localStorage.removeItem(DROPBOX_TOKEN_KEY);
  localStorage.removeItem(DROPBOX_REFRESH_KEY);
  localStorage.removeItem(DROPBOX_EXPIRES_KEY);
}

export function getDropboxRefreshToken(): string | null {
  return localStorage.getItem(DROPBOX_REFRESH_KEY);
}

export function isDropboxTokenExpired(): boolean {
  const expiresAt = localStorage.getItem(DROPBOX_EXPIRES_KEY);
  if (!expiresAt) return false; // no expiry info, assume valid
  // Consider expired if within 5 minutes of expiry
  return Date.now() > parseInt(expiresAt, 10) - 5 * 60 * 1000;
}

export function startDropboxLogin(): void {
  const redirectUri = `${window.location.origin}/connections`;
  const params = new URLSearchParams({
    client_id: env.dropboxClientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    token_access_type: 'offline',
  });
  window.location.href = `https://www.dropbox.com/oauth2/authorize?${params.toString()}`;
}
