import { createBrowserRouter, Navigate } from 'react-router';
import { AppLayout } from '@/layouts/app-layout';
import { AuthLayout } from '@/layouts/auth-layout';
import { AuthGuard } from '@/auth/auth-guard';
import { AdminGuard } from '@/auth/admin-guard';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/file-manager" replace />,
  },
  {
    // Public routes
    element: <AuthLayout />,
    children: [
      {
        path: 'sessions/login',
        lazy: () => import('@/pages/login/login-page'),
      },
      {
        path: 'sessions/404',
        lazy: () => import('@/pages/error/not-found-page'),
      },
      {
        path: 'sessions/error',
        lazy: () => import('@/pages/error/error-page'),
      },
      {
        path: 'privacy',
        lazy: () => import('@/pages/legal/privacy-page'),
      },
      {
        path: 'terms',
        lazy: () => import('@/pages/legal/terms-page'),
      },
    ],
  },
  {
    // Protected routes
    element: (
      <AuthGuard>
        <AppLayout />
      </AuthGuard>
    ),
    children: [
      {
        path: 'file-manager',
        lazy: () => import('@/pages/file-manager/file-manager-page'),
      },
      {
        path: 'storage-browser',
        lazy: () => import('@/pages/storage-browser/storage-browser-page'),
      },
      {
        path: 'google-storage',
        lazy: () => import('@/pages/google-storage/google-storage-page'),
      },
      {
        path: 'google-drive',
        lazy: () => import('@/pages/google-drive/google-drive-page'),
      },
      {
        path: 'google-photos',
        lazy: () => import('@/pages/google-photos/google-photos-page'),
      },
      {
        path: 'apple-drive',
        lazy: () => import('@/pages/apple-drive/apple-drive-page'),
      },
      {
        path: 'processes',
        lazy: () => import('@/pages/processes/processes-page'),
      },
      {
        path: 'connections',
        lazy: () => import('@/pages/connections/connections-page'),
      },
      {
        element: <AdminGuard />,
        children: [
          {
            path: 'admin/users',
            lazy: () => import('@/pages/admin/admin-users-page'),
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/sessions/404" replace />,
  },
]);
