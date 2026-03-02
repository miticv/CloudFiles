import { useState, useCallback } from 'react';
import { usePageTitle } from '@/hooks/use-page-title';
import { useOidc } from '@/auth/oidc-provider';
import { startDropboxLogin } from '@/auth/dropbox-auth';
import { useDropboxFolder } from '@/api/dropbox.api';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner } from '@/components/ui/spinner';
import { FileDetailSheet } from '@/components/file-detail-sheet';
import type { FilePreviewInfo } from '@/components/file-detail-sheet';
import { cn, formatFileSize, getFileExtension, getFileTypeBadgeColor } from '@/lib/utils';
import { FolderOpen, FileText, ChevronRight, RotateCcw, ArrowLeft, CloudOff, CheckSquare, X } from 'lucide-react';
import { isAxiosError } from 'axios';
import { CopyToAzureDialog } from './copy-to-azure-dialog';
import { CopyToGcsDialog } from './copy-to-gcs-dialog';
import { CopyToGooglePhotosDialog } from './copy-to-google-photos-dialog';
import { CopyToGoogleDriveDialog } from './copy-to-google-drive-dialog';

interface BreadcrumbEntry {
  path: string;
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
          <h2 className="text-lg font-semibold text-foreground">Dropbox not connected</h2>
          <p className="text-sm text-muted-foreground">
            Connect your Dropbox account to browse your files.
          </p>
        </div>
        <Button onClick={onConnect}>
          <FolderOpen className="h-4 w-4" />
          Connect Dropbox
        </Button>
      </div>
    </div>
  );
}

