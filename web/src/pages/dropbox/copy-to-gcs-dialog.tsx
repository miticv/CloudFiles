import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useOidc } from '@/auth/oidc-provider';
import { useAuth } from '@/auth/auth-context';
import { apiClient } from '@/auth/axios-client';
import { useStartDropboxToGcs } from '@/api/process.api';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import type { DropboxItem, DropboxFolderResponse, DropboxFileForCopy } from '@/api/types';

interface CopyToGcsDialogProps {
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

  // Handle pagination
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

export function CopyToGcsDialog({
  open,
  onOpenChange,
  selectedFiles,
  selectedFolders,
  onSuccess,
}: CopyToGcsDialogProps) {
  const navigate = useNavigate();
  const { getAccessToken } = useOidc();
  const auth = useAuth();
  const startCopy = useStartDropboxToGcs();

  const [bucketName, setBucketName] = useState('');
  const [destinationFolder, setDestinationFolder] = useState('');
  const [preparing, setPreparing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canStart = bucketName.trim() && (selectedFiles.length > 0 || selectedFolders.length > 0);

  const handleStart = useCallback(async () => {
    if (!canStart) return;
    setErrorMsg(null);
    setPreparing(true);

    try {
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

      const googleToken = await getAccessToken('google');
      if (!googleToken) {
        setErrorMsg('Google token not available. Please connect Google on the Connections page.');
        setPreparing(false);
        return;
      }

      await startCopy.mutateAsync({
        items: allFiles,
        googleAccessToken: googleToken,
        bucketName: bucketName.trim(),
        destinationFolder: destinationFolder.trim(),
        startedBy: auth.user?.email ?? 'unknown',
      });

      onOpenChange(false);
      onSuccess();
      navigate('/processes');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to start copy job.';
      setErrorMsg(msg);
    } finally {
      setPreparing(false);
    }
  }, [
    canStart, selectedFiles, selectedFolders, bucketName, destinationFolder,
    getAccessToken, startCopy, auth.user, onOpenChange, onSuccess, navigate,
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Copy to Google Cloud Storage</DialogTitle>
          <DialogDescription>
            {selectedFiles.length > 0 && `${selectedFiles.length} file${selectedFiles.length !== 1 ? 's' : ''}`}
            {selectedFiles.length > 0 && selectedFolders.length > 0 && ' and '}
            {selectedFolders.length > 0 && `${selectedFolders.length} folder${selectedFolders.length !== 1 ? 's' : ''}`}
            {' '}selected
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Bucket Name */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Bucket Name</label>
            <Input
              value={bucketName}
              onChange={(e) => setBucketName(e.target.value)}
              placeholder="e.g. my-gcs-bucket"
            />
          </div>

          {/* Destination Folder */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Destination Folder (optional)</label>
            <Input
              value={destinationFolder}
              onChange={(e) => setDestinationFolder(e.target.value)}
              placeholder="e.g. backups/dropbox"
            />
            <p className="text-xs text-muted-foreground">
              Files will be copied to this folder path in the bucket. Leave empty to copy to root.
            </p>
          </div>

          {/* Error */}
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
