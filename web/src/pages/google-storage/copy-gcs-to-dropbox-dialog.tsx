import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/auth/auth-context';
import { getDropboxToken } from '@/auth/dropbox-auth';
import { useStartGcsToDropbox } from '@/api/process.api';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import type { FileItem } from '@/api/types';

interface CopyGcsToDropboxDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedFiles: FileItem[];
  bucketName: string;
  onSuccess: () => void;
}

export function CopyGcsToDropboxDialog({
  open,
  onOpenChange,
  selectedFiles,
  bucketName,
  onSuccess,
}: CopyGcsToDropboxDialogProps) {
  const navigate = useNavigate();
  const auth = useAuth();
  const startCopy = useStartGcsToDropbox();

  const [destinationFolder, setDestinationFolder] = useState('');
  const [preparing, setPreparing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canStart = selectedFiles.length > 0;

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

      await startCopy.mutateAsync({
        selectedItems: selectedFiles.map((f) => ({
          itemPath: f.itemPath,
          isFolder: f.isFolder,
        })),
        bucketName,
        dropboxAccessToken,
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
    canStart, selectedFiles, bucketName, destinationFolder,
    startCopy, auth.user, onOpenChange, onSuccess, navigate,
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Copy to Dropbox</DialogTitle>
          <DialogDescription>
            {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected from {bucketName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Destination Folder */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Destination Folder (optional)</label>
            <Input
              value={destinationFolder}
              onChange={(e) => setDestinationFolder(e.target.value)}
              placeholder="e.g. /backups/gcs"
            />
            <p className="text-xs text-muted-foreground">
              Files will be copied to this folder path in Dropbox. Leave empty to copy to root.
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
