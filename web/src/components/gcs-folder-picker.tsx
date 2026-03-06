import { useState } from 'react';
import { useGcsFiles } from '@/api/google-storage.api';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { FolderOpen, ChevronRight, ArrowLeft, Home } from 'lucide-react';

interface BreadcrumbEntry {
  path: string;
  name: string;
}

interface GcsFolderPickerProps {
  bucket: string;
  enabled: boolean;
  onChange: (path: string) => void;
}

export function GcsFolderPicker({ bucket, enabled, onChange }: GcsFolderPickerProps) {
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbEntry[]>([{ path: '', name: 'Root' }]);
  const currentFolder = breadcrumbs[breadcrumbs.length - 1];

  const { data, isLoading } = useGcsFiles(
    enabled && bucket ? bucket : null,
    currentFolder.path || null,
  );

  const folders = (data ?? []).filter((i) => i.isFolder);

  function navigateToFolder(itemPath: string, name: string) {
    setBreadcrumbs((prev) => [...prev, { path: itemPath, name }]);
    onChange(itemPath);
  }

  function navigateToBreadcrumb(index: number) {
    setBreadcrumbs((prev) => prev.slice(0, index + 1));
    onChange(breadcrumbs[index].path);
  }

  if (!bucket) {
    return (
      <div>
        <p className="text-sm font-medium text-foreground mb-2">Destination Folder</p>
        <div className="rounded-lg border border-border px-3 py-4 text-center text-xs text-muted-foreground">
          Enter a bucket name to browse folders
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm font-medium text-foreground mb-2">Destination Folder</p>

      {/* Breadcrumbs */}
      <div className="flex items-center gap-1 mb-2 flex-wrap">
        {breadcrumbs.map((entry, index) => (
          <span key={entry.path || 'root'} className="flex items-center gap-1 text-sm">
            {index > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
            <button
              onClick={() => navigateToBreadcrumb(index)}
              className={cn(
                'hover:text-foreground transition-colors',
                index === breadcrumbs.length - 1
                  ? 'text-foreground font-medium'
                  : 'text-muted-foreground'
              )}
            >
              {index === 0 ? <Home className="h-3.5 w-3.5 inline" /> : entry.name}
            </button>
          </span>
        ))}
      </div>

      {/* Folder picker */}
      <div className="rounded-lg border border-border overflow-hidden max-h-48 overflow-y-auto">
        {breadcrumbs.length > 1 && (
          <button
            onClick={() => navigateToBreadcrumb(breadcrumbs.length - 2)}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-accent transition-colors border-b border-border"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-6">
            <Spinner size={16} />
          </div>
        )}

        {!isLoading && folders.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">No subfolders</p>
        )}

        {!isLoading && folders.map((folder) => (
          <button
            key={folder.itemPath}
            onClick={() => navigateToFolder(folder.itemPath, folder.itemName)}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors border-b border-border last:border-b-0"
          >
            <FolderOpen className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
            <span className="truncate flex-1 text-left">{folder.itemName}</span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          </button>
        ))}
      </div>

      <p className="text-xs text-muted-foreground mt-1.5">
        Files will be copied into: <span className="font-medium">{currentFolder.path || 'bucket root'}</span>
      </p>
    </div>
  );
}
