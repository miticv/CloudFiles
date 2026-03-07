import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { AuthUser, AuthResponse } from '@/api/types';
import { env } from '@/env';

const CF_TOKEN_KEY = 'cf_token';
const CF_USER_KEY = 'cf_user';
const CF_OAUTH_PENDING_KEY = 'cf_oauth_pending';

export class AuthBlockedError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = 'AuthBlockedError';
    this.code = code;
  }
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoggedIn: boolean;
  isAdmin: boolean;
  oauthPending: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, displayName: string, password: string) => Promise<void>;
  oauthLogin: (accessToken: string, provider: string) => Promise<void>;
  resendConfirmation: (email: string) => Promise<void>;
  logout: () => void;
  setOAuthPending: (provider: string) => void;
  clearOAuthPending: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function loadUserFromStorage(): AuthUser | null {
  try {
    const data = localStorage.getItem(CF_USER_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(loadUserFromStorage);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(CF_TOKEN_KEY));

  const saveSession = useCallback((response: AuthResponse) => {
    localStorage.setItem(CF_TOKEN_KEY, response.token);
    const authUser: AuthUser = {
      email: response.email,
      displayName: response.displayName,
      authProvider: response.authProvider,
      isAdmin: response.isAdmin,
    };
    localStorage.setItem(CF_USER_KEY, JSON.stringify(authUser));
    setToken(response.token);
    setUser(authUser);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${env.api}auth/local/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      if (res.status === 403 && data?.code) {
        throw new AuthBlockedError(data.error || 'Access denied', data.code);
      }
      throw new Error(data?.error || `Login failed (${res.status})`);
    }
    const data: AuthResponse = await res.json();
    saveSession(data);
  }, [saveSession]);

  const register = useCallback(async (email: string, displayName: string, password: string) => {
    const res = await fetch(`${env.api}auth/local/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, displayName, password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(data?.error || `Registration failed (${res.status})`);
    }
    // 202 = email confirmation required (no JWT returned)
    if (res.status === 202) {
      throw new AuthBlockedError('Please check your email to confirm your account.', 'email_confirmation_required');
    }
    const data: AuthResponse = await res.json();
    saveSession(data);
  }, [saveSession]);

  const oauthLogin = useCallback(async (accessToken: string, provider: string) => {
    const res = await fetch(`${env.api}auth/oauth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken, provider }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      if (res.status === 403 && data?.code) {
        throw new AuthBlockedError(data.error || 'Access denied', data.code);
      }
      throw new Error(data?.error || `OAuth login failed (${res.status})`);
    }
    const data: AuthResponse = await res.json();
    saveSession(data);
  }, [saveSession]);

  const resendConfirmation = useCallback(async (email: string) => {
    await fetch(`${env.api}auth/resend-confirmation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(CF_TOKEN_KEY);
    localStorage.removeItem(CF_USER_KEY);
    localStorage.removeItem(CF_OAUTH_PENDING_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const setOAuthPending = useCallback((provider: string) => {
    localStorage.setItem(CF_OAUTH_PENDING_KEY, provider);
  }, []);

  const clearOAuthPending = useCallback(() => {
    localStorage.removeItem(CF_OAUTH_PENDING_KEY);
  }, []);

  // Listen for storage changes from other tabs
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === CF_TOKEN_KEY) {
        setToken(e.newValue);
        if (!e.newValue) setUser(null);
      }
      if (e.key === CF_USER_KEY) {
        setUser(e.newValue ? JSON.parse(e.newValue) : null);
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoggedIn: !!token,
        isAdmin: user?.isAdmin ?? false,
        oauthPending: localStorage.getItem(CF_OAUTH_PENDING_KEY),
        login,
        register,
        oauthLogin,
        resendConfirmation,
        logout,
        setOAuthPending,
        clearOAuthPending,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
