import { useNavigate } from 'react-router';
import { usePageTitle } from '@/hooks/use-page-title';
import { Button } from '@/components/ui/button';
import { Search, Home } from 'lucide-react';

export function Component() {
  usePageTitle('Page Not Found');

  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50 px-4">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-100 mb-6">
          <Search className="w-8 h-8 text-slate-400" />
        </div>
        <p className="text-6xl font-bold text-muted-foreground/30 mb-4">404</p>
        <h1 className="text-2xl font-bold text-foreground tracking-tight mb-2">
          Page Not Found
        </h1>
        <p className="text-muted-foreground mb-8">
          The page you are looking for does not exist or has been moved.
        </p>
        <Button onClick={() => navigate('/')} size="lg">
          <Home className="w-4 h-4 mr-2" />
          Go Home
        </Button>
      </div>
    </div>
  );
}

export { Component as NotFoundPage };
export default Component;
