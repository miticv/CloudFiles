import { Navigate, useLocation } from 'react-router';
import { useAuth } from './auth-context';
import { useOidc } from './oidc-provider';
import { Spinner } from '@/components/ui/spinner';
import type { ReactNode } from 'react';

export function AuthGuard({ children }: { children: ReactNode }) {
  const { isLoggedIn } = useAuth();
  const { isAnyAuthenticated, ready } = useOidc();
  const location = useLocation();

  if (!isLoggedIn) {
    localStorage.setItem('redirect', location.pathname);
    return <Navigate to="/sessions/login" replace />;
  }

  // Connections page only needs JWT, not OIDC
  if (location.pathname.startsWith('/connections')) {
    return <>{children}</>;
  }

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner size={32} />
      </div>
    );
  }

  if (!isAnyAuthenticated) {
    localStorage.setItem('redirect', location.pathname);
    return <Navigate to="/connections" replace />;
  }

  return <>{children}</>;
}
