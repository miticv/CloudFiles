import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router';
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
import { cn, formatFileSize, formatSelectionCount, getFileExtension, getFileTypeBadgeColor } from '@/lib/utils';
import {
  Folder,
  FileText,
  ChevronRight,
  CheckSquare,
  RotateCcw,
  AlertCircle,
  FolderOpen,
  Link as LinkIcon,
  LayoutGrid,
  List,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import type { FileItem, StorageContext } from '@/api/types';
import { CopyToBar } from '@/components/copy-to-bar';
import { type CopyProviderId } from '@/lib/providers';
import { CopyToDropboxDialog } from './copy-to-dropbox-dialog';
import { CopyToGoogleDriveDialog } from './copy-to-google-drive-dialog';
import { CopyToGcsDialog } from './copy-to-gcs-dialog';
import { CopyToGooglePhotosDialog } from './copy-to-google-photos-dialog';
import { CopyToPcloudDialog } from './copy-to-pcloud-dialog';

// ─── Helpers ───

type SortBy = 'name' | 'modified';
type SortDir = 'asc' | 'desc';

function sortItems(items: FileItem[], by: SortBy, dir: SortDir): FileItem[] {
  return [...items].sort((a, b) => {
    const cmp = by === 'name'
      ? a.itemName.localeCompare(b.itemName, undefined, { numeric: true, sensitivity: 'base' })
      : (new Date(a.lastModified ?? 0).getTime()) - (new Date(b.lastModified ?? 0).getTime());
    return dir === 'asc' ? cmp : -cmp;
  });
}

function fmtDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

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

  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  // View / sort state
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(
    () => (localStorage.getItem('fm_view') ?? 'grid') as 'grid' | 'list',
  );
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

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
  const [activeDialog, setActiveDialog] = useState<CopyProviderId | null>(null);

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

  // Detect 401 (provider disconnected)
  const isDisconnected = isError && queryError && 'response' in queryError &&
    (queryError as { response?: { status?: number } }).response?.status === 401;

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

  const handleToggleView = useCallback((mode: 'grid' | 'list') => {
    setViewMode(mode);
    localStorage.setItem('fm_view', mode);
  }, []);

  const handleSortClick = useCallback((field: SortBy) => {
    setSortBy((prev) => {
      if (prev === field) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      setSortDir('asc');
      return field;
    });
  }, []);

  // ─── Derived state ───

  const folders = useMemo(
    () => sortItems(items?.filter((i) => i.isFolder) ?? [], sortBy, sortDir),
    [items, sortBy, sortDir],
  );
  const files = useMemo(
    () => sortItems(items?.filter((i) => !i.isFolder) ?? [], sortBy, sortDir),
    [items, sortBy, sortDir],
  );
  const breadcrumbs = buildBreadcrumbs(context, currentPath);
  const totalSelected = selectedFiles.size + selectedFolders.size;
  const providerLabel = context.provider === 'azure' ? 'Azure Blob' : 'Google Cloud';

  const selectedFileObjects = useMemo(
    () => [
      ...Array.from(selectedFiles).map((p) => ({ itemPath: p, isFolder: false })),
      ...Array.from(selectedFolders).map((p) => ({ itemPath: p, isFolder: true })),
    ],
    [selectedFiles, selectedFolders],
  );

  const handleCopySuccess = useCallback(() => {
    clearSelection();
  }, [clearSelection]);

  // ─── Sub-renders ───

  function renderFolderTile(folder: FileItem) {
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
  }

  function renderFileTile(file: FileItem) {
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
  }

  function renderFolderRow(folder: FileItem) {
    const isSelected = selectedFolders.has(folder.itemPath);
    return (
      <button
        key={folder.itemPath}
        className={cn(
          'flex w-full items-center gap-3 rounded-md border bg-card px-3 py-2 transition-colors hover:border-indigo-300 hover:bg-indigo-50/50 cursor-pointer',
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
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => toggleFolderSelection(folder.itemPath)}
            onClick={(e) => e.stopPropagation()}
            className="shrink-0"
          />
        )}
        <Folder className="h-5 w-5 shrink-0 text-amber-500" />
        <span className="flex-1 text-left text-sm font-medium text-foreground">{folder.itemName}</span>
        <span className="w-20 text-right text-xs text-muted-foreground" />
        <span className="w-36 text-right text-xs text-muted-foreground">{fmtDate(folder.lastModified)}</span>
        <span className="w-12" />
      </button>
    );
  }

  function renderFileRow(file: FileItem) {
    const ext = getFileExtension(file.itemName);
    const badgeColor = getFileTypeBadgeColor(ext);
    const isSelected = selectedFiles.has(file.itemPath);
    return (
      <button
        key={file.itemPath}
        className={cn(
          'flex w-full items-center gap-3 rounded-md border bg-card px-3 py-2 transition-colors hover:border-indigo-300 hover:bg-indigo-50/50 cursor-pointer',
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
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => toggleFileSelection(file.itemPath)}
            onClick={(e) => e.stopPropagation()}
            className="shrink-0"
          />
        )}
        <FileText className="h-5 w-5 shrink-0 text-slate-400" />
        <span className="flex-1 text-left text-sm font-medium text-foreground">{file.itemName}</span>
        <span className="w-20 text-right text-xs text-muted-foreground">
          {file.contentLength != null ? formatFileSize(file.contentLength) : ''}
        </span>
        <span className="w-36 text-right text-xs text-muted-foreground">{fmtDate(file.lastModified)}</span>
        <span className="w-12 text-right">
          {ext && (
            <span className={cn('rounded px-1 py-0.5 text-[10px] font-bold uppercase leading-none', badgeColor)}>
              {ext}
            </span>
          )}
        </span>
      </button>
    );
  }

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
            {/* Sort buttons */}
            <Button
              variant={sortBy === 'name' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSortClick('name')}
              className="gap-1.5"
            >
              Name
              {sortBy === 'name' && (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
            </Button>
            <Button
              variant={sortBy === 'modified' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSortClick('modified')}
              className="gap-1.5"
            >
              Modified
              {sortBy === 'modified' && (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
            </Button>

            {/* Divider */}
            <div className="h-5 w-px bg-border mx-1" />

            {/* View toggle */}
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleToggleView('grid')}
              className="px-2"
              title="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleToggleView('list')}
              className="px-2"
              title="List view"
            >
              <List className="h-4 w-4" />
            </Button>

            {/* Divider */}
            <div className="h-5 w-px bg-border mx-1" />

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

        {/* Disconnected (401) */}
        {!isLoading && isDisconnected && (
          <div className="flex flex-col items-center justify-center gap-4 py-24">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50">
              <LinkIcon className="h-7 w-7 text-indigo-500" />
            </div>
            <div className="text-center">
              <p className="font-medium text-foreground">
                {context.provider === 'azure' ? 'Azure Storage' : 'Provider'} not connected
              </p>
              <p className="mt-1 text-sm text-muted-foreground">Connect your account to browse files</p>
            </div>
            <Button asChild size="sm" className="gap-1.5">
              <Link to="/connections">Connect</Link>
            </Button>
          </div>
        )}

        {/* Error (non-401) */}
        {!isLoading && error && !isDisconnected && (
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

        {/* Files and Folders */}
        {!isLoading && !error && items && items.length > 0 && (
          <div className="space-y-6">
            {viewMode === 'grid' ? (
              <>
                {/* Grid — Folders */}
                {folders.length > 0 && (
                  <div>
                    <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Folders ({folders.length})
                    </h2>
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
                      {folders.map(renderFolderTile)}
                    </div>
                  </div>
                )}
                {/* Grid — Files */}
                {files.length > 0 && (
                  <div>
                    <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Files ({files.length})
                    </h2>
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
                      {files.map(renderFileTile)}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* List — column header */}
                <div className="flex items-center gap-3 px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {selectionMode && <span className="w-4 shrink-0" />}
                  <span className="w-5 shrink-0" />
                  <span className="flex-1">Name</span>
                  <span className="w-20 text-right">Size</span>
                  <span className="w-36 text-right">Modified</span>
                  <span className="w-12 text-right">Type</span>
                </div>

                {/* List — Folders */}
                {folders.length > 0 && (
                  <div>
                    <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Folders ({folders.length})
                    </h2>
                    <div className="space-y-1">
                      {folders.map(renderFolderRow)}
                    </div>
                  </div>
                )}

                {/* List — Files */}
                {files.length > 0 && (
                  <div>
                    <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Files ({files.length})
                    </h2>
                    <div className="space-y-1">
                      {files.map(renderFileRow)}
                    </div>
                  </div>
                )}
              </>
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
          downloadUrl: context.account && context.container
            ? `azure/files/item?account=${encodeURIComponent(context.account)}&container=${encodeURIComponent(context.container)}&path=${encodeURIComponent(currentFile.itemPath)}`
            : undefined,
        } : null}
      />

      {/* Copy Dialogs */}
      <CopyToDropboxDialog
        open={activeDialog === 'dropbox'}
        onOpenChange={(o) => !o && setActiveDialog(null)}
        selectedFiles={selectedFileObjects}
        accountName={context.account ?? ''}
        containerName={context.container ?? ''}
        onSuccess={handleCopySuccess}
      />
      <CopyToGoogleDriveDialog
        open={activeDialog === 'google-drive'}
        onOpenChange={(o) => !o && setActiveDialog(null)}
        selectedFiles={selectedFileObjects}
        accountName={context.account ?? ''}
        containerName={context.container ?? ''}
        onSuccess={handleCopySuccess}
      />
      <CopyToGcsDialog
        open={activeDialog === 'gcs'}
        onOpenChange={(o) => !o && setActiveDialog(null)}
        selectedFiles={selectedFileObjects}
        accountName={context.account ?? ''}
        containerName={context.container ?? ''}
        onSuccess={handleCopySuccess}
      />
      <CopyToGooglePhotosDialog
        open={activeDialog === 'google-photos'}
        onOpenChange={(o) => !o && setActiveDialog(null)}
        selectedFiles={selectedFileObjects}
        accountName={context.account ?? ''}
        containerName={context.container ?? ''}
        onSuccess={handleCopySuccess}
      />
      <CopyToPcloudDialog
        open={activeDialog === 'pcloud'}
        onOpenChange={(o) => !o && setActiveDialog(null)}
        selectedFiles={selectedFileObjects}
        accountName={context.account ?? ''}
        containerName={context.container ?? ''}
        onSuccess={handleCopySuccess}
      />

      {/* Bottom Selection Bar */}
      {selectionMode && totalSelected > 0 && (
        <CopyToBar
          sourceProvider="azure"
          selectedCount={totalSelected}
          selectedLabel={formatSelectionCount(selectedFiles.size, selectedFolders.size)}
          onClearSelection={clearSelection}
          onCopyTo={(dest) => setActiveDialog(dest)}
        />
      )}
    </div>
  );
}
