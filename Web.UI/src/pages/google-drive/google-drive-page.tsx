import { useState, useMemo } from 'react';
import { usePageTitle } from '@/hooks/use-page-title';
import { useOidc } from '@/auth/oidc-provider';
import { useDriveFiles } from '@/api/google-drive.api';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { cn, formatFileSize, getFileExtension, getFileTypeBadgeColor } from '@/lib/utils';
import { FolderOpen, FileText, ChevronRight, RotateCcw, ArrowLeft, CloudOff, Upload } from 'lucide-react';
import { isAxiosError } from 'axios';

// Google Docs MIME types that cannot be downloaded/copied
const GOOGLE_DOCS_MIMES = new Set([
  'application/vnd.google-apps.document',
  'application/vnd.google-apps.spreadsheet',
  'application/vnd.google-apps.presentation',
  'application/vnd.google-apps.form',
  'application/vnd.google-apps.drawing',
  'application/vnd.google-apps.site',
  'application/vnd.google-apps.script',
  'application/vnd.google-apps.jam',
  'application/vnd.google-apps.map',
]);

const GOOGLE_FOLDER_MIME = 'application/vnd.google-apps.folder';

interface BreadcrumbEntry {
  id: string;
  name: string;
}

// ─── Not-Connected State ───
function NotConnected({ onConnect }: { onConnect: () => void }) {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="text-center space-y-4 max-w-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
          <CloudOff className="h-8 w-8 text-slate-400" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-lg font-semibold text-foreground">Google not connected</h2>
          <p className="text-sm text-muted-foreground">
            Connect your Google account to browse files stored in Google Drive.
          </p>
        </div>
        <Button onClick={onConnect}>
          <FolderOpen className="h-4 w-4" />
          Connect Google
        </Button>
      </div>
    </div>
  );
}

