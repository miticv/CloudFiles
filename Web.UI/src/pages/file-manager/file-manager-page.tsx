import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { usePageTitle } from '@/hooks/use-page-title';
import { useFileManagerStore } from '@/stores/file-manager.store';
import { useFolder, useFileDetail } from '@/api/file-manager.api';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { FileDetailSheet } from '@/components/file-detail-sheet';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn, formatFileSize, getFileExtension, getFileTypeBadgeColor } from '@/lib/utils';
import {
  Folder,
  FileText,
  ChevronRight,
  CheckSquare,
  RotateCcw,
  X,
  AlertCircle,
  FolderOpen,
  Image as ImageIcon,
  Upload,
  ArrowRight,
  Cloudy,
  Cloud,
} from 'lucide-react';
import type { FileItem, StorageContext } from '@/api/types';
import { CopyToDropboxDialog } from './copy-to-dropbox-dialog';
import { CopyToGoogleDriveDialog } from './copy-to-google-drive-dialog';

// ─── Helpers ───

function readContext(): StorageContext {
  try {
    const raw = sessionStorage.getItem('fm_context');
    if (raw) return JSON.parse(raw) as StorageContext;
  } catch {
    /* ignore */
  }
  return { provider: 'azure' };
}

function buildBreadcrumbs(context: StorageContext, pathSegments: string[]) {
  const crumbs: { label: string; path: string | null }[] = [];

  if (context.account) {
    crumbs.push({ label: context.account, path: '' });
  }
  if (context.container) {
    crumbs.push({ label: context.container, path: '' });
  }
  if (context.bucket) {
    crumbs.push({ label: context.bucket, path: '' });
  }

  let accumulated = '';
  for (const segment of pathSegments) {
    accumulated = accumulated ? `${accumulated}/${segment}` : segment;
    crumbs.push({ label: segment, path: accumulated });
  }

  return crumbs;
}

// ─── Component ───

