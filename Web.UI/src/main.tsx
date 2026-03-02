import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider } from '@/auth/auth-context';
import { OidcProvider } from '@/auth/oidc-provider';
import { router } from '@/router';
import '@/styles/globals.css';

// Initialize axios interceptor (side-effect import)
import '@/auth/axios-client';

// Auto-reload when a deployment makes old chunks unavailable
window.addEventListener('vite:preloadError', () => {
  const lastReload = sessionStorage.getItem('chunk_reload');
  if (!lastReload || Date.now() - Number(lastReload) > 10_000) {
    sessionStorage.setItem('chunk_reload', Date.now().toString());
    window.location.reload();
  }
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <OidcProvider>
          <TooltipProvider delayDuration={300}>
            <RouterProvider router={router} />
          </TooltipProvider>
        </OidcProvider>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>
);
