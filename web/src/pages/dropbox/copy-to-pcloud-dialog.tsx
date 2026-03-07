import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/auth/auth-context';
import { apiClient } from '@/auth/axios-client';
import { getDropboxToken } from '@/auth/dropbox-auth';
import { getPCloudToken, getPCloudHostname } from '@/auth/pcloud-auth';
import { useStartDropboxToPCloud } from '@/api/process.api';
import { usePCloudFolder } from '@/api/pcloud.api';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { validateFolderName } from '@/lib/folder-validation';
import { FolderOpen, FolderPlus, ChevronRight, ArrowLeft, Home, X } from 'lucide-react';
import type { DropboxItem, DropboxFolderResponse, DropboxFileForCopy } from '@/api/types';

interface BreadcrumbEntry {
  folderId: number;
  name: string;
}

interface CopyToPCloudDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedFiles: DropboxItem[];
  selectedFolders: DropboxItem[];
  onSuccess: () => void;
}

async function listAllFilesInFolder(folderPath: string, prefix: string): Promise<DropboxFileForCopy[]> {
  const files: DropboxFileForCopy[] = [];
  const res = await apiClient.get<DropboxFolderResponse>(
    `dropbox/files/list?path=${encodeURIComponent(folderPath)}`
  );

  for (const item of res.data.items) {
    if (item.isFolder) {
      const subFiles = await listAllFilesInFolder(item.pathDisplay, `${prefix}${item.name}/`);
      files.push(...subFiles);
    } else {
      files.push({
        path: item.pathDisplay,
        name: `${prefix}${item.name}`,
        size: item.size,
      });
    }
  }

  let cursor = res.data.cursor;
  let hasMore = res.data.hasMore;
  while (hasMore) {
    const cont = await apiClient.get<DropboxFolderResponse>(
      `dropbox/files/list/continue?cursor=${encodeURIComponent(cursor)}`
    );
    for (const item of cont.data.items) {
      if (item.isFolder) {
        const subFiles = await listAllFilesInFolder(item.pathDisplay, `${prefix}${item.name}/`);
        files.push(...subFiles);
      } else {
        files.push({
          path: item.pathDisplay,
          name: `${prefix}${item.name}`,
          size: item.size,
        });
      }
    }
    cursor = cont.data.cursor;
    hasMore = cont.data.hasMore;
  }

  return files;
}

