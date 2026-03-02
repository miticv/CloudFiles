import { useState } from 'react';
import { usePageTitle } from '@/hooks/use-page-title';
import { useOidc } from '@/auth/oidc-provider';
import { startPCloudLogin } from '@/auth/pcloud-auth';
import { usePCloudFolder } from '@/api/pcloud.api';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn, formatFileSize, getFileExtension, getFileTypeBadgeColor } from '@/lib/utils';
import { FolderOpen, FileText, ChevronRight, RotateCcw, ArrowLeft, CloudOff } from 'lucide-react';
import { isAxiosError } from 'axios';

interface BreadcrumbEntry {
  folderId: number;
  name: string;
}

function NotConnected({ onConnect }: { onConnect: () => void }) {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="text-center space-y-4 max-w-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
          <CloudOff className="h-8 w-8 text-slate-400" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-lg font-semibold text-foreground">pCloud not connected</h2>
          <p className="text-sm text-muted-foreground">
            Connect your pCloud account to browse your files.
          </p>
        </div>
        <Button onClick={onConnect}>
          <FolderOpen className="h-4 w-4" />
          Connect pCloud
        </Button>
      </div>
    </div>
  );
}

export function Component() {
  usePageTitle('pCloud');

  const { providers } = useOidc();
  const pcloudConnected = providers.find((p) => p.configId === 'pcloud')?.authenticated ?? false;

  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbEntry[]>([{ folderId: 0, name: 'Root' }]);
  const currentFolder = breadcrumbs[breadcrumbs.length - 1];

  const { data, isLoading, error, refetch } = usePCloudFolder(currentFolder.folderId, pcloudConnected);

  function navigateToFolder(folderId: number, folderName: string) {
    setBreadcrumbs((prev) => [...prev, { folderId, name: folderName }]);
  }

  function navigateToBreadcrumb(index: number) {
    setBreadcrumbs((prev) => prev.slice(0, index + 1));
  }

  if (!pcloudConnected) {
    return <NotConnected onConnect={() => startPCloudLogin()} />;
  }

  const items = data?.items ?? [];
  const folders = items.filter((i) => i.isFolder);
  const files = items.filter((i) => !i.isFolder);

  return (
    <div className="h-full overflow-auto">
      <div className="space-y-4 p-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          {breadcrumbs.length > 1 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigateToBreadcrumb(breadcrumbs.length - 2)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-foreground">pCloud</h1>
            {/* Breadcrumbs */}
            <nav className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5 overflow-x-auto">
              {breadcrumbs.map((entry, index) => (
                <span key={entry.folderId} className="flex items-center gap-1 shrink-0">
                  {index > 0 && <ChevronRight className="h-3 w-3" />}
                  <button
                    onClick={() => navigateToBreadcrumb(index)}
                    className={cn(
                      'hover:text-foreground transition-colors cursor-pointer',
                      index === breadcrumbs.length - 1 && 'text-foreground font-medium'
                    )}
                  >
                    {entry.name}
                  </button>
                </span>
              ))}
            </nav>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RotateCcw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
            Refresh
          </Button>
        </div>

        {/* Loading */}
        {isLoading && items.length === 0 && (
          <div className="flex items-center justify-center py-16">
            <div className="text-center space-y-3">
              <Spinner size={24} />
              <p className="text-sm text-muted-foreground">Loading files...</p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <p className="font-medium">Failed to load pCloud files.</p>
            {isAxiosError(error) && error.response?.data && (
              <p className="mt-1 text-xs text-red-600">
                {typeof error.response.data === 'string'
                  ? error.response.data
                  : JSON.stringify(error.response.data)}
              </p>
            )}
          </div>
        )}

        {/* Empty */}
        {!isLoading && !error && items.length === 0 && (
          <div className="text-center py-16">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 mb-3">
              <FolderOpen className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-sm text-muted-foreground">This folder is empty.</p>
          </div>
        )}

        {/* Content */}
        {items.length > 0 && (
          <div className="rounded-xl border border-border bg-card shadow-[var(--shadow-card)] overflow-hidden">
            {/* Summary header */}
            <div className="px-4 py-2 border-b border-border bg-muted/50">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {folders.length > 0 && files.length > 0
                  ? `${folders.length} folders, ${files.length} files`
                  : folders.length > 0
                    ? `${folders.length} folders`
                    : `${files.length} files`}
              </span>
            </div>

            {/* Folders */}
            {folders.length > 0 && (
              <div className="divide-y divide-border">
                {folders.map((folder) => (
                  <button
                    key={folder.folderId}
                    onClick={() => navigateToFolder(folder.folderId, folder.name)}
                    className="flex items-center gap-3 px-4 py-2.5 w-full text-left transition-colors hover:bg-muted/50 group cursor-pointer"
                  >
                    <FolderOpen className="h-4 w-4 text-indigo-500 shrink-0" />
                    <span className="text-sm font-medium text-foreground truncate flex-1">
                      {folder.name}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </button>
                ))}
              </div>
            )}

            {/* Separator */}
            {folders.length > 0 && files.length > 0 && (
              <div className="border-t border-border" />
            )}

            {/* Files */}
            {files.length > 0 && (
              <div className="divide-y divide-border">
                {files.map((file) => {
                  const ext = getFileExtension(file.name);
                  return (
                    <div
                      key={file.fileId}
                      className="flex items-center gap-3 px-4 py-2.5"
                    >
                      <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                      <span className="text-sm text-foreground truncate flex-1">{file.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatFileSize(file.size)}
                      </span>
                      {ext && (
                        <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-md shrink-0', getFileTypeBadgeColor(ext))}>
                          {ext.toUpperCase()}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export { Component as PCloudPage };
export default Component;