export function Component() {
  usePageTitle('File Manager');

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  // Store state
  const {
    context,
    currentPath,
    items,
    currentFile,
    showDetail,
    error,
    selectionMode,
    selectedFiles,
    selectedFolders,
    setContext,
    setItems,
    setError,
    setCurrentFile,
    closeDetail,
    toggleSelectionMode,
    toggleFileSelection,
    toggleFolderSelection,
    clearSelection,
  } = useFileManagerStore();

  // Detail file path for query
  const [detailPath, setDetailPath] = useState<string | null>(null);

  // Copy dialog state
  const [copyToDropboxOpen, setCopyToDropboxOpen] = useState(false);
  const [copyToDriveOpen, setCopyToDriveOpen] = useState(false);

  // Read context from session storage on mount
  useEffect(() => {
    const ctx = readContext();
    setContext(ctx);
  }, [setContext]);

  // Current path from URL
  const pathParam = searchParams.get('path');

  // Data fetching
  const {
    data: folderData,
    isLoading,
    isError,
    error: queryError,
    refetch,
  } = useFolder(pathParam, context, !!context.provider);

  const {
    data: fileDetailData,
  } = useFileDetail(detailPath, context, !!detailPath);

  // Sync folder data to store
  useEffect(() => {
    if (folderData) {
      setItems(folderData, pathParam);
    }
  }, [folderData, pathParam, setItems]);

  // Sync query error to store
  useEffect(() => {
    if (isError && queryError) {
      const msg = queryError instanceof Error ? queryError.message : 'Failed to load files';
      setError(msg);
    }
  }, [isError, queryError, setError]);

  // Sync file detail data to store
  useEffect(() => {
    if (fileDetailData) {
      setCurrentFile(fileDetailData);
    }
  }, [fileDetailData, setCurrentFile]);

  // ─── Handlers ───

  const handleNavigateToFolder = useCallback(
    (folderPath: string) => {
      setSearchParams({ path: folderPath });
    },
    [setSearchParams],
  );

  const handleBreadcrumbClick = useCallback(
    (path: string | null) => {
      if (path === null) return;
      if (path === '') {
        setSearchParams({});
      } else {
        setSearchParams({ path });
      }
    },
    [setSearchParams],
  );

  const handleFileClick = useCallback((file: FileItem) => {
    setDetailPath(file.itemPath);
  }, []);

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['files', 'folder'] });
    refetch();
  }, [queryClient, refetch]);

  const handleCloseDetail = useCallback(() => {
    closeDetail();
    setDetailPath(null);
  }, [closeDetail]);

  // ─── Derived state ───

  const folders = items?.filter((i) => i.isFolder) ?? [];
  const files = items?.filter((i) => !i.isFolder) ?? [];
  const breadcrumbs = buildBreadcrumbs(context, currentPath);
  const totalSelected = selectedFiles.size + selectedFolders.size;
  const providerLabel = context.provider === 'azure' ? 'Azure Blob' : 'Google Cloud';

  const selectedFileObjects = useMemo(
    () =>
      (items ?? []).filter(
        (i) => selectedFiles.has(i.itemPath) || selectedFolders.has(i.itemPath),
      ),
    [items, selectedFiles, selectedFolders],
  );

  const handleCopySuccess = useCallback(() => {
    clearSelection();
  }, [clearSelection]);

  // ─── Render ───

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-foreground">File Manager</h1>
            <Badge variant={context.provider === 'azure' ? 'info' : 'warning'}>
              {providerLabel}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={selectionMode ? 'default' : 'outline'}
              size="sm"
              onClick={toggleSelectionMode}
              className="gap-1.5"
            >
              <CheckSquare className="h-4 w-4" />
              {selectionMode ? 'Exit Selection' : 'Select'}
            </Button>

            <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-1.5">
              <RotateCcw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Breadcrumbs */}
        {breadcrumbs.length > 0 && (
          <nav className="mt-3 flex items-center gap-1 text-sm">
            <button
              onClick={() => handleBreadcrumbClick('')}
              className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              Root
            </button>
            {breadcrumbs.map((crumb, idx) => (
              <span key={idx} className="flex items-center gap-1">
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
                {idx === breadcrumbs.length - 1 ? (
                  <span className="font-medium text-foreground">{crumb.label}</span>
                ) : (
                  <button
                    onClick={() => handleBreadcrumbClick(crumb.path)}
                    className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    {crumb.label}
                  </button>
                )}
              </span>
            ))}
          </nav>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center gap-3 py-24">
            <Spinner size={28} />
            <p className="text-sm text-muted-foreground">Loading files...</p>
          </div>
        )}

        {/* Error */}
        {!isLoading && error && (
          <div className="flex flex-col items-center justify-center gap-4 py-24">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-7 w-7 text-destructive" />
            </div>
            <div className="text-center">
              <p className="font-medium text-foreground">Failed to load files</p>
              <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-1.5">
              <RotateCcw className="h-4 w-4" />
              Retry
            </Button>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && items && items.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-24">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <FolderOpen className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="font-medium text-foreground">No items found</p>
            <p className="text-sm text-muted-foreground">This folder is empty.</p>
          </div>
        )}

        {/* Files and Folders grid */}
        {!isLoading && !error && items && items.length > 0 && (
          <div className="space-y-6">
            {/* Folders */}
            {folders.length > 0 && (
              <div>
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Folders ({folders.length})
                </h2>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
                  {folders.map((folder) => {
                    const isSelected = selectedFolders.has(folder.itemPath);
                    return (
                      <Tooltip key={folder.itemPath}>
                        <TooltipTrigger asChild>
                          <button
                            className={cn(
                              'group relative flex h-[140px] w-full flex-col items-center justify-center gap-2 rounded-lg border bg-card p-3 transition-colors hover:border-indigo-300 hover:bg-indigo-50/50 cursor-pointer',
                              isSelected && 'border-indigo-400 bg-indigo-50 ring-1 ring-indigo-400/30',
                            )}
                            onClick={() => {
                              if (selectionMode) {
                                toggleFolderSelection(folder.itemPath);
                              } else {
                                handleNavigateToFolder(folder.itemPath);
                              }
                            }}
                          >
                            {selectionMode && (
                              <div className="absolute left-2 top-2">
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => toggleFolderSelection(folder.itemPath)}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                            )}
                            <Folder className="h-10 w-10 text-amber-500" />
                            <span className="w-full truncate text-center text-xs font-medium text-foreground">
                              {folder.itemName}
                            </span>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>{folder.itemName}</TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Files */}
            {files.length > 0 && (
              <div>
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Files ({files.length})
                </h2>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
                  {files.map((file) => {
                    const ext = getFileExtension(file.itemName);
                    const badgeColor = getFileTypeBadgeColor(ext);
                    const isSelected = selectedFiles.has(file.itemPath);
                    return (
                      <Tooltip key={file.itemPath}>
                        <TooltipTrigger asChild>
                          <button
                            className={cn(
                              'group relative flex h-[140px] w-full flex-col items-center justify-center gap-2 rounded-lg border bg-card p-3 transition-colors hover:border-indigo-300 hover:bg-indigo-50/50 cursor-pointer',
                              isSelected && 'border-indigo-400 bg-indigo-50 ring-1 ring-indigo-400/30',
                            )}
                            onClick={() => {
                              if (selectionMode) {
                                toggleFileSelection(file.itemPath);
                              } else {
                                handleFileClick(file);
                              }
                            }}
                          >
                            {selectionMode && (
                              <div className="absolute left-2 top-2">
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => toggleFileSelection(file.itemPath)}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                            )}
                            <div className="relative">
                              <FileText className="h-10 w-10 text-slate-400" />
                              {ext && (
                                <span
                                  className={cn(
                                    'absolute -bottom-1 -right-2 rounded px-1 py-0.5 text-[10px] font-bold uppercase leading-none',
                                    badgeColor,
                                  )}
                                >
                                  {ext}
                                </span>
                              )}
                            </div>
                            <span className="w-full truncate text-center text-xs font-medium text-foreground">
                              {file.itemName}
                            </span>
                            {file.contentLength != null && (
                              <span className="text-[10px] text-muted-foreground">
                                {formatFileSize(file.contentLength)}
                              </span>
                            )}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>{file.itemName}</TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Detail Sheet */}
      <FileDetailSheet
        open={showDetail}
        onClose={handleCloseDetail}
        file={currentFile ? {
          name: currentFile.itemName,
          path: currentFile.itemPath,
          size: currentFile.contentLength,
          lastModified: currentFile.lastModified,
          contentType: currentFile.contentType,
          metadata: currentFile.metadata,
        } : null}
      />

      {/* Copy Dialogs */}
      <CopyToDropboxDialog
        open={copyToDropboxOpen}
        onOpenChange={setCopyToDropboxOpen}
        selectedFiles={selectedFileObjects}
        accountName={context.account ?? ''}
        containerName={context.container ?? ''}
        onSuccess={handleCopySuccess}
      />
      <CopyToGoogleDriveDialog
        open={copyToDriveOpen}
        onOpenChange={setCopyToDriveOpen}
        selectedFiles={selectedFileObjects}
        accountName={context.account ?? ''}
        containerName={context.container ?? ''}
        onSuccess={handleCopySuccess}
      />

      {/* Bottom Selection Bar */}
      {selectionMode && totalSelected > 0 && (
        <div className="border-t border-border bg-card px-6 py-3">
          <div className="flex items-center justify-between">
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
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="gap-1.5 bg-[#4285F4] text-white hover:bg-[#3367D6]"
                onClick={() => navigate('/processes')}
              >
                <ImageIcon className="h-4 w-4" />
                Migrate to Google Photos
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>

              <Button
                size="sm"
                className="gap-1.5 bg-teal-600 text-white hover:bg-teal-700"
                onClick={() => navigate('/processes')}
              >
                <Upload className="h-4 w-4" />
                Copy to Google Cloud Storage
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>

              <Button
                size="sm"
                className="gap-1.5 bg-blue-600 text-white hover:bg-blue-700"
                onClick={() => setCopyToDropboxOpen(true)}
              >
                <Cloudy className="h-4 w-4" />
                Copy to Dropbox
              </Button>

              <Button
                size="sm"
                className="gap-1.5 bg-green-600 text-white hover:bg-green-700"
                onClick={() => setCopyToDriveOpen(true)}
              >
                <Cloud className="h-4 w-4" />
                Copy to Google Drive
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
