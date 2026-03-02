import { useState, useMemo, useCallback } from 'react';
import { usePageTitle } from '@/hooks/use-page-title';
import { useAuth } from '@/auth/auth-context';
import { useProcesses, useProcessInstance, usePurgeProcess, useRestartProcess, useTerminateProcess } from '@/api/process.api';
import { useOidc } from '@/auth/oidc-provider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn, formatDateTime, formatRelative, formatFileSize, extractError } from '@/lib/utils';
import {
  RefreshCw, ChevronDown, ChevronUp, ChevronRight, ChevronLeft, Trash2, RotateCcw, CheckCircle2, XCircle,
  Clock, Ban, AlertCircle, Play, Users, Filter, Calendar, File, Folder, Timer, StopCircle, AlertTriangle,
} from 'lucide-react';
import { OrchestrationRuntimeStatus } from '@/api/types';
import type { OrchestrationInstance, ProcessListParams } from '@/api/types';

// ─── Status configuration ───

const statusConfig: Record<OrchestrationRuntimeStatus, { label: string; color: string; icon: typeof Play }> = {
  [OrchestrationRuntimeStatus.Running]: { label: 'Running', color: 'text-blue-600 bg-blue-50', icon: Play },
  [OrchestrationRuntimeStatus.Completed]: { label: 'Completed', color: 'text-emerald-600 bg-emerald-50', icon: CheckCircle2 },
  [OrchestrationRuntimeStatus.ContinuedAsNew]: { label: 'Continued', color: 'text-purple-600 bg-purple-50', icon: RotateCcw },
  [OrchestrationRuntimeStatus.Failed]: { label: 'Failed', color: 'text-red-600 bg-red-50', icon: XCircle },
  [OrchestrationRuntimeStatus.Canceled]: { label: 'Canceled', color: 'text-orange-600 bg-orange-50', icon: Ban },
  [OrchestrationRuntimeStatus.Terminated]: { label: 'Terminated', color: 'text-orange-600 bg-orange-50', icon: Ban },
  [OrchestrationRuntimeStatus.Pending]: { label: 'Pending', color: 'text-amber-600 bg-amber-50', icon: Clock },
};

// ─── Friendly name mapping ───

const friendlyNames: Record<string, string> = {
  azurestoragetogooglephotosorchestrator: 'Azure Storage \u2192 Google Photos',
  copyazureblobstogooglephotosorchestrator: 'Azure Storage \u2192 Google Photos',
  googlestoragetogooglephotosorchestrator: 'Google Cloud Storage \u2192 Google Photos',
  copygooglestoragetogooglephotosorchestrator: 'Google Cloud Storage \u2192 Google Photos',
  googlephotostoazureorchestrator: 'Google Photos \u2192 Azure Storage',
  copygooglephotostoazureorchestrator: 'Google Photos \u2192 Azure Storage',
  googledrivetoazureorchestrator: 'Google Drive \u2192 Azure Storage',
  copygoogledrivetoazureorchestrator: 'Google Drive \u2192 Azure Storage',
  gcstoazureorchestrator: 'Google Cloud Storage \u2192 Azure Storage',
  copygcstoazureorchestrator: 'Google Cloud Storage \u2192 Azure Storage',
  azuretogcsorchestrator: 'Azure Storage \u2192 Google Cloud Storage',
  copyazuretogcsorchestrator: 'Azure Storage \u2192 Google Cloud Storage',
  dropboxtoazureorchestrator: 'Dropbox \u2192 Azure Storage',
  copydropboxtoazureorchestrator: 'Dropbox \u2192 Azure Storage',
  azuretodropboxorchestrator: 'Azure Storage \u2192 Dropbox',
  copyazuretodropboxorchestrator: 'Azure Storage \u2192 Dropbox',
  gcstodropboxorchestrator: 'Google Cloud Storage \u2192 Dropbox',
  copygcstodropboxorchestrator: 'Google Cloud Storage \u2192 Dropbox',
  gcstodriveorchestrator: 'Google Cloud Storage \u2192 Google Drive',
  copygcstodriveorchestrator: 'Google Cloud Storage \u2192 Google Drive',
  dropboxtogcsorchestrator: 'Dropbox \u2192 Google Cloud Storage',
  copydropboxtogcsorchestrator: 'Dropbox \u2192 Google Cloud Storage',
  dropboxtogooglephotosorchestrator: 'Dropbox \u2192 Google Photos',
  copydropboxtogooglephotosorchestrator: 'Dropbox \u2192 Google Photos',
  dropboxtodriveorchestrator: 'Dropbox \u2192 Google Drive',
  copydropboxtodriveorchestrator: 'Dropbox \u2192 Google Drive',
  azuretodriveorchestrator: 'Azure Storage \u2192 Google Drive',
  copyazuretodriveorchestrator: 'Azure Storage \u2192 Google Drive',
  googledrivetogcsorchestrator: 'Google Drive \u2192 Google Cloud Storage',
  copygoogledrivetogcsorchestrator: 'Google Drive \u2192 Google Cloud Storage',
  googledrivetodropboxorchestrator: 'Google Drive \u2192 Dropbox',
  copygoogledrivetodropboxorchestrator: 'Google Drive \u2192 Dropbox',
  googledrivetogooglephotosochestrator: 'Google Drive \u2192 Google Photos',
  copygoogledrivetogooglephotosochestrator: 'Google Drive \u2192 Google Photos',
  googlephotostogcsorchestrator: 'Google Photos \u2192 Google Cloud Storage',
  copygooglephotostogcsorchestrator: 'Google Photos \u2192 Google Cloud Storage',
  googlephotostodropboxorchestrator: 'Google Photos \u2192 Dropbox',
  copygooglephotostodropboxorchestrator: 'Google Photos \u2192 Dropbox',
  googlephotostogoogledriveorchestrator: 'Google Photos \u2192 Google Drive',
  copygooglephotostogoogledriveorchestrator: 'Google Photos \u2192 Google Drive',
};