// ─── Main Component ───
export function Component() {
  usePageTitle('Google Drive');

  const { providers, login } = useOidc();
  const googleConnected = providers.find((p) => p.configId === 'google')?.authenticated ?? false;

  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbEntry[]>([{ id: 'root', name: 'My Drive' }]);
  const [pageToken, setPageToken] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [accumulatedNextToken, setAccumulatedNextToken] = useState<string | null>(null);

  const currentFolder = breadcrumbs[breadcrumbs.length - 1];

  const { data, isLoading, error, refetch } = useDriveFiles(currentFolder.id, pageToken);

  // Accumulate files across "Load More" pages
  const [accumulatedFiles, setAccumulatedFiles] = useState<typeof data>({ files: [], nextPageToken: null });

  // Merge new data when it arrives
  const allFiles = useMemo(() => {
    if (!data) return accumulatedFiles?.files ?? [];
    if (!pageToken) return data.files;
    // Merge accumulated + new page
    const merged = [...(accumulatedFiles?.files ?? [])];
    const existingIds = new Set(merged.map((f) => f.id));
    for (const file of data.files) {
      if (!existingIds.has(file.id)) {
        merged.push(file);
      }
    }
    return merged;
  }, [data, accumulatedFiles, pageToken]);

  const effectiveNextToken = data?.nextPageToken ?? accumulatedNextToken;

  // Categorize files
  const folders = allFiles.filter((f) => f.mimeType === GOOGLE_FOLDER_MIME);
  const regularFiles = allFiles.filter((f) => f.mimeType !== GOOGLE_FOLDER_MIME && !GOOGLE_DOCS_MIMES.has(f.mimeType));
  const googleDocsFiles = allFiles.filter((f) => GOOGLE_DOCS_MIMES.has(f.mimeType));
  const selectableFiles = regularFiles;

  const allSelected = selectableFiles.length > 0 && selectableFiles.every((f) => selectedFiles.has(f.id));

  function navigateToFolder(folderId: string, folderName: string) {
    setBreadcrumbs((prev) => [...prev, { id: folderId, name: folderName }]);
    setPageToken(null);
    setAccumulatedFiles({ files: [], nextPageToken: null });
    setAccumulatedNextToken(null);
    setSelectedFiles(new Set());
  }

  function navigateToBreadcrumb(index: number) {
    setBreadcrumbs((prev) => prev.slice(0, index + 1));
    setPageToken(null);
    setAccumulatedFiles({ files: [], nextPageToken: null });
    setAccumulatedNextToken(null);
    setSelectedFiles(new Set());
  }

  function handleLoadMore() {
    if (!data) return;
    // Save current accumulated state before loading next page
    setAccumulatedFiles({ files: allFiles, nextPageToken: data.nextPageToken });
    setAccumulatedNextToken(data.nextPageToken);
    setPageToken(data.nextPageToken);
  }

  function toggleFile(fileId: string) {
    setSelectedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(fileId)) {
        next.delete(fileId);
      } else {
        next.add(fileId);
      }
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedFiles((prev) => {
      if (selectableFiles.every((f) => prev.has(f.id))) {
        const next = new Set(prev);
        for (const f of selectableFiles) next.delete(f.id);
        return next;
      }
      const next = new Set(prev);
      for (const f of selectableFiles) next.add(f.id);
      return next;
    });
  }

  if (!googleConnected) {
    return <NotConnected onConnect={() => login('google')} />;
  }

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
            <h1 className="text-xl font-bold tracking-tight text-foreground">Google Drive</h1>
            {/* Breadcrumbs */}
            <nav className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5 overflow-x-auto">
              {breadcrumbs.map((entry, index) => (
                <span key={entry.id} className="flex items-center gap-1 shrink-0">
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
          <div className="flex items-center gap-2 shrink-0">
            {selectedFiles.size > 0 && (
              <Button size="sm">
                <Upload className="h-3.5 w-3.5" />
                Copy to Azure ({selectedFiles.size})
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
              <RotateCcw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Loading (initial) */}
        {isLoading && allFiles.length === 0 && (
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
            <p className="font-medium">Failed to load Drive files.</p>
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
        {!isLoading && !error && allFiles.length === 0 && (
          <div className="text-center py-16">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 mb-3">
              <FolderOpen className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-sm text-muted-foreground">This folder is empty.</p>
          </div>
        )}

        {/* Content */}
        {allFiles.length > 0 && (
          <div className="rounded-xl border border-border bg-card shadow-[var(--shadow-card)] overflow-hidden">
            {/* Folders */}
            {folders.length > 0 && (
              <div>
                <div className="px-4 py-2 border-b border-border bg-muted/50">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Folders ({folders.length})
                  </span>
                </div>
                <div className="divide-y divide-border">
                  {folders.map((folder) => (
                    <button
                      key={folder.id}
                      onClick={() => navigateToFolder(folder.id, folder.name)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-accent cursor-pointer group"
                    >
                      <FolderOpen className="h-4 w-4 text-indigo-500 shrink-0" />
                      <span className="text-sm font-medium text-foreground truncate">{folder.name}</span>
                      <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Selectable files */}
            {selectableFiles.length > 0 && (
              <div>
                <div className="px-4 py-2 border-b border-border bg-muted/50 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Files ({selectableFiles.length})
                  </span>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="select-all-drive"
                      checked={allSelected}
                      onCheckedChange={toggleSelectAll}
                    />
                    <label htmlFor="select-all-drive" className="text-xs text-muted-foreground cursor-pointer">
                      Select All
                    </label>
                  </div>
                </div>
                <div className="divide-y divide-border">
                  {selectableFiles.map((file) => {
                    const ext = getFileExtension(file.name);
                    const selected = selectedFiles.has(file.id);
                    return (
                      <div
                        key={file.id}
                        className={cn(
                          'flex items-center gap-3 px-4 py-2.5 transition-colors',
                          selected && 'bg-indigo-50/50'
                        )}
                      >
                        <Checkbox
                          checked={selected}
                          onCheckedChange={() => toggleFile(file.id)}
                        />
                        <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                        <span className="text-sm text-foreground truncate flex-1">{file.name}</span>
                        <span className="text-xs text-muted-foreground shrink-0">{formatFileSize(file.size)}</span>
                        {ext && (
                          <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-md shrink-0', getFileTypeBadgeColor(ext))}>
                            {ext.toUpperCase()}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Google Docs files (non-selectable) */}
            {googleDocsFiles.length > 0 && (
              <div>
                <div className="px-4 py-2 border-b border-border bg-muted/50">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Google Docs ({googleDocsFiles.length})
                  </span>
                </div>
                <div className="divide-y divide-border">
                  {googleDocsFiles.map((file) => {
                    const typeLabel = file.mimeType.replace('application/vnd.google-apps.', '');
                    return (
                      <div
                        key={file.id}
                        className="flex items-center gap-3 px-4 py-2.5 opacity-50"
                      >
                        <div className="w-4" /> {/* spacer for alignment with checkboxes */}
                        <FileText className="h-4 w-4 text-slate-300 shrink-0" />
                        <span className="text-sm text-muted-foreground truncate flex-1">{file.name}</span>
                        <Badge variant="secondary" className="text-[10px] shrink-0">
                          {typeLabel}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground italic shrink-0">(cannot be copied)</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Load More */}
        {effectiveNextToken && (
          <div className="flex justify-center pt-2 pb-4">
            <Button
              variant="outline"
              onClick={handleLoadMore}
              disabled={isLoading}
            >
              {isLoading && pageToken ? (
                <>
                  <Spinner size={14} />
                  Loading more...
                </>
              ) : (
                'Load More'
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export { Component as GoogleDrivePage };
export default Component;
