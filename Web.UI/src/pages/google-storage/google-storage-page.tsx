import { useState, useCallback, useMemo } from 'react';
import { usePageTitle } from '@/hooks/use-page-title';
import { useOidc } from '@/auth/oidc-provider';
import { useBuckets, useGcsFiles } from '@/api/google-storage.api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { cn, getFileExtension, getFileTypeBadgeColor } from '@/lib/utils';
import { Cloud, ChevronRight, Folder, FileText, RotateCcw, ArrowLeft, Search, Upload, X, CloudOff } from 'lucide-react';
import { CopyGcsToAzureDialog } from './copy-gcs-to-azure-dialog';

type View = 'setup' | 'buckets' | 'browse';

interface BreadcrumbSegment {
  label: string;
  path: string;
}

const LS_BUCKET_KEY = 'gcs_bucket_name';
const LS_PROJECT_KEY = 'gcs_project_id';

// ─── Not-Connected State ───
function NotConnected({ onConnect }: { onConnect: () => void }) {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="text-center space-y-4 max-w-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
          <CloudOff className="h-8 w-8 text-slate-400" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-lg font-semibold text-foreground">Google not connected</h2>
          <p className="text-sm text-muted-foreground">
            Connect your Google account to browse Google Cloud Storage buckets and files.
          </p>
        </div>
        <Button onClick={onConnect}>
          <Cloud className="h-4 w-4" />
          Connect Google
        </Button>
      </div>
    </div>
  );
}