function getFriendlyName(rawName: string): string {
  return friendlyNames[rawName.toLowerCase()] ?? rawName;
}

const PARENT_ORCHESTRATOR_TYPES = [
  { value: 'azurestoragetogooglephotosorchestrator', label: 'Azure Storage \u2192 Google Photos' },
  { value: 'googlestoragetogooglephotosorchestrator', label: 'Google Cloud Storage \u2192 Google Photos' },
  { value: 'googlephotostoazureorchestrator', label: 'Google Photos \u2192 Azure Storage' },
  { value: 'googledrivetoazureorchestrator', label: 'Google Drive \u2192 Azure Storage' },
  { value: 'gcstoazureorchestrator', label: 'Google Cloud Storage \u2192 Azure Storage' },
  { value: 'azuretogcsorchestrator', label: 'Azure Storage \u2192 Google Cloud Storage' },
  { value: 'dropboxtoazureorchestrator', label: 'Dropbox \u2192 Azure Storage' },
  { value: 'azuretodropboxorchestrator', label: 'Azure Storage \u2192 Dropbox' },
  { value: 'gcstodropboxorchestrator', label: 'Google Cloud Storage \u2192 Dropbox' },
  { value: 'gcstodriveorchestrator', label: 'Google Cloud Storage \u2192 Google Drive' },
  { value: 'dropboxtogcsorchestrator', label: 'Dropbox \u2192 Google Cloud Storage' },
  { value: 'dropboxtogooglephotosorchestrator', label: 'Dropbox \u2192 Google Photos' },
  { value: 'dropboxtodriveorchestrator', label: 'Dropbox \u2192 Google Drive' },
  { value: 'azuretodriveorchestrator', label: 'Azure Storage \u2192 Google Drive' },
  { value: 'googledrivetogcsorchestrator', label: 'Google Drive \u2192 Google Cloud Storage' },
  { value: 'googledrivetodropboxorchestrator', label: 'Google Drive \u2192 Dropbox' },
  { value: 'googledrivetogooglephotosochestrator', label: 'Google Drive \u2192 Google Photos' },
  { value: 'googlephotostogcsorchestrator', label: 'Google Photos \u2192 Google Cloud Storage' },
  { value: 'googlephotostodropboxorchestrator', label: 'Google Photos \u2192 Dropbox' },
  { value: 'googlephotostogoogledriveorchestrator', label: 'Google Photos \u2192 Google Drive' },
] as const;

