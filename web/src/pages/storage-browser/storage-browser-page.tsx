import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { usePageTitle } from '@/hooks/use-page-title';
import { useOidc } from '@/auth/oidc-provider';
import {
  useSubscriptions,
  useResourceGroups,
  useStorageAccounts,
  useContainers,
  useAssignRole,
  useProbeAccess,
} from '@/api/azure-browse.api';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  ChevronRight,
  HardDrive,
  Folder,
  Database,
  Package,
  RotateCcw,
  ArrowLeft,
  Shield,
  ShieldCheck,
  CloudOff,
  AlertCircle,
} from 'lucide-react';
import type {
  AzureSubscription,
  AzureResourceGroup,
  AzureStorageAccount,
  AzureContainer,
  StorageContext,
} from '@/api/types';

// ─── Types ───

type BrowseLevel = 'subscriptions' | 'resourceGroups' | 'storageAccounts' | 'containers';

interface BrowseSelection {
  subscription: AzureSubscription | null;
  resourceGroup: AzureResourceGroup | null;
  storageAccount: AzureStorageAccount | null;
  container: AzureContainer | null;
}

const SESSION_KEY = 'sb_state';

function saveState(sel: BrowseSelection) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(sel));
  } catch {
    /* ignore */
  }
}

function loadState(): BrowseSelection | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) return JSON.parse(raw) as BrowseSelection;
  } catch {
    /* ignore */
  }
  return null;
}

// ─── Component ───

