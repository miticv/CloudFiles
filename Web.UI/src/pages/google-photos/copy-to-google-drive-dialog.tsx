import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/auth/auth-context';
import { useStartPhotosToGoogleDrive } from '@/api/process.api';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import type { PickedMediaItem } from '@/api/types';

interface CopyToGoogleDriveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedItems: PickedMediaItem[];
  onSuccess: () => void;
}

export function CopyToGoogleDriveDialog({
  open,
  onOpenChange,
  selectedItems,
  onSuccess,
}: CopyToGoogleDriveDialogProps) {
  const navigate = useNavigate();
  const auth = useAuth();
  const startCopy = useStartPhotosToGoogleDrive();

  const [destinationFolderId, setDestinationFolderId] = useState('');
  const [preparing, setPreparing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canStart = selectedItems.length > 0;

  const handleStart = useCallback(async () => {
    if (!canStart) return;
    setErrorMsg(null);
    setPreparing(true);

    try {
      await startCopy.mutateAsync({
        photoItems: selectedItems.map((item) => ({
          id: item.id,
          baseUrl: item.mediaFile.baseUrl,
          mimeType: item.mediaFile.mimeType,
          filename: item.mediaFile.filename,
        })),
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
    canStart, selectedItems, destinationFolderId,
    startCopy, auth.user, onOpenChange, onSuccess, navigate,
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Copy to Google Drive</DialogTitle>
          <DialogDescription>
            {selectedItems.length} photo{selectedItems.length !== 1 ? 's' : ''} selected
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Destination Folder ID (optional)</label>
            <Input
              value={destinationFolderId}
              onChange={(e) => setDestinationFolderId(e.target.value)}
              placeholder="e.g. 1AbC_dEfGhIjKlMnOp"
            />
            <p className="text-xs text-muted-foreground">
              Enter the Google Drive folder ID where files will be copied. Leave empty to copy to the root of My Drive.
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