// ─── Grouping logic ───

interface ProcessGroup {
  parent: OrchestrationInstance;
  children: OrchestrationInstance[];
}

function groupInstances(instances: OrchestrationInstance[]): ProcessGroup[] {
  const parents: OrchestrationInstance[] = [];
  const children: OrchestrationInstance[] = [];

  for (const inst of instances) {
    if (inst.name.toLowerCase().startsWith('copy')) {
      children.push(inst);
    } else {
      parents.push(inst);
    }
  }

  const groups: ProcessGroup[] = parents.map((parent) => ({
    parent,
    children: children.filter((child) => child.instanceId.includes(parent.instanceId)),
  }));

  const matchedChildIds = new Set(groups.flatMap((g) => g.children.map((c) => c.instanceId)));
  const orphans = children.filter((c) => !matchedChildIds.has(c.instanceId));

  for (const orphan of orphans) {
    groups.push({ parent: orphan, children: [] });
  }

  // Sorting is handled server-side; preserve the order returned by the API.
  return groups;
}

// ─── Output parsing ───

interface FileResult {
  filename: string;
  path: string;
  success: boolean;
  errorMessage?: string;
  contentLength?: number;
}

function parseFileResults(serializedOutput: string | null | undefined): FileResult[] | null {
  if (!serializedOutput) return null;
  try {
    const parsed = JSON.parse(serializedOutput);
    if (!parsed || typeof parsed !== 'object') return null;

    // BlobCopyResult format: { results: [{ filename, blobPath, success, errorMessage, contentLength }] }
    // GcsCopyResult format: { results: [{ filename, objectName, success, errorMessage, contentLength }] }
    if (Array.isArray(parsed.results)) {
      return parsed.results.map((r: Record<string, unknown>) => ({
        filename: (r.filename ?? r.Filename ?? '') as string,
        path: (r.blobPath ?? r.BlobPath ?? r.objectName ?? r.ObjectName ?? '') as string,
        success: (r.success ?? r.Success ?? false) as boolean,
        errorMessage: (r.errorMessage ?? r.ErrorMessage ?? undefined) as string | undefined,
        contentLength: (r.contentLength ?? r.ContentLength ?? undefined) as number | undefined,
      }));
    }

    // NewMediaItemResult format: { newMediaItemResults: [{ mediaItem: { id, filename }, status: { message } }] }
    if (Array.isArray(parsed.newMediaItemResults)) {
      return parsed.newMediaItemResults.map((r: Record<string, unknown>) => {
        const mediaItem = r.mediaItem as Record<string, unknown> | null;
        const status = r.status as Record<string, unknown> | null;
        const id = mediaItem?.id as string | null;
        return {
          filename: (mediaItem?.filename ?? '') as string,
          path: '',
          success: !!id && id.length > 0,
          errorMessage: (!id ? (status?.message ?? 'Upload failed') : undefined) as string | undefined,
        };
      });
    }

    return null;
  } catch {
    return null;
  }
}

function parseStartedBy(serializedInput: string | null | undefined): string | null {
  if (!serializedInput) return null;
  try {
    const parsed = JSON.parse(serializedInput);
    return parsed?.startedBy ?? parsed?.StartedBy ?? null;
  } catch {
    return null;
  }
}

function parseCustomStatus(serializedCustomStatus: string | null | undefined): string | null {
  if (!serializedCustomStatus) return null;
  try {
    const parsed = JSON.parse(serializedCustomStatus);
    if (parsed === null || parsed === undefined) return null;
    if (typeof parsed === 'string') return parsed || null;
    if (typeof parsed === 'object') {
      // Format progress object nicely: "42/150 - uploading photo.jpg"
      if ('completed' in parsed && 'total' in parsed) {
        const parts = [`${parsed.completed}/${parsed.total}`];
        if (parsed.phase) parts.push(parsed.phase);
        if (parsed.lastFile) parts.push(parsed.lastFile);
        return parts.join(' \u2013 ');
      }
      return parsed.message ?? parsed.status ?? null;
    }
    return null;
  } catch {
    return serializedCustomStatus;
  }
}

// ─── Duration formatting ───

