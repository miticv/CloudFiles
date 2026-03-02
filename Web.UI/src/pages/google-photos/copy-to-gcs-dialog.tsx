import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/auth/auth-context';
import { useStartPhotosToGcs } from '@/api/process.api';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import type { PickedMediaItem } from '@/api/types';

interface CopyToGcsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedItems: PickedMediaItem[];
  onSuccess: () => void;
}

export function CopyToGcsDialog({
  open,
  onOpenChange,
  selectedItems,
  onSuccess,
}: CopyToGcsDialogProps) {
  const navigate = useNavigate();
  const auth = useAuth();
  const startCopy = useStartPhotosToGcs();

  const [bucketName, setBucketName] = useState('');
  const [destinationFolder, setDestinationFolder] = useState('');
  const [preparing, setPreparing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canStart = selectedItems.length > 0 && !!bucketName.trim();

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
    canStart, selectedItems, bucketName, destinationFolder,
    startCopy, auth.user, onOpenChange, onSuccess, navigate,
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Copy to Google Cloud Storage</DialogTitle>
          <DialogDescription>
            {selectedItems.length} photo{selectedItems.length !== 1 ? 's' : ''} selected
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Bucket Name</label>
            <Input
              value={bucketName}
              onChange={(e) => setBucketName(e.target.value)}
              placeholder="e.g. my-gcs-bucket"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Destination Folder (optional)</label>
            <Input
              value={destinationFolder}
              onChange={(e) => setDestinationFolder(e.target.value)}
              placeholder="e.g. backups/photos"
            />
            <p className="text-xs text-muted-foreground">
              Files will be copied to this path in the bucket. Leave empty to copy to root.
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