export function Component() {
  usePageTitle('Dropbox');

  const { providers } = useOidc();
  const dropboxConnected = providers.find((p) => p.configId === 'dropbox')?.authenticated ?? false;

  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbEntry[]>([{ path: '', name: 'Dropbox' }]);
  const currentFolder = breadcrumbs[breadcrumbs.length - 1];

  const { data, isLoading, error, refetch } = useDropboxFolder(currentFolder.path, dropboxConnected);

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [selectedFolders, setSelectedFolders] = useState<Set<string>>(new Set());
  const [previewFile, setPreviewFile] = useState<FilePreviewInfo | null>(null);
  const [azureDialogOpen, setAzureDialogOpen] = useState(false);
  const [gcsDialogOpen, setGcsDialogOpen] = useState(false);
  const [photosDialogOpen, setPhotosDialogOpen] = useState(false);
  const [driveDialogOpen, setDriveDialogOpen] = useState(false);

  const toggleItem = useCallback(<T,>(id: T, set: React.Dispatch<React.SetStateAction<Set<T>>>) => {
    set((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const totalSelected = selectedFiles.size + selectedFolders.size;

  function toggleSelectionMode() {
    setSelectionMode((prev) => !prev);
    setSelectedFiles(new Set());
    setSelectedFolders(new Set());
  }

  function clearSelection() {
    setSelectedFiles(new Set());
    setSelectedFolders(new Set());
  }

  function navigateToFolder(path: string, folderName: string) {
    setBreadcrumbs((prev) => [...prev, { path, name: folderName }]);
    setSelectedFiles(new Set());
    setSelectedFolders(new Set());
  }

  function navigateToBreadcrumb(index: number) {
    setBreadcrumbs((prev) => prev.slice(0, index + 1));
    setSelectedFiles(new Set());
    setSelectedFolders(new Set());
  }

  if (!dropboxConnected) {
    return <NotConnected onConnect={() => startDropboxLogin()} />;
  }

  const items = data?.items ?? [];
  const folders = items.filter((i) => i.isFolder);
  const files = items.filter((i) => !i.isFolder);

  const selectedFileObjects = files.filter((f) => selectedFiles.has(f.pathLower));
  const selectedFolderObjects = folders.filter((f) => selectedFolders.has(f.pathLower));

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-auto space-y-4 p-6">
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
            <h1 className="text-xl font-bold tracking-tight text-foreground">Dropbox</h1>
            {/* Breadcrumbs */}
            <nav className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5 overflow-x-auto">
              {breadcrumbs.map((entry, index) => (
                <span key={entry.path || 'root'} className="flex items-center gap-1 shrink-0">
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
            <Button
              variant={selectionMode ? 'default' : 'outline'}
              size="sm"
              onClick={toggleSelectionMode}
              className="gap-1.5"
            >
              <CheckSquare className="h-4 w-4" />
              {selectionMode ? 'Exit Selection' : 'Select'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
              <RotateCcw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
              Refresh
            </Button>
          </div>
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
            <p className="font-medium">Failed to load Dropbox files.</p>
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
            {/* Folders */}
            {folders.length > 0 && (
              <div>
                <div className="px-4 py-2 border-b border-border bg-muted/50">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Folders ({folders.length})
                  </span>
                </div>
                <div className="divide-y divide-border">
                  {folders.map((folder) => {
                    const folderSelected = selectedFolders.has(folder.pathLower);
                    return (
                      <button
                        key={folder.pathLower}
                        onClick={() => {
                          if (selectionMode) {
                            toggleItem(folder.pathLower, setSelectedFolders);
                          } else {
                            navigateToFolder(folder.pathDisplay, folder.name);
                          }
                        }}
                        className={cn(
                          'flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-accent cursor-pointer group',
                          folderSelected && 'bg-indigo-50/50'
                        )}
                      >
                        {selectionMode && (
                          <Checkbox
                            checked={folderSelected}
                            onCheckedChange={() => toggleItem(folder.pathLower, setSelectedFolders)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                        <FolderOpen className="h-4 w-4 text-indigo-500 shrink-0" />
                        <span className="text-sm font-medium text-foreground truncate flex-1">
                          {folder.name}
                        </span>
                        {!selectionMode && (
                          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Separator */}
            {folders.length > 0 && files.length > 0 && (
              <div className="border-t border-border" />
            )}

            {/* Files */}
            {files.length > 0 && (
              <div>
                <div className="px-4 py-2 border-b border-border bg-muted/50">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Files ({files.length})
                  </span>
                </div>
                <div className="divide-y divide-border">
                  {files.map((file) => {
                    const ext = getFileExtension(file.name);
                    const fileSelected = selectedFiles.has(file.pathLower);
                    return (
                      <button
                        key={file.pathLower}
                        onClick={() => {
                          if (selectionMode) {
                            toggleItem(file.pathLower, setSelectedFiles);
                          } else {
                            setPreviewFile({
                              name: file.name,
                              path: file.pathDisplay,
                              size: file.size,
                              lastModified: file.serverModified,
                            });
                          }
                        }}
                        className={cn(
                          'flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-accent cursor-pointer',
                          fileSelected && 'bg-indigo-50/50'
                        )}
                      >
                        {selectionMode && (
                          <Checkbox
                            checked={fileSelected}
                            onCheckedChange={() => toggleItem(file.pathLower, setSelectedFiles)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
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
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* File Detail Sheet */}
      <FileDetailSheet
        open={previewFile !== null}
        onClose={() => setPreviewFile(null)}
        file={previewFile}
      />

      {/* Bottom Selection Bar */}
      {selectionMode && totalSelected > 0 && (
        <div className="border-t border-border bg-card px-6 py-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-foreground">
              {selectedFiles.size > 0 && `${selectedFiles.size} file${selectedFiles.size !== 1 ? 's' : ''}`}
              {selectedFiles.size > 0 && selectedFolders.size > 0 && ' and '}
              {selectedFolders.size > 0 && `${selectedFolders.size} folder${selectedFolders.size !== 1 ? 's' : ''}`}
              {' '}selected
            </span>
            <Button variant="ghost" size="sm" onClick={clearSelection} className="gap-1 text-muted-foreground">
              <X className="h-3.5 w-3.5" />
              Clear
            </Button>
            <div className="flex-1" />
            <Button size="sm" onClick={() => setAzureDialogOpen(true)}>Copy to Azure</Button>
            <Button size="sm" variant="outline" onClick={() => setGcsDialogOpen(true)}>Copy to GCS</Button>
            <Button size="sm" variant="outline" onClick={() => setPhotosDialogOpen(true)}>Copy to Google Photos</Button>
            <Button size="sm" variant="outline" onClick={() => setDriveDialogOpen(true)}>Copy to Google Drive</Button>
          </div>
        </div>
      )}

      {/* Copy Dialogs */}
      <CopyToAzureDialog
        open={azureDialogOpen}
        onOpenChange={setAzureDialogOpen}
        selectedFiles={selectedFileObjects}
        selectedFolders={selectedFolderObjects}
        onSuccess={() => {
          setSelectedFiles(new Set());
          setSelectedFolders(new Set());
        }}
      />
      <CopyToGcsDialog
        open={gcsDialogOpen}
        onOpenChange={setGcsDialogOpen}
        selectedFiles={selectedFileObjects}
        selectedFolders={selectedFolderObjects}
        onSuccess={() => {
          setSelectedFiles(new Set());
          setSelectedFolders(new Set());
        }}
      />
      <CopyToGooglePhotosDialog
        open={photosDialogOpen}
        onOpenChange={setPhotosDialogOpen}
        selectedFiles={selectedFileObjects}
        selectedFolders={selectedFolderObjects}
        onSuccess={() => {
          setSelectedFiles(new Set());
          setSelectedFolders(new Set());
        }}
      />
      <CopyToGoogleDriveDialog
        open={driveDialogOpen}
        onOpenChange={setDriveDialogOpen}
        selectedFiles={selectedFileObjects}
        selectedFolders={selectedFolderObjects}
        onSuccess={() => {
          setSelectedFiles(new Set());
          setSelectedFolders(new Set());
        }}
      />
    </div>
  );
}

export { Component as DropboxPage };
export default Component;