function formatDuration(startStr: string, endStr: string): string | null {
  try {
    const start = new Date(startStr).getTime();
    const end = new Date(endStr).getTime();
    const diffMs = end - start;
    if (diffMs < 0) return null;

    const seconds = Math.floor(diffMs / 1000);
    if (seconds < 60) return `${seconds}s`;

    const minutes = Math.floor(seconds / 60);
    const remainSec = seconds % 60;
    if (minutes < 60) return `${minutes}m ${remainSec}s`;

    const hours = Math.floor(minutes / 60);
    const remainMin = minutes % 60;
    return `${hours}h ${remainMin}m`;
  } catch {
    return null;
  }
}

// ─── Started By badges ───

interface ProviderEmail {
  provider: string;
  email: string;
}

const nameToProvider: Record<string, string> = {
  'azure storage': 'azure',
  'google cloud storage': 'google',
  'google photos': 'google',
  'google drive': 'google',
  'dropbox': 'dropbox',
};

function deriveProviders(friendlyName: string): string[] {
  const lower = friendlyName.toLowerCase();
  const providers: string[] = [];
  for (const [key, provider] of Object.entries(nameToProvider)) {
    if (lower.includes(key) && !providers.includes(provider)) {
      providers.push(provider);
    }
  }
  return providers;
}

function parseStartedByBadges(startedBy: string, friendlyName: string): ProviderEmail[] {
  // Format: "google:user@gmail.com|azure:user@gmail.com" or just "user@gmail.com"
  const entries = startedBy.split('|').map((part) => {
    const colonIdx = part.indexOf(':');
    if (colonIdx > 0) {
      return { provider: part.slice(0, colonIdx), email: part.slice(colonIdx + 1) };
    }
    return { provider: '', email: part };
  });

  // If no entries have a provider prefix, derive from the process name
  if (!entries.some(e => e.provider) && entries.length === 1) {
    const providers = deriveProviders(friendlyName);
    if (providers.length > 0) {
      const email = entries[0].email;
      return providers.map(p => ({ provider: p, email }));
    }
  }

  return entries;
}

const providerBadgeColors: Record<string, string> = {
  google: 'bg-red-50 text-red-700 border-red-200',
  azure: 'bg-blue-50 text-blue-700 border-blue-200',
  dropbox: 'bg-sky-50 text-sky-700 border-sky-200',
};

// ─── File folder grouping ───

interface FolderGroup {
  folder: string;
  files: FileResult[];
}

function groupByFolder(files: FileResult[]): FolderGroup[] {
  const map = new Map<string, FileResult[]>();
  for (const f of files) {
    const lastSlash = f.path.lastIndexOf('/');
    const folder = lastSlash > 0 ? f.path.slice(0, lastSlash + 1) : '/';
    if (!map.has(folder)) map.set(folder, []);
    map.get(folder)!.push(f);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([folder, files]) => ({ folder, files }));
}

// ─── Filter statuses ───

const PAGE_SIZE = 10;

const FILTER_STATUSES = [
  OrchestrationRuntimeStatus.Running,
  OrchestrationRuntimeStatus.Completed,
  OrchestrationRuntimeStatus.Failed,
  OrchestrationRuntimeStatus.Pending,
  OrchestrationRuntimeStatus.Terminated,
] as const;

// ─── Component ───

