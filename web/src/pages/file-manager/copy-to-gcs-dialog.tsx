import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/auth/auth-context';
import { useOidc } from '@/auth/oidc-provider';
import { useStartAzureToGcs } from '@/api/process.api';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { GcsBucketInput } from '@/components/gcs-bucket-input';
import { Spinner } from '@/components/ui/spinner';
import type { FileItem } from '@/api/types';

interface CopyToGcsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedFiles: FileItem[];
  accountName: string;
  containerName: string;
  onSuccess: () => void;
}

export function CopyToGcsDialog({
  open,
  onOpenChange,
  selectedFiles,
  accountName,
  containerName,
  onSuccess,
}: CopyToGcsDialogProps) {
  const navigate = useNavigate();
  const auth = useAuth();
  const { getAccessToken } = useOidc();
  const startCopy = useStartAzureToGcs();

  const [bucketName, setBucketName] = useState('');
  const [destinationFolder, setDestinationFolder] = useState('');
  const [preparing, setPreparing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canStart = selectedFiles.length > 0 && !!bucketName.trim();

  const handleStart = useCallback(async () => {
    if (!canStart) return;
    setErrorMsg(null);
    setPreparing(true);

    try {
      const azureToken = await getAccessToken('azure-storage');
      if (!azureToken) {
        setErrorMsg('Azure Storage token not available. Please connect Azure on the Connections page.');
        setPreparing(false);
        return;
      }

      await startCopy.mutateAsync({
        selectedItems: selectedFiles.map((f) => ({
          itemPath: f.itemPath,
          isFolder: f.isFolder,
        })),
        accountName,
        containerName,
        bucketName: bucketName.trim(),
        destinationFolder: destinationFolder.trim(),
        azureAccessToken: azureToken,
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
    canStart, selectedFiles, accountName, containerName, bucketName, destinationFolder,
    getAccessToken, startCopy, auth.user, onOpenChange, onSuccess, navigate,
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Copy to Google Cloud Storage</DialogTitle>
          <DialogDescription>
            {selectedFiles.length} item{selectedFiles.length !== 1 ? 's' : ''} selected from {accountName}/{containerName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Bucket Name</label>
            <GcsBucketInput value={bucketName} onChange={setBucketName} enabled={open} />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Destination Folder (optional)</label>
            <Input
              value={destinationFolder}
              onChange={(e) => setDestinationFolder(e.target.value)}
              placeholder="e.g. backups/azure"
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
