import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useOidc } from '@/auth/oidc-provider';
import { useAuth } from '@/auth/auth-context';
import { useStartPhotosToAzure } from '@/api/process.api';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { AzureHierarchyPicker, type AzureDestination } from '@/components/azure-hierarchy-picker';
import type { PickedMediaItem } from '@/api/types';

interface CopyToAzureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedItems: PickedMediaItem[];
  onSuccess: () => void;
}

export function CopyToAzureDialog({
  open,
  onOpenChange,
  selectedItems,
  onSuccess,
}: CopyToAzureDialogProps) {
  const navigate = useNavigate();
  const { getAccessToken } = useOidc();
  const auth = useAuth();
  const startCopy = useStartPhotosToAzure();

  const [azureDest, setAzureDest] = useState<AzureDestination>({ accountName: '', containerName: '', destinationFolder: '' });
  const [preparing, setPreparing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canStart = azureDest.accountName && azureDest.containerName && selectedItems.length > 0;

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
        photoItems: selectedItems.map((item) => ({
          id: item.id,
          baseUrl: item.mediaFile.baseUrl,
          mimeType: item.mediaFile.mimeType,
          filename: item.mediaFile.filename,
        })),
        accountName: azureDest.accountName,
        containerName: azureDest.containerName,
        destinationFolder: azureDest.destinationFolder.trim(),
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
    canStart, selectedItems, azureDest, getAccessToken, startCopy, auth.user, onOpenChange, onSuccess, navigate,
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Copy to Azure Blob Storage</DialogTitle>
          <DialogDescription>
            {selectedItems.length} photo{selectedItems.length !== 1 ? 's' : ''} selected
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <AzureHierarchyPicker
            destinationPlaceholder="e.g. backups/photos"
            onChange={setAzureDest}
          />

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
