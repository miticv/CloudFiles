import { Navigate, useLocation } from 'react-router';
import { useAuth } from './auth-context';
import type { ReactNode } from 'react';

export function AuthGuard({ children }: { children: ReactNode }) {
  const { isLoggedIn } = useAuth();
  const location = useLocation();

  if (!isLoggedIn) {
    localStorage.setItem('redirect', location.pathname);
    return <Navigate to="/sessions/login" replace />;
  }

  return <>{children}</>;
}
