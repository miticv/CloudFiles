import { useState, useMemo, useCallback } from 'react';
import { usePageTitle } from '@/hooks/use-page-title';
import { useAuth } from '@/auth/auth-context';
import { useProcesses, useProcessInstance, usePurgeProcess } from '@/api/process.api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn, formatDateTime, formatRelative, formatFileSize, extractError } from '@/lib/utils';
import {
  RefreshCw, ChevronDown, ChevronRight, Trash2, RotateCcw, CheckCircle2, XCircle,
  Clock, Ban, AlertCircle, Play, Users, Filter, Calendar, File, Folder, Timer,
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

function getFriendlyName(rawName: string): string {
  if (rawName.includes('AzureStorageToGooglePhotos')) return 'Azure \u2192 Google Photos';
  if (rawName.includes('GoogleStorageToGooglePhotos')) return 'GCS \u2192 Google Photos';
  if (rawName.includes('GooglePhotosToAzure')) return 'Google Photos \u2192 Azure';
  if (rawName.includes('GoogleDriveToAzure')) return 'Google Drive \u2192 Azure';
  if (rawName.includes('GoogleStorageToAzure') || rawName.includes('GcsToAzure')) return 'GCS \u2192 Azure';
  if (rawName.includes('AzureToGcs')) return 'Azure \u2192 GCS';
  return rawName;
}

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

  groups.sort((a, b) => new Date(b.parent.createdAt).getTime() - new Date(a.parent.createdAt).getTime());

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

function parseStartedByBadges(startedBy: string): ProviderEmail[] {
  // Format: "google:user@gmail.com|azure:user@gmail.com" or just "user@gmail.com"
  return startedBy.split('|').map((part) => {
    const colonIdx = part.indexOf(':');
    if (colonIdx > 0) {
      return { provider: part.slice(0, colonIdx), email: part.slice(colonIdx + 1) };
    }
    return { provider: '', email: part };
  });
}

const providerBadgeColors: Record<string, string> = {
  google: 'bg-red-50 text-red-700 border-red-200',
  azure: 'bg-blue-50 text-blue-700 border-blue-200',
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

  // Build query params
  const params = useMemo<ProcessListParams>(() => {
    const p: ProcessListParams = {};
    if (selectedStatuses.size < FILTER_STATUSES.length) {
      p.statusList = Array.from(selectedStatuses);
    }
    if (fromDate) p.from = new Date(fromDate).toISOString();
    if (toDate) p.to = new Date(toDate + 'T23:59:59').toISOString();
    if (isAdmin && showAllUsers) p.all = true;
    return p;
  }, [selectedStatuses, fromDate, toDate, isAdmin, showAllUsers]);

  const hasActiveFilter =
    selectedStatuses.has(OrchestrationRuntimeStatus.Running) ||
    selectedStatuses.has(OrchestrationRuntimeStatus.Pending);
  const refetchInterval = hasActiveFilter ? 5000 : false;

  const { data: instances, isLoading, isError, error, refetch } = useProcesses(params, refetchInterval);

  const purge = usePurgeProcess();

  const groups = useMemo(() => groupInstances(instances ?? []), [instances]);

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
            {groups.length} orchestration group{groups.length !== 1 ? 's' : ''}
            {refetchInterval ? ' \u00b7 Auto-refreshing' : ''}
          </p>
        </div>

        <div className="flex items-center gap-2">
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
      {isLoading && !instances && (
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
          {groups.map((group) => (
            <ProcessGroupCard
              key={group.parent.instanceId}
              group={group}
              isExpanded={expandedGroups.has(group.parent.instanceId)}
              onToggle={() => toggleGroup(group.parent.instanceId)}
              onDelete={handleDelete}
              isPurging={purge.isPending}
            />
          ))}
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
          <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
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

            {/* Started By badges */}
            {startedBy && (
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Started By</span>
                <div className="flex flex-wrap gap-1.5">
                  {parseStartedByBadges(startedBy).map((pe, i) => (
                    <span
                      key={i}
                      className={cn(
                        'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium',
                        providerBadgeColors[pe.provider] ?? 'bg-slate-50 text-slate-700 border-slate-200'
                      )}
                    >
                      {pe.provider && (
                        <span className="opacity-60">{pe.provider}</span>
                      )}
                      {pe.email}
                    </span>
                  ))}
                </div>
              </div>
            )}

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

            {/* Actions */}
            <div className="flex items-center gap-2 pt-1">
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
