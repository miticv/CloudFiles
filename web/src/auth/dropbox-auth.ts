import { env } from '@/env';

const DROPBOX_TOKEN_KEY = 'dropbox_token';
const DROPBOX_REFRESH_KEY = 'dropbox_refresh_token';
const DROPBOX_EXPIRES_KEY = 'dropbox_expires_at';
const DROPBOX_PKCE_VERIFIER_KEY = 'dropbox_pkce_verifier';

// ─── PKCE helpers ───

function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

export function getDropboxPkceVerifier(): string | null {
  return sessionStorage.getItem(DROPBOX_PKCE_VERIFIER_KEY);
}

export function clearDropboxPkceVerifier(): void {
  sessionStorage.removeItem(DROPBOX_PKCE_VERIFIER_KEY);
}

export function getDropboxToken(): string | null {
  return localStorage.getItem(DROPBOX_TOKEN_KEY);
}

export function isDropboxConnected(): boolean {
  return !!getDropboxToken() && !isDropboxTokenExpired();
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
  if (!expiresAt) return true; // no expiry info, assume expired
  // Consider expired if within 5 minutes of expiry
  return Date.now() > parseInt(expiresAt, 10) - 5 * 60 * 1000;
}

export async function startDropboxLogin(): Promise<void> {
  const verifier = generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);
  sessionStorage.setItem(DROPBOX_PKCE_VERIFIER_KEY, verifier);

  const redirectUri = `${window.location.origin}/connections`;
  const params = new URLSearchParams({
    client_id: env.dropboxClientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    token_access_type: 'offline',
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });
  window.location.href = `https://www.dropbox.com/oauth2/authorize?${params.toString()}`;
}