// ─── Setup View ───
function SetupView({
  onBrowseBucket,
  onListBuckets,
}: {
  onBrowseBucket: (bucket: string) => void;
  onListBuckets: (projectId: string) => void;
}) {
  const [bucketName, setBucketName] = useState(() => localStorage.getItem(LS_BUCKET_KEY) || '');
  const [projectId, setProjectId] = useState(() => localStorage.getItem(LS_PROJECT_KEY) || '');

  function handleBrowse() {
    const name = bucketName.trim();
    if (!name) return;
    localStorage.setItem(LS_BUCKET_KEY, name);
    onBrowseBucket(name);
  }

  function handleListBuckets() {
    const id = projectId.trim();
    if (!id) return;
    localStorage.setItem(LS_PROJECT_KEY, id);
    onListBuckets(id);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Google Cloud Storage</h1>
        <p className="text-sm text-muted-foreground">
          Browse files in a bucket directly, or discover buckets by project ID.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {/* Browse by Bucket */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)] space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50">
              <Search className="h-4 w-4 text-indigo-600" />
            </div>
            <h2 className="text-base font-semibold text-foreground">Browse by Bucket</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Enter a bucket name to browse its contents directly.
          </p>
          <div className="space-y-2">
            <Label htmlFor="bucket-name">Bucket Name</Label>
            <Input
              id="bucket-name"
              placeholder="my-bucket-name"
              value={bucketName}
              onChange={(e) => setBucketName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleBrowse()}
            />
          </div>
          <Button className="w-full" onClick={handleBrowse} disabled={!bucketName.trim()}>
            <Folder className="h-4 w-4" />
            Browse
          </Button>
        </div>

        {/* Find Buckets by Project */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)] space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
              <Cloud className="h-4 w-4 text-emerald-600" />
            </div>
            <h2 className="text-base font-semibold text-foreground">Find Buckets by Project</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Enter a GCP project ID to list all accessible buckets.
          </p>
          <div className="space-y-2">
            <Label htmlFor="project-id">Project ID</Label>
            <Input
              id="project-id"
              placeholder="my-gcp-project"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleListBuckets()}
            />
          </div>
          <Button className="w-full" variant="outline" onClick={handleListBuckets} disabled={!projectId.trim()}>
            <Cloud className="h-4 w-4" />
            List Buckets
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Buckets View ───
function BucketsView({
  projectId,
  onSelectBucket,
  onBack,
}: {
  projectId: string;
  onSelectBucket: (bucket: string) => void;
  onBack: () => void;
}) {
  const { data: buckets, isLoading, error, refetch } = useBuckets(projectId);

  return (
    <div className="space-y-4 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold tracking-tight text-foreground">Buckets</h1>
          <p className="text-sm text-muted-foreground">Project: {projectId}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
          <RotateCcw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="text-center space-y-3">
            <Spinner size={24} />
            <p className="text-sm text-muted-foreground">Loading buckets...</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Failed to load buckets. Check the project ID and your permissions.
        </div>
      )}

      {/* Bucket list */}
      {buckets && buckets.length === 0 && (
        <div className="text-center py-16 text-sm text-muted-foreground">
          No buckets found for this project.
        </div>
      )}

      {buckets && buckets.length > 0 && (
        <div className="rounded-xl border border-border bg-card shadow-[var(--shadow-card)] divide-y divide-border">
          {buckets.map((bucket) => (
            <button
              key={bucket.name}
              onClick={() => onSelectBucket(bucket.name)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent cursor-pointer group"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <Folder className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{bucket.name}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-muted-foreground">{bucket.location}</span>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {bucket.storageClass}
                  </Badge>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Browse View ───
function BrowseView({
  bucket,
  onBack,
}: {
  bucket: string;
  onBack: () => void;
}) {
  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const { data: items, isLoading, error, refetch } = useGcsFiles(bucket, currentPath);

  const folders = useMemo(() => items?.filter((f) => f.isFolder) ?? [], [items]);
  const files = useMemo(() => items?.filter((f) => !f.isFolder) ?? [], [items]);

  const breadcrumbs: BreadcrumbSegment[] = [];
  if (currentPath) {
    const parts = currentPath.split('/').filter(Boolean);
    let accumulated = '';
    for (const part of parts) {
      accumulated += part + '/';
      breadcrumbs.push({ label: part, path: accumulated });
    }
  }

  const allSelected = files.length > 0 && files.every((f) => selectedFiles.has(f.itemPath));

  const toggleFile = useCallback((path: string) => {
    setSelectedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedFiles((prev) => {
      if (files.every((f) => prev.has(f.itemPath))) {
        const next = new Set(prev);
        for (const f of files) next.delete(f.itemPath);
        return next;
      }
      const next = new Set(prev);
      for (const f of files) next.add(f.itemPath);
      return next;
    });
  }, [files]);

  const selectedFileObjects = useMemo(
    () => files.filter((f) => selectedFiles.has(f.itemPath)),
    [files, selectedFiles],
  );

  function clearSelection() {
    setSelectedFiles(new Set());
  }

  function navigateToFolder(path: string) {
    setCurrentPath(path);
  }

  function navigateToRoot() {
    setCurrentPath(null);
  }

  function navigateToBreadcrumb(path: string) {
    setCurrentPath(path);
  }

  return (
    <div className="space-y-4 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={currentPath ? navigateToRoot : onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-foreground truncate">{bucket}</h1>
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5 overflow-x-auto">
            <button
              onClick={navigateToRoot}
              className={cn(
                'shrink-0 hover:text-foreground transition-colors cursor-pointer',
                !currentPath && 'text-foreground font-medium'
              )}
            >
              Root
            </button>
            {breadcrumbs.map((seg) => (
              <span key={seg.path} className="flex items-center gap-1 shrink-0">
                <ChevronRight className="h-3 w-3" />
                <button
                  onClick={() => navigateToBreadcrumb(seg.path)}
                  className="hover:text-foreground transition-colors cursor-pointer"
                >
                  {seg.label}
                </button>
              </span>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {selectedFiles.size > 0 && (
            <>
              <Button variant="outline" size="sm" onClick={clearSelection}>
                <X className="h-3.5 w-3.5" />
                Clear
              </Button>
              <Button size="sm" onClick={() => setCopyDialogOpen(true)}>
                <Upload className="h-3.5 w-3.5" />
                Copy to Azure ({selectedFiles.size})
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RotateCcw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="text-center space-y-3">
            <Spinner size={24} />
            <p className="text-sm text-muted-foreground">Loading files...</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Failed to load files. Check the bucket name and your permissions.
        </div>
      )}

      {/* Empty */}
      {!isLoading && !error && folders.length === 0 && files.length === 0 && (
        <div className="text-center py-16">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 mb-3">
            <Folder className="h-6 w-6 text-slate-400" />
          </div>
          <p className="text-sm text-muted-foreground">This folder is empty.</p>
        </div>
      )}

      {/* Content */}
      {!isLoading && !error && (folders.length > 0 || files.length > 0) && (
        <div className="rounded-xl border border-border bg-card shadow-[var(--shadow-card)] overflow-hidden">
          {/* Folders */}
          {folders.length > 0 && (
            <div>
              <div className="px-4 py-2 border-b border-border bg-muted/50">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Folders ({folders.length})
                </span>
              </div>
              <div className="divide-y divide-border">
                {folders.map((folder) => (
                  <button
                    key={folder.itemPath}
                    onClick={() => navigateToFolder(folder.itemPath)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-accent cursor-pointer group"
                  >
                    <Folder className="h-4 w-4 text-indigo-500 shrink-0" />
                    <span className="text-sm font-medium text-foreground truncate">{folder.itemName}</span>
                    <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Files */}
          {files.length > 0 && (
            <div>
              <div className="px-4 py-2 border-b border-border bg-muted/50 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Files ({files.length})
                </span>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="select-all"
                    checked={allSelected}
                    onCheckedChange={toggleSelectAll}
                  />
                  <Label htmlFor="select-all" className="text-xs text-muted-foreground cursor-pointer">
                    Select All
                  </Label>
                </div>
              </div>
              <div className="divide-y divide-border">
                {files.map((file) => {
                  const ext = getFileExtension(file.itemName);
                  const selected = selectedFiles.has(file.itemPath);
                  return (
                    <div
                      key={file.itemPath}
                      className={cn(
                        'flex items-center gap-3 px-4 py-2.5 transition-colors',
                        selected && 'bg-indigo-50/50'
                      )}
                    >
                      <Checkbox
                        checked={selected}
                        onCheckedChange={() => toggleFile(file.itemPath)}
                      />
                      <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                      <span className="text-sm text-foreground truncate flex-1">{file.itemName}</span>
                      {ext && (
                        <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-md', getFileTypeBadgeColor(ext))}>
                          {ext.toUpperCase()}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Copy to Azure Dialog */}
      <CopyGcsToAzureDialog
        open={copyDialogOpen}
        onOpenChange={setCopyDialogOpen}
        selectedFiles={selectedFileObjects}
        bucketName={bucket}
        onSuccess={clearSelection}
      />
    </div>
  );
}

// ─── Main Component ───
export function Component() {
  usePageTitle('Google Cloud Storage');

  const { providers, login } = useOidc();
  const googleConnected = providers.find((p) => p.configId === 'google')?.authenticated ?? false;

  const [view, setView] = useState<View>('setup');
  const [activeBucket, setActiveBucket] = useState<string | null>(null);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  function handleBrowseBucket(bucket: string) {
    setActiveBucket(bucket);
    setView('browse');
  }

  function handleListBuckets(projectId: string) {
    setActiveProjectId(projectId);
    setView('buckets');
  }

  function handleSelectBucket(bucket: string) {
    setActiveBucket(bucket);
    setView('browse');
  }

  function handleBackToSetup() {
    setView('setup');
    setActiveBucket(null);
    setActiveProjectId(null);
  }

  if (!googleConnected) {
    return <NotConnected onConnect={() => login('google')} />;
  }

  return (
    <div className="h-full overflow-auto">
      {view === 'setup' && (
        <SetupView onBrowseBucket={handleBrowseBucket} onListBuckets={handleListBuckets} />
      )}
      {view === 'buckets' && activeProjectId && (
        <BucketsView
          projectId={activeProjectId}
          onSelectBucket={handleSelectBucket}
          onBack={handleBackToSetup}
        />
      )}
      {view === 'browse' && activeBucket && (
        <BrowseView bucket={activeBucket} onBack={handleBackToSetup} />
      )}
    </div>
  );
}

export { Component as GoogleStoragePage };
export default Component;