export function Component() {
  usePageTitle('Azure Storage');

  const navigate = useNavigate();
  const { providers, login } = useOidc();

  const azureConnected = providers.find((p) => p.configId === 'azure')?.authenticated ?? false;

  // Navigation state
  const [selection, setSelection] = useState<BrowseSelection>(() => {
    const saved = loadState();
    return saved ?? { subscription: null, resourceGroup: null, storageAccount: null, container: null };
  });

  const [level, setLevel] = useState<BrowseLevel>(() => {
    const saved = loadState();
    if (!saved) return 'subscriptions';
    if (saved.storageAccount) return 'containers';
    if (saved.resourceGroup) return 'storageAccounts';
    if (saved.subscription) return 'resourceGroups';
    return 'subscriptions';
  });

  // Access check state
  const [propagating, setPropagating] = useState(false);

  // Persist state
  useEffect(() => {
    saveState(selection);
  }, [selection]);

  // ─── Queries ───

  const subscriptionsQuery = useSubscriptions();

  const resourceGroupsQuery = useResourceGroups(
    selection.subscription?.subscriptionId ?? null,
  );

  const storageAccountsQuery = useStorageAccounts(
    selection.subscription?.subscriptionId ?? null,
    selection.resourceGroup?.name ?? null,
  );

  const containersQuery = useContainers(
    selection.subscription?.subscriptionId ?? null,
    selection.resourceGroup?.name ?? null,
    selection.storageAccount?.name ?? null,
  );

  const probeQuery = useProbeAccess(
    selection.storageAccount?.name ?? null,
    selection.container?.name ?? null,
    !!selection.container,
  );

  const assignRoleMutation = useAssignRole();

  // Derive access status from probe query data
  const accessGranted = probeQuery.data?.hasAccess ?? false;

  // ─── Handlers ───

  const handleSelectSubscription = useCallback((sub: AzureSubscription) => {
    setSelection({ subscription: sub, resourceGroup: null, storageAccount: null, container: null });
    setLevel('resourceGroups');
    setPropagating(false);
  }, []);

  const handleSelectResourceGroup = useCallback(
    (rg: AzureResourceGroup) => {
      setSelection((prev) => ({ ...prev, resourceGroup: rg, storageAccount: null, container: null }));
      setLevel('storageAccounts');
      setPropagating(false);
    },
    [],
  );

  const handleSelectStorageAccount = useCallback(
    (sa: AzureStorageAccount) => {
      setSelection((prev) => ({ ...prev, storageAccount: sa, container: null }));
      setLevel('containers');
      setPropagating(false);
    },
    [],
  );

  const handleSelectContainer = useCallback(
    (c: AzureContainer) => {
      setSelection((prev) => ({ ...prev, container: c }));
      setPropagating(false);
    },
    [],
  );

  const handleGrantAccess = useCallback(async () => {
    if (!selection.subscription || !selection.resourceGroup || !selection.storageAccount) return;
    setPropagating(true);
    try {
      await assignRoleMutation.mutateAsync({
        subscriptionId: selection.subscription.subscriptionId,
        resourceGroup: selection.resourceGroup.name,
        accountName: selection.storageAccount.name,
        role: 'reader',
      });
      // Poll for propagation
      const poll = setInterval(() => {
        probeQuery.refetch();
      }, 3000);
      // Auto-clear after 60s
      setTimeout(() => clearInterval(poll), 60000);
    } catch {
      setPropagating(false);
    }
  }, [selection, assignRoleMutation, probeQuery]);

  const handleOpenInFileManager = useCallback(() => {
    if (!selection.storageAccount || !selection.container) return;

    const context: StorageContext = {
      provider: 'azure',
      account: selection.storageAccount.name,
      container: selection.container.name,
    };
    sessionStorage.setItem('fm_context', JSON.stringify(context));
    navigate('/file-manager');
  }, [selection, navigate]);

  const handleGoBack = useCallback(() => {
    if (level === 'containers') {
      setSelection((prev) => ({ ...prev, storageAccount: null, container: null }));
      setLevel('storageAccounts');
    } else if (level === 'storageAccounts') {
      setSelection((prev) => ({ ...prev, resourceGroup: null, storageAccount: null, container: null }));
      setLevel('resourceGroups');
    } else if (level === 'resourceGroups') {
      setSelection({ subscription: null, resourceGroup: null, storageAccount: null, container: null });
      setLevel('subscriptions');
    }
    setPropagating(false);
  }, [level]);

  // ─── Not connected state ───

  if (!azureConnected) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <CloudOff className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-semibold text-foreground">Azure Not Connected</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Connect your Azure account to browse storage resources.
          </p>
        </div>
        <Button onClick={() => login('azure')} className="gap-1.5">
          Connect Azure
        </Button>
      </div>
    );
  }

  // ─── Helper render functions ───

  function renderLoading(label: string) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <Spinner size={24} />
        <p className="text-sm text-muted-foreground">Loading {label}...</p>
      </div>
    );
  }

  function renderError(message: string, onRetry: () => void) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="h-7 w-7 text-destructive" />
        </div>
        <div className="text-center">
          <p className="font-medium text-foreground">Something went wrong</p>
          <p className="mt-1 text-sm text-muted-foreground">{message}</p>
        </div>
        <Button variant="outline" size="sm" onClick={onRetry} className="gap-1.5">
          <RotateCcw className="h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  function renderEmpty(label: string) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <Folder className="h-7 w-7 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">No {label} found.</p>
      </div>
    );
  }

  // ─── Breadcrumb trail ───

  const breadcrumbItems: { label: string; level: BrowseLevel }[] = [
    { label: 'Subscriptions', level: 'subscriptions' },
  ];
  if (selection.subscription) {
    breadcrumbItems.push({ label: selection.subscription.displayName, level: 'resourceGroups' });
  }
  if (selection.resourceGroup) {
    breadcrumbItems.push({ label: selection.resourceGroup.name, level: 'storageAccounts' });
  }
  if (selection.storageAccount) {
    breadcrumbItems.push({ label: selection.storageAccount.name, level: 'containers' });
  }

  // ─── Render ───

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {level !== 'subscriptions' && (
              <Button variant="ghost" size="sm" onClick={handleGoBack} className="gap-1 -ml-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            )}
            <h1 className="text-xl font-semibold text-foreground">Azure Storage</h1>
          </div>
        </div>

        {/* Breadcrumb */}
        <nav className="mt-3 flex items-center gap-1 text-sm">
          {breadcrumbItems.map((crumb, idx) => (
            <span key={idx} className="flex items-center gap-1">
              {idx > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />}
              {idx === breadcrumbItems.length - 1 ? (
                <span className="font-medium text-foreground">{crumb.label}</span>
              ) : (
                <button
                  onClick={() => {
                    // Navigate to the clicked breadcrumb level
                    if (crumb.level === 'subscriptions') {
                      setSelection({ subscription: null, resourceGroup: null, storageAccount: null, container: null });
                      setLevel('subscriptions');
                    } else if (crumb.level === 'resourceGroups') {
                      setSelection((prev) => ({ ...prev, resourceGroup: null, storageAccount: null, container: null }));
                      setLevel('resourceGroups');
                    } else if (crumb.level === 'storageAccounts') {
                      setSelection((prev) => ({ ...prev, storageAccount: null, container: null }));
                      setLevel('storageAccounts');
                    }
                    setPropagating(false);
                  }}
                  className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  {crumb.label}
                </button>
              )}
            </span>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {/* Subscriptions level */}
        {level === 'subscriptions' && (
          <>
            {subscriptionsQuery.isLoading && renderLoading('subscriptions')}
            {subscriptionsQuery.isError &&
              renderError(
                subscriptionsQuery.error instanceof Error ? subscriptionsQuery.error.message : 'Failed to load subscriptions',
                () => subscriptionsQuery.refetch(),
              )}
            {subscriptionsQuery.data && subscriptionsQuery.data.length === 0 && renderEmpty('subscriptions')}
            {subscriptionsQuery.data && subscriptionsQuery.data.length > 0 && (
              <div className="space-y-1">
                {subscriptionsQuery.data.map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => handleSelectSubscription(sub)}
                    className="flex w-full items-center gap-3 rounded-lg border border-transparent bg-card px-4 py-3 text-left transition-colors hover:border-indigo-200 hover:bg-indigo-50/50 cursor-pointer"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100">
                      <HardDrive className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{sub.displayName}</p>
                      <p className="truncate text-xs text-muted-foreground">{sub.subscriptionId}</p>
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      {sub.state}
                    </Badge>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* Resource Groups level */}
        {level === 'resourceGroups' && (
          <>
            {resourceGroupsQuery.isLoading && renderLoading('resource groups')}
            {resourceGroupsQuery.isError &&
              renderError(
                resourceGroupsQuery.error instanceof Error ? resourceGroupsQuery.error.message : 'Failed to load resource groups',
                () => resourceGroupsQuery.refetch(),
              )}
            {resourceGroupsQuery.data && resourceGroupsQuery.data.length === 0 && renderEmpty('resource groups')}
            {resourceGroupsQuery.data && resourceGroupsQuery.data.length > 0 && (
              <div className="space-y-1">
                {resourceGroupsQuery.data.map((rg) => (
                  <button
                    key={rg.id}
                    onClick={() => handleSelectResourceGroup(rg)}
                    className="flex w-full items-center gap-3 rounded-lg border border-transparent bg-card px-4 py-3 text-left transition-colors hover:border-indigo-200 hover:bg-indigo-50/50 cursor-pointer"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100">
                      <Package className="h-5 w-5 text-purple-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{rg.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{rg.location}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* Storage Accounts level */}
        {level === 'storageAccounts' && (
          <>
            {storageAccountsQuery.isLoading && renderLoading('storage accounts')}
            {storageAccountsQuery.isError &&
              renderError(
                storageAccountsQuery.error instanceof Error ? storageAccountsQuery.error.message : 'Failed to load storage accounts',
                () => storageAccountsQuery.refetch(),
              )}
            {storageAccountsQuery.data && storageAccountsQuery.data.length === 0 && renderEmpty('storage accounts')}
            {storageAccountsQuery.data && storageAccountsQuery.data.length > 0 && (
              <div className="space-y-1">
                {storageAccountsQuery.data.map((sa) => (
                  <button
                    key={sa.id}
                    onClick={() => handleSelectStorageAccount(sa)}
                    className="flex w-full items-center gap-3 rounded-lg border border-transparent bg-card px-4 py-3 text-left transition-colors hover:border-indigo-200 hover:bg-indigo-50/50 cursor-pointer"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100">
                      <Database className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{sa.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {sa.location} &middot; {sa.accessTier}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* Containers level */}
        {level === 'containers' && (
          <>
            {containersQuery.isLoading && renderLoading('containers')}
            {containersQuery.isError &&
              renderError(
                containersQuery.error instanceof Error ? containersQuery.error.message : 'Failed to load containers',
                () => containersQuery.refetch(),
              )}
            {containersQuery.data && containersQuery.data.length === 0 && renderEmpty('containers')}
            {containersQuery.data && containersQuery.data.length > 0 && (
              <div className="space-y-1">
                {containersQuery.data.map((c) => {
                  const isSelected = selection.container?.id === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => handleSelectContainer(c)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-lg border bg-card px-4 py-3 text-left transition-colors hover:border-indigo-200 hover:bg-indigo-50/50 cursor-pointer',
                        isSelected ? 'border-indigo-400 bg-indigo-50 ring-1 ring-indigo-400/30' : 'border-transparent',
                      )}
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100">
                        <Folder className="h-5 w-5 text-amber-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{c.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          Last modified: {c.lastModifiedTime}
                        </p>
                      </div>
                      {isSelected && (
                        <Badge variant="default" className="shrink-0">
                          Selected
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Container selected -- access check area */}
            {selection.container && (
              <div className="mt-6">
                {/* Probing access */}
                {probeQuery.isLoading && (
                  <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
                    <Spinner size={18} />
                    <span className="text-sm text-muted-foreground">Checking access to container...</span>
                  </div>
                )}

                {/* No access */}
                {probeQuery.data && !probeQuery.data.hasAccess && !accessGranted && !propagating && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <div className="flex items-start gap-3">
                      <Shield className="mt-0.5 h-5 w-5 text-amber-600" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-amber-800">Access Required</p>
                        <p className="mt-1 text-sm text-amber-700">
                          You don't have read access to this storage account. Grant the Storage Blob Data Reader role
                          to browse files.
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleGrantAccess}
                          disabled={assignRoleMutation.isPending}
                          className="mt-3 gap-1.5 border-amber-300 text-amber-800 hover:bg-amber-100"
                        >
                          {assignRoleMutation.isPending ? (
                            <>
                              <Spinner size={14} />
                              Granting...
                            </>
                          ) : (
                            <>
                              <Shield className="h-4 w-4" />
                              Grant Read Access
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Propagating */}
                {propagating && !accessGranted && (
                  <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
                    <Spinner size={18} className="text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-blue-800">Propagating role assignment...</p>
                      <p className="text-xs text-blue-600">
                        This may take up to 30 seconds. The page will update automatically.
                      </p>
                    </div>
                  </div>
                )}

                {/* Access granted */}
                {accessGranted && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <ShieldCheck className="h-5 w-5 text-emerald-600" />
                        <div>
                          <p className="text-sm font-medium text-emerald-800">Access Verified</p>
                          <p className="text-xs text-emerald-600">
                            Ready to browse <strong>{selection.container.name}</strong> in{' '}
                            <strong>{selection.storageAccount?.name}</strong>
                          </p>
                        </div>
                      </div>
                      <Button size="sm" onClick={handleOpenInFileManager} className="gap-1.5">
                        Open in File Manager
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Probe error */}
                {probeQuery.isError && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="h-5 w-5 text-destructive" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-destructive">Failed to check access</p>
                        <p className="text-xs text-muted-foreground">
                          {probeQuery.error instanceof Error ? probeQuery.error.message : 'An error occurred'}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => probeQuery.refetch()}
                        className="gap-1.5"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Retry
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
