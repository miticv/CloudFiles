import { Navigate, Outlet } from 'react-router';
import { useAuth } from './auth-context';

export function AdminGuard() {
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return <Navigate to="/file-manager" replace />;
  }

  return <Outlet />;
}
