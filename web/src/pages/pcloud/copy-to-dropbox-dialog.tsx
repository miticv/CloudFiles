import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/auth/auth-context';
import { getDropboxToken } from '@/auth/dropbox-auth';
import { listAllPCloudFilesInFolder } from '@/api/pcloud.api';
import { useStartPCloudToDropbox } from '@/api/process.api';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import type { PCloudItem, PCloudFileForCopy } from '@/api/types';

interface CopyToDropboxDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedFiles: PCloudItem[];
  selectedFolders: PCloudItem[];
  onSuccess: () => void;
}

export function CopyToDropboxDialog({
  open,
  onOpenChange,
  selectedFiles,
  selectedFolders,
  onSuccess,
}: CopyToDropboxDialogProps) {
  const navigate = useNavigate();
  const auth = useAuth();
  const startCopy = useStartPCloudToDropbox();

  const [destinationFolder, setDestinationFolder] = useState('');
  const [preparing, setPreparing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canStart = selectedFiles.length > 0 || selectedFolders.length > 0;

  const handleStart = useCallback(async () => {
    if (!canStart) return;
    setErrorMsg(null);
    setPreparing(true);

    try {
      const dropboxAccessToken = getDropboxToken();
      if (!dropboxAccessToken) {
        setErrorMsg('Dropbox token not available. Please connect Dropbox on the Connections page.');
        setPreparing(false);
        return;
      }

      const allFiles: PCloudFileForCopy[] = selectedFiles.map((f) => ({
        fileId: f.fileId,
        name: f.name,
        size: f.size,
      }));

      for (const folder of selectedFolders) {
        const folderFiles = await listAllPCloudFilesInFolder(folder.folderId, `${folder.name}/`);
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
        destinationFolder: destinationFolder.trim().replace(/^\/+/, ''),
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
    canStart, selectedFiles, selectedFolders, destinationFolder,
    startCopy, auth.user, onOpenChange, onSuccess, navigate,
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Copy to Dropbox</DialogTitle>
          <DialogDescription>
            {selectedFiles.length > 0 && `${selectedFiles.length} file${selectedFiles.length !== 1 ? 's' : ''}`}
            {selectedFiles.length > 0 && selectedFolders.length > 0 && ' and '}
            {selectedFolders.length > 0 && `${selectedFolders.length} folder${selectedFolders.length !== 1 ? 's' : ''}`}
            {' '}selected
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Destination Folder (optional)</label>
            <Input
              value={destinationFolder}
              onChange={(e) => setDestinationFolder(e.target.value)}
              placeholder="e.g. backups/pcloud"
            />
            <p className="text-xs text-muted-foreground">
              Files will be copied to this folder in Dropbox. Leave empty to copy to root.
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
