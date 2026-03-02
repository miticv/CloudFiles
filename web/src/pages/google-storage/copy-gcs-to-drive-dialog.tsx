import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/auth/auth-context';
import { useStartGcsToDrive } from '@/api/process.api';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import type { FileItem } from '@/api/types';

interface CopyGcsToDriveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedFiles: FileItem[];
  bucketName: string;
  onSuccess: () => void;
}

export function CopyGcsToDriveDialog({
  open,
  onOpenChange,
  selectedFiles,
  bucketName,
  onSuccess,
}: CopyGcsToDriveDialogProps) {
  const navigate = useNavigate();
  const auth = useAuth();
  const startCopy = useStartGcsToDrive();

  const [destinationFolderId, setDestinationFolderId] = useState('');
  const [preparing, setPreparing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canStart = selectedFiles.length > 0;

  const handleStart = useCallback(async () => {
    if (!canStart) return;
    setErrorMsg(null);
    setPreparing(true);

    try {
      await startCopy.mutateAsync({
        selectedItems: selectedFiles.map((f) => ({
          itemPath: f.itemPath,
          isFolder: f.isFolder,
        })),
        bucketName,
        destinationFolderId: destinationFolderId.trim(),
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
    canStart, selectedFiles, bucketName, destinationFolderId,
    startCopy, auth.user, onOpenChange, onSuccess, navigate,
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Copy to Google Drive</DialogTitle>
          <DialogDescription>
            {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected from {bucketName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Destination Folder ID */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Destination Folder ID (optional)</label>
            <Input
              value={destinationFolderId}
              onChange={(e) => setDestinationFolderId(e.target.value)}
              placeholder="e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2wtTs"
            />
            <p className="text-xs text-muted-foreground">
              The Google Drive folder ID to copy files into. Leave empty to copy to My Drive root.
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
