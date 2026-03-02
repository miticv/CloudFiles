import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useOidc } from '@/auth/oidc-provider';
import { useAuth } from '@/auth/auth-context';
import { useSubscriptions, useResourceGroups, useStorageAccounts, useContainers } from '@/api/azure-browse.api';
import { useStartGcsToAzure } from '@/api/process.api';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import type { FileItem } from '@/api/types';

interface CopyGcsToAzureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedFiles: FileItem[];
  bucketName: string;
  onSuccess: () => void;
}

export function CopyGcsToAzureDialog({
  open,
  onOpenChange,
  selectedFiles,
  bucketName,
  onSuccess,
}: CopyGcsToAzureDialogProps) {
  const navigate = useNavigate();
  const { getAccessToken } = useOidc();
  const auth = useAuth();
  const startCopy = useStartGcsToAzure();

  const [subscriptionId, setSubscriptionId] = useState<string>('');
  const [resourceGroup, setResourceGroup] = useState<string>('');
  const [accountName, setAccountName] = useState<string>('');
  const [containerName, setContainerName] = useState<string>('');
  const [destinationFolder, setDestinationFolder] = useState('');
  const [preparing, setPreparing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: subscriptions, isLoading: loadingSubs } = useSubscriptions();
  const { data: resourceGroups, isLoading: loadingRGs } = useResourceGroups(subscriptionId || null);
  const { data: storageAccounts, isLoading: loadingAccounts } = useStorageAccounts(
    subscriptionId || null,
    resourceGroup || null,
  );
  const { data: containers, isLoading: loadingContainers } = useContainers(
    subscriptionId || null,
    resourceGroup || null,
    accountName || null,
  );

  const canStart = accountName && containerName && selectedFiles.length > 0;

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
        bucketName,
        accountName,
        containerName,
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
    canStart, selectedFiles, bucketName, accountName, containerName,
    destinationFolder, getAccessToken, startCopy, auth.user, onOpenChange, onSuccess, navigate,
  ]);

  function handleSubscriptionChange(value: string) {
    setSubscriptionId(value);
    setResourceGroup('');
    setAccountName('');
    setContainerName('');
  }

  function handleResourceGroupChange(value: string) {
    setResourceGroup(value);
    setAccountName('');
    setContainerName('');
  }

  function handleAccountChange(value: string) {
    setAccountName(value);
    setContainerName('');
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Copy to Azure Blob Storage</DialogTitle>
          <DialogDescription>
            {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected from {bucketName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Subscription */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Subscription</label>
            <Select value={subscriptionId} onValueChange={handleSubscriptionChange}>
              <SelectTrigger>
                <SelectValue placeholder={loadingSubs ? 'Loading...' : 'Select subscription'} />
              </SelectTrigger>
              <SelectContent>
                {subscriptions?.map((sub) => (
                  <SelectItem key={sub.subscriptionId} value={sub.subscriptionId}>
                    {sub.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Resource Group */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Resource Group</label>
            <Select value={resourceGroup} onValueChange={handleResourceGroupChange} disabled={!subscriptionId}>
              <SelectTrigger>
                <SelectValue placeholder={loadingRGs ? 'Loading...' : 'Select resource group'} />
              </SelectTrigger>
              <SelectContent>
                {resourceGroups?.map((rg) => (
                  <SelectItem key={rg.name} value={rg.name}>
                    {rg.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Storage Account */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Storage Account</label>
            <Select value={accountName} onValueChange={handleAccountChange} disabled={!resourceGroup}>
              <SelectTrigger>
                <SelectValue placeholder={loadingAccounts ? 'Loading...' : 'Select storage account'} />
              </SelectTrigger>
              <SelectContent>
                {storageAccounts?.map((acct) => (
                  <SelectItem key={acct.name} value={acct.name}>
                    {acct.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Container */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Container</label>
            <Select value={containerName} onValueChange={setContainerName} disabled={!accountName}>
              <SelectTrigger>
                <SelectValue placeholder={loadingContainers ? 'Loading...' : 'Select container'} />
              </SelectTrigger>
              <SelectContent>
                {containers?.map((c) => (
                  <SelectItem key={c.name} value={c.name}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Destination Folder */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Destination Folder (optional)</label>
            <Input
              value={destinationFolder}
              onChange={(e) => setDestinationFolder(e.target.value)}
              placeholder="e.g. backups/gcs"
            />
            <p className="text-xs text-muted-foreground">
              Files will be copied to this folder path in the container. Leave empty to copy to root.
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