export function CopyToPCloudDialog({
  open,
  onOpenChange,
  selectedFiles,
  selectedFolders,
  onSuccess,
}: CopyToPCloudDialogProps) {
  const navigate = useNavigate();
  const auth = useAuth();
  const startCopy = useStartDropboxToPCloud();

  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbEntry[]>([{ folderId: 0, name: 'Root' }]);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderInput, setNewFolderInput] = useState('');
  const [appliedFolderName, setAppliedFolderName] = useState('');
  const [preparing, setPreparing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const currentFolder = breadcrumbs[breadcrumbs.length - 1];

  const { data, isLoading } = usePCloudFolder(currentFolder.folderId, open);

  const folders = (data?.items ?? []).filter((i) => i.isFolder);
  const folderValidation = newFolderInput ? validateFolderName(newFolderInput) : null;

  const canStart = selectedFiles.length > 0 || selectedFolders.length > 0;

  function navigateToFolder(folderId: number, folderName: string) {
    setBreadcrumbs((prev) => [...prev, { folderId, name: folderName }]);
    setAppliedFolderName('');
  }

  function navigateToBreadcrumb(index: number) {
    setBreadcrumbs((prev) => prev.slice(0, index + 1));
    setAppliedFolderName('');
  }

  function handleUseFolder() {
    const trimmed = newFolderInput.trim();
    if (!validateFolderName(trimmed).valid) return;
    setAppliedFolderName(trimmed);
    setShowCreateFolder(false);
    setNewFolderInput('');
  }

  function handleCancelCreate() {
    setShowCreateFolder(false);
    setNewFolderInput('');
  }

  const handleStart = useCallback(async () => {
    if (!canStart) return;
    setErrorMsg(null);
    setPreparing(true);

    try {
      const pcloudToken = getPCloudToken();
      const pcloudHostname = getPCloudHostname();
      if (!pcloudToken || !pcloudHostname) {
        setErrorMsg('pCloud is not connected. Please connect pCloud on the Connections page.');
        setPreparing(false);
        return;
      }

      const dropboxAccessToken = getDropboxToken();
      if (!dropboxAccessToken) {
        setErrorMsg('Dropbox token not available. Please connect Dropbox on the Connections page.');
        setPreparing(false);
        return;
      }

      // Flatten: direct files
      const allFiles: DropboxFileForCopy[] = selectedFiles.map((f) => ({
        path: f.pathDisplay,
        name: f.name,
        size: f.size,
      }));

      // Expand folders recursively
      for (const folder of selectedFolders) {
        const folderFiles = await listAllFilesInFolder(folder.pathDisplay, `${folder.name}/`);
        allFiles.push(...folderFiles);
      }

      if (allFiles.length === 0) {
        setErrorMsg('No files found in the selected items.');
        setPreparing(false);
        return;
      }

      await startCopy.mutateAsync({
        items: allFiles,
        dropboxAccessToken,
        destinationFolderId: currentFolder.folderId,
        newFolderName: appliedFolderName || undefined,
        startedBy: auth.user?.email ?? 'unknown',
      });

      onOpenChange(false);
      setBreadcrumbs([{ folderId: 0, name: 'Root' }]);
      onSuccess();
      navigate('/processes');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to start copy job.';
      setErrorMsg(msg);
    } finally {
      setPreparing(false);
    }
  }, [
    canStart, selectedFiles, selectedFolders, currentFolder.folderId, appliedFolderName,
    startCopy, auth.user, onOpenChange, onSuccess, navigate,
  ]);

  return (
    <Dialog open={open} onOpenChange={(o) => {
      if (!o) setBreadcrumbs([{ folderId: 0, name: 'Root' }]);
      onOpenChange(o);
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Copy to pCloud</DialogTitle>
          <DialogDescription>
            {selectedFiles.length > 0 && `${selectedFiles.length} file${selectedFiles.length !== 1 ? 's' : ''}`}
            {selectedFiles.length > 0 && selectedFolders.length > 0 && ' and '}
            {selectedFolders.length > 0 && `${selectedFolders.length} folder${selectedFolders.length !== 1 ? 's' : ''}`}
            {' '}selected
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div>
            <p className="text-sm font-medium text-foreground mb-2">Destination Folder</p>

            {/* Breadcrumbs */}
            <div className="flex items-center gap-1 mb-2 flex-wrap">
              {breadcrumbs.map((entry, index) => (
                <span key={entry.folderId} className="flex items-center gap-1 text-sm">
                  {index > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                  <button
                    onClick={() => navigateToBreadcrumb(index)}
                    className={cn(
                      'hover:text-foreground transition-colors',
                      index === breadcrumbs.length - 1
                        ? 'text-foreground font-medium'
                        : 'text-muted-foreground'
                    )}
                  >
                    {index === 0 ? <Home className="h-3.5 w-3.5 inline" /> : entry.name}
                  </button>
                </span>
              ))}
            </div>

            {/* Folder picker */}
            <div className="rounded-lg border border-border overflow-hidden max-h-48 overflow-y-auto">
              {breadcrumbs.length > 1 && (
                <button
                  onClick={() => navigateToBreadcrumb(breadcrumbs.length - 2)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-accent transition-colors border-b border-border"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back
                </button>
              )}

              {isLoading && (
                <div className="flex items-center justify-center py-6">
                  <Spinner size={16} />
                </div>
              )}

              {!isLoading && folders.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">No subfolders</p>
              )}

              {!isLoading && folders.map((folder) => (
                <button
                  key={folder.folderId}
                  onClick={() => navigateToFolder(folder.folderId, folder.name)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors border-b border-border last:border-b-0"
                >
                  <FolderOpen className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                  <span className="truncate flex-1 text-left">{folder.name}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>

            {/* Create Folder */}
            {!showCreateFolder ? (
              <button
                onClick={() => { setShowCreateFolder(true); setAppliedFolderName(''); }}
                className="flex items-center gap-1.5 mt-2 text-xs text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                <FolderPlus className="h-3.5 w-3.5" />
                Create Folder
              </button>
            ) : (
              <div className="mt-2 space-y-1.5">
                <div className="flex items-center gap-2">
                  <Input
                    value={newFolderInput}
                    onChange={(e) => setNewFolderInput(e.target.value)}
                    placeholder="New folder name"
                    className="h-8 text-sm flex-1"
                    onKeyDown={(e) => { if (e.key === 'Enter' && folderValidation?.valid) handleUseFolder(); }}
                    autoFocus
                  />
                  <Button size="sm" onClick={handleUseFolder} disabled={!folderValidation?.valid} className="h-8">
                    Use
                  </Button>
                  <button onClick={handleCancelCreate} className="text-muted-foreground hover:text-foreground transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {folderValidation && !folderValidation.valid && (
                  <p className="text-xs text-destructive">{folderValidation.error}</p>
                )}
              </div>
            )}

            <p className="text-xs text-muted-foreground mt-1.5">
              Files will be copied into: <span className="font-medium">
                {appliedFolderName
                  ? [...breadcrumbs.map((b) => b.name), appliedFolderName].join(' / ')
                  : breadcrumbs.map((b) => b.name).join(' / ')}
              </span>
            </p>
          </div>

          {errorMsg && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMsg}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={preparing}>
            Cancel
          </Button>
          <Button onClick={handleStart} disabled={!canStart || preparing}>
            {preparing ? (
              <>
                <Spinner size={14} className="text-primary-foreground" />
                Preparing...
              </>
            ) : (
              'Start Copy'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