export function Component() {
  usePageTitle('Processes');

  const { isAdmin } = useAuth();

  // Filter state
  const [selectedStatuses, setSelectedStatuses] = useState<Set<OrchestrationRuntimeStatus>>(
    new Set(FILTER_STATUSES)
  );
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [showAllUsers, setShowAllUsers] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedNames, setSelectedNames] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'createdAt' | 'lastUpdatedAt'>('lastUpdatedAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [onlyFailures, setOnlyFailures] = useState(false);

  // Build query params
  const params = useMemo<ProcessListParams>(() => {
    const p: ProcessListParams = {
      pageSize: PAGE_SIZE,
      page: currentPage,
      sortBy,
      sortDir,
    };
    if (selectedStatuses.size < FILTER_STATUSES.length) {
      p.statusList = Array.from(selectedStatuses);
    }
    if (fromDate) p.from = new Date(fromDate).toISOString();
    if (toDate) p.to = new Date(toDate + 'T23:59:59').toISOString();
    if (selectedNames.length > 0) p.names = selectedNames;
    if (isAdmin && showAllUsers) p.all = true;
    return p;
  }, [selectedStatuses, fromDate, toDate, isAdmin, showAllUsers, currentPage, sortBy, sortDir, selectedNames]);

  const hasActiveFilter =
    selectedStatuses.has(OrchestrationRuntimeStatus.Running) ||
    selectedStatuses.has(OrchestrationRuntimeStatus.Pending);
  const refetchInterval = hasActiveFilter ? 5000 : false;

  const { data: response, isLoading, isError, error, refetch } = useProcesses(params, refetchInterval);

  const purge = usePurgeProcess();

  const allGroups = useMemo(() => groupInstances(response?.items ?? []), [response?.items]);
  const groups = useMemo(
    () => onlyFailures ? allGroups.filter(g => g.parent.hasFailedFiles) : allGroups,
    [allGroups, onlyFailures],
  );

  const totalCount = response?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedGroups = groups; // Server already returns one page

  // Reset to page 1 when filters or sort change (but not when page itself changes)
  const filterKey = useMemo(
    () => JSON.stringify({
      s: Array.from(selectedStatuses).sort(),
      f: fromDate, t: toDate, a: showAllUsers, sb: sortBy, sd: sortDir, n: selectedNames,
    }),
    [selectedStatuses, fromDate, toDate, showAllUsers, sortBy, sortDir, selectedNames],
  );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useMemo(() => setCurrentPage(1), [filterKey]);

  const toggleGroup = useCallback((instanceId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(instanceId)) {
        next.delete(instanceId);
      } else {
        next.add(instanceId);
      }
      return next;
    });
  }, []);

  const toggleStatus = useCallback((status: OrchestrationRuntimeStatus) => {
    setSelectedStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(status)) {
        next.delete(status);
      } else {
        next.add(status);
      }
      return next;
    });
  }, []);

  const handleDelete = useCallback(
    (instanceId: string) => {
      purge.mutate(instanceId);
    },
    [purge]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Processes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {totalCount} process{totalCount !== 1 ? 'es' : ''}
            {totalPages > 1 ? ` \u00b7 Page ${safePage} of ${totalPages}` : ''}
            {refetchInterval ? ' \u00b7 Auto-refreshing' : ''}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Sort controls */}
          <Select value={sortBy} onValueChange={(val: 'createdAt' | 'lastUpdatedAt') => setSortBy(val)}>
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="lastUpdatedAt">Last Updated</SelectItem>
              <SelectItem value="createdAt">Created</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setSortDir((d) => d === 'asc' ? 'desc' : 'asc')}
            title={sortDir === 'asc' ? 'Ascending (oldest first)' : 'Descending (newest first)'}
          >
            {sortDir === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters((prev) => !prev)}
            className={cn(showFilters && 'bg-accent')}
          >
            <Filter className="w-4 h-4 mr-1.5" />
            Filters
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={cn('w-4 h-4 mr-1.5', isLoading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="bg-card rounded-lg border border-border p-4 shadow-sm space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
            {/* Status checkboxes */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</Label>
              <div className="flex flex-wrap gap-3">
                {FILTER_STATUSES.map((status) => {
                  const cfg = statusConfig[status];
                  return (
                    <label key={status} className="flex items-center gap-1.5 cursor-pointer select-none">
                      <Checkbox
                        checked={selectedStatuses.has(status)}
                        onCheckedChange={() => toggleStatus(status)}
                      />
                      <span className="text-sm">{cfg.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Process type filter */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Process Type</Label>
              <Select
                value={selectedNames.length === 1 ? selectedNames[0] : '__all__'}
                onValueChange={(val: string) => setSelectedNames(val === '__all__' ? [] : [val])}
              >
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="All process types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All process types</SelectItem>
                  {PARENT_ORCHESTRATOR_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date range */}
            <div className="flex items-end gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="from-date" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  From
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    id="from-date"
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="pl-8 w-40"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="to-date" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  To
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    id="to-date"
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="pl-8 w-40"
                  />
                </div>
              </div>
            </div>

            {/* Has failures filter */}
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <Checkbox
                  checked={onlyFailures}
                  onCheckedChange={(checked) => setOnlyFailures(checked === true)}
                />
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-sm">Has failures only</span>
              </label>
            </div>

            {/* Admin: all users toggle */}
            {isAdmin && (
              <div className="flex items-center gap-2">
                <Button
                  variant={showAllUsers ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setShowAllUsers((prev) => !prev)}
                >
                  <Users className="w-4 h-4 mr-1.5" />
                  {showAllUsers ? 'All Users' : 'My Processes'}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Loading state */}
      {isLoading && !response && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Spinner size={32} />
          <p className="mt-4 text-sm">Loading processes...</p>
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="rounded-full bg-red-50 p-3 mb-4">
            <AlertCircle className="w-6 h-6 text-red-500" />
          </div>
          <p className="text-sm font-medium text-foreground mb-1">Failed to load processes</p>
          <p className="text-sm text-muted-foreground mb-4">{extractError(error)}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-1.5" />
            Try Again
          </Button>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !isError && groups.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <div className="rounded-full bg-slate-100 p-3 mb-4">
            <Clock className="w-6 h-6 text-slate-400" />
          </div>
          <p className="text-sm font-medium text-foreground mb-1">No processes found</p>
          <p className="text-sm text-muted-foreground">
            Migration jobs will appear here once started.
          </p>
        </div>
      )}

      {/* Process groups list */}
      {!isLoading && !isError && groups.length > 0 && (
        <div className="space-y-3">
          {paginatedGroups.map((group) => (
            <ProcessGroupCard
              key={group.parent.instanceId}
              group={group}
              isExpanded={expandedGroups.has(group.parent.instanceId)}
              onToggle={() => toggleGroup(group.parent.instanceId)}
              onDelete={handleDelete}
              isPurging={purge.isPending}
            />
          ))}

          {/* Pagination controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {safePage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Process Group Card ───

interface ProcessGroupCardProps {
  group: ProcessGroup;
  isExpanded: boolean;
  onToggle: () => void;
  onDelete: (instanceId: string) => void;
  isPurging: boolean;
}

function ProcessGroupCard({ group, isExpanded, onToggle, onDelete, isPurging }: ProcessGroupCardProps) {
  const { parent, children } = group;
  const oidc = useOidc();
  const restart = useRestartProcess();
  const terminate = useTerminateProcess();
  const cfg = statusConfig[parent.runtimeStatus] ?? statusConfig[OrchestrationRuntimeStatus.Pending];
  const StatusIcon = cfg.icon;
  const friendlyName = getFriendlyName(parent.name);
  const startedBy = parseStartedBy(parent.serializedInput);
  const duration = formatDuration(parent.createdAt, parent.lastUpdatedAt);

  // Fetch full detail when expanded (includes serializedOutput)
  const { data: detail } = useProcessInstance(parent.instanceId, isExpanded);

  const customStatus = parseCustomStatus(
    detail?.serializedCustomStatus ?? parent.serializedCustomStatus
  );

  const fileResults = useMemo(
    () => (detail ? parseFileResults(detail.serializedOutput) : null),
    [detail]
  );

  const succeededFiles = useMemo(
    () => fileResults?.filter((f) => f.success) ?? [],
    [fileResults]
  );
  const failedFiles = useMemo(
    () => fileResults?.filter((f) => !f.success) ?? [],
    [fileResults]
  );

  const canRetry =
    parent.runtimeStatus === OrchestrationRuntimeStatus.Completed && parent.hasFailedFiles ||
    parent.runtimeStatus === OrchestrationRuntimeStatus.Failed;

  const canTerminate =
    parent.runtimeStatus === OrchestrationRuntimeStatus.Running ||
    parent.runtimeStatus === OrchestrationRuntimeStatus.Pending;

  const [restartError, setRestartError] = useState<string | null>(null);

  const handleRestart = useCallback(async () => {
    setRestartError(null);
    const azureAccessToken = await oidc.getAccessToken('azure-storage');
    restart.mutate(
      {
        instanceId: parent.instanceId,
        azureAccessToken: azureAccessToken ?? undefined,
      },
      {
        onError: (err) => setRestartError(extractError(err)),
      },
    );
  }, [oidc, restart, parent.instanceId]);

  return (
    <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
      {/* Group header */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent/50 transition-colors cursor-pointer"
      >
        {/* Expand/collapse icon */}
        <span className="text-muted-foreground shrink-0">
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </span>

        {/* Status icon */}
        <span className={cn('shrink-0 rounded-full p-1.5', cfg.color)}>
          <StatusIcon className="w-3.5 h-3.5" />
        </span>

        {/* Process info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm text-foreground truncate">{friendlyName}</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {cfg.label}
            </Badge>
            {children.length > 0 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {children.length} sub-task{children.length !== 1 ? 's' : ''}
              </Badge>
            )}
            {parent.hasFailedFiles && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                Has failures
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground flex-wrap">
            <span>{formatRelative(parent.createdAt)}</span>
            {duration && (
              <>
                <span>&middot;</span>
                <span className="inline-flex items-center gap-0.5">
                  <Timer className="w-3 h-3" />
                  {duration}
                </span>
              </>
            )}
            {startedBy && parseStartedByBadges(startedBy, friendlyName).map((pe, i) => (
              <span
                key={i}
                className={cn(
                  'inline-flex items-center gap-1 rounded-md border px-1.5 py-0 text-[10px] font-medium',
                  providerBadgeColors[pe.provider] ?? 'bg-slate-50 text-slate-700 border-slate-200'
                )}
              >
                {pe.provider && <span className="opacity-60">{pe.provider}</span>}
                {pe.email}
              </span>
            ))}
          </div>
        </div>
      </button>

      {/* Expanded detail */}
      {isExpanded && (
        <div className="border-t border-border">
          {/* Parent detail */}
          <div className="px-4 py-3 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <DetailRow label="Instance ID" value={parent.instanceId} mono />
              <DetailRow label="Name" value={friendlyName} />
              <DetailRow label="Created" value={formatDateTime(parent.createdAt)} />
              <DetailRow label="Last Updated" value={formatDateTime(parent.lastUpdatedAt)} />
            </div>

            {/* Custom status (progress) */}
            {customStatus && (
              <div className="rounded-md bg-muted/50 px-3 py-2">
                <p className="text-xs font-medium text-muted-foreground mb-0.5">Progress</p>
                <p className="text-sm text-foreground">{customStatus}</p>
              </div>
            )}

            {/* Output summary */}
            {fileResults && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span className="text-foreground font-medium">{succeededFiles.length}</span>
                  <span className="text-muted-foreground">succeeded</span>
                </div>
                {failedFiles.length > 0 && (
                  <div className="flex items-center gap-1.5 text-sm">
                    <XCircle className="w-4 h-4 text-red-500" />
                    <span className="text-foreground font-medium">{failedFiles.length}</span>
                    <span className="text-muted-foreground">failed</span>
                  </div>
                )}
              </div>
            )}

            {/* File result lists */}
            {fileResults && succeededFiles.length > 0 && (
              <FileResultSection
                title="Copied Files"
                files={succeededFiles}
                variant="success"
              />
            )}
            {fileResults && failedFiles.length > 0 && (
              <FileResultSection
                title="Failed Files"
                files={failedFiles}
                variant="error"
              />
            )}

            {/* Loading detail indicator */}
            {isExpanded && !detail && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Spinner size={14} />
                <span>Loading details...</span>
              </div>
            )}

            {/* Restart error */}
            {restartError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {restartError}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-1">
              {canTerminate && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" disabled={terminate.isPending}>
                      <StopCircle className={cn('w-3.5 h-3.5 mr-1.5', terminate.isPending && 'animate-spin')} />
                      {terminate.isPending ? 'Terminating...' : 'Terminate'}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Terminate Process</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to terminate this running process? Files already copied will remain,
                        but the remaining transfers will be stopped.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => terminate.mutate(parent.instanceId)}
                        className="bg-orange-600 text-white hover:bg-orange-700"
                      >
                        Terminate
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              {canRetry && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRestart}
                  disabled={restart.isPending}
                >
                  <RotateCcw className={cn('w-3.5 h-3.5 mr-1.5', restart.isPending && 'animate-spin')} />
                  {restart.isPending ? 'Restarting...' : 'Retry'}
                </Button>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" disabled={isPurging}>
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Process</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this process instance? This action cannot be undone
                      and will remove all history for this orchestration.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onDelete(parent.instanceId)}
                      className="bg-destructive text-destructive-foreground hover:bg-red-600"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {/* Children */}
          {children.length > 0 && (
            <div className="border-t border-border">
              <div className="px-4 py-2 bg-muted/30">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Sub-tasks ({children.length})
                </p>
              </div>
              <div className="divide-y divide-border">
                {children.map((child) => (
                  <ChildInstanceRow key={child.instanceId} instance={child} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── File Result Section (collapsible) ───

interface FileResultSectionProps {
  title: string;
  files: FileResult[];
  variant: 'success' | 'error';
}

function FileResultSection({ title, files, variant }: FileResultSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const folderGroups = useMemo(() => groupByFolder(files), [files]);
  const colors = variant === 'success'
    ? 'border-emerald-200 bg-emerald-50/50'
    : 'border-red-200 bg-red-50/50';
  const headerColors = variant === 'success'
    ? 'text-emerald-700'
    : 'text-red-700';

  return (
    <div className={cn('rounded-md border', colors)}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left cursor-pointer hover:bg-black/[0.02] transition-colors"
      >
        <span className="text-muted-foreground shrink-0">
          {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </span>
        <span className={cn('text-xs font-medium', headerColors)}>
          {title} ({files.length})
        </span>
      </button>
      {isOpen && (
        <div className="border-t border-inherit px-3 py-2 space-y-1">
          {folderGroups.map((group) => (
            <FolderGroupRow key={group.folder} group={group} showError={variant === 'error'} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Folder Group (collapsible) ───

function FolderGroupRow({ group, showError }: { group: FolderGroup; showError: boolean }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center gap-1.5 py-0.5 text-left cursor-pointer hover:bg-black/[0.02] rounded transition-colors"
      >
        <span className="text-muted-foreground shrink-0">
          {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </span>
        <Folder className="w-3.5 h-3.5 text-amber-500 shrink-0" />
        <span className="text-xs font-medium text-foreground truncate">{group.folder}</span>
        <span className="text-[10px] text-muted-foreground shrink-0">({group.files.length})</span>
      </button>
      {isOpen && (
        <div className="ml-6 pl-2 border-l border-border/50 space-y-0.5 py-0.5">
          {group.files.map((f, i) => (
            <div key={i} className="text-xs py-0.5">
              <div className="flex items-center gap-1.5">
                <File className="w-3 h-3 text-muted-foreground shrink-0" />
                <span className="text-foreground break-all">{f.filename}</span>
                {f.contentLength != null && f.contentLength > 0 && (
                  <span className="text-muted-foreground shrink-0">{formatFileSize(f.contentLength)}</span>
                )}
              </div>
              {showError && f.errorMessage && (
                <p className="text-red-600 ml-[18px] mt-0.5 break-words" title={f.errorMessage}>
                  {f.errorMessage}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Child Instance Row ───

function ChildInstanceRow({ instance }: { instance: OrchestrationInstance }) {
  const cfg = statusConfig[instance.runtimeStatus] ?? statusConfig[OrchestrationRuntimeStatus.Pending];
  const StatusIcon = cfg.icon;
  const customStatus = parseCustomStatus(instance.serializedCustomStatus);
  const duration = formatDuration(instance.createdAt, instance.lastUpdatedAt);

  return (
    <div className="px-4 py-2.5 flex items-center gap-3">
      <span className={cn('shrink-0 rounded-full p-1', cfg.color)}>
        <StatusIcon className="w-3 h-3" />
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-foreground truncate">{getFriendlyName(instance.name)}</span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {cfg.label}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {instance.instanceId}
          {customStatus && <span> &middot; {customStatus}</span>}
        </p>
      </div>
      {duration && (
        <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground shrink-0">
          <Timer className="w-3 h-3" />
          {duration}
        </span>
      )}
      <span className="text-xs text-muted-foreground shrink-0">{formatRelative(instance.lastUpdatedAt)}</span>
    </div>
  );
}

// ─── Detail Row ───

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn('text-sm text-foreground', mono && 'font-mono text-xs break-all')}>{value}</span>
    </div>
  );
}

export { Component as ProcessesPage };
export default Component;
