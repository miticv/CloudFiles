import { usePageTitle } from '@/hooks/use-page-title';
import { CloudOff, Apple } from 'lucide-react';

export function Component() {
  usePageTitle('Apple iCloud Drive');

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-100 mb-6">
          <CloudOff className="w-8 h-8 text-slate-400" />
        </div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight mb-1">
          Apple iCloud Drive
        </h1>
        <p className="text-lg font-medium text-primary mb-4">Coming Soon</p>
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-5 py-4 text-sm text-amber-800 leading-relaxed">
          <div className="flex items-start gap-3">
            <Apple className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p>
              Apple does not currently provide a public REST API for iCloud Drive.
              We are monitoring Apple's developer platform for any changes. This
              feature will become available once Apple opens access to iCloud
              Drive through a supported API.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export { Component as AppleDrivePage };
export default Component;
