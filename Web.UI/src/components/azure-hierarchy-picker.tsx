import { useState, useEffect } from 'react';
import { useSubscriptions, useResourceGroups, useStorageAccounts, useContainers } from '@/api/azure-browse.api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

export interface AzureDestination {
  accountName: string;
  containerName: string;
  destinationFolder: string;
}

interface AzureHierarchyPickerProps {
  destinationPlaceholder?: string;
  onChange: (destination: AzureDestination) => void;
}

export function AzureHierarchyPicker({ destinationPlaceholder = 'e.g. backups', onChange }: AzureHierarchyPickerProps) {
  const [subscriptionId, setSubscriptionId] = useState('');
  const [resourceGroup, setResourceGroup] = useState('');
  const [accountName, setAccountName] = useState('');
  const [containerName, setContainerName] = useState('');
  const [destinationFolder, setDestinationFolder] = useState('');

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

  useEffect(() => {
    onChange({ accountName, containerName, destinationFolder });
  }, [accountName, containerName, destinationFolder, onChange]);

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
    <>
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
          placeholder={destinationPlaceholder}
        />
        <p className="text-xs text-muted-foreground">
          Files will be copied to this folder path in the container. Leave empty to copy to root.
        </p>
      </div>
    </>
  );
}
