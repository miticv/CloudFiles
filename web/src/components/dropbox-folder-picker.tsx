import { useState } from 'react';
import { useDropboxFolder } from '@/api/dropbox.api';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { FolderOpen, ChevronRight, ArrowLeft, Home } from 'lucide-react';

interface BreadcrumbEntry {
  path: string;
  name: string;
}

interface DropboxFolderPickerProps {
  enabled: boolean;
  onChange: (path: string) => void;
}

export function DropboxFolderPicker({ enabled, onChange }: DropboxFolderPickerProps) {
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbEntry[]>([{ path: '', name: 'Dropbox' }]);
  const currentFolder = breadcrumbs[breadcrumbs.length - 1];

  const { data, isLoading } = useDropboxFolder(currentFolder.path, enabled);

  const folders = (data?.items ?? []).filter((i) => i.isFolder);

  function navigateToFolder(path: string, name: string) {
    setBreadcrumbs((prev) => [...prev, { path, name }]);
    onChange(path);
  }

  function navigateToBreadcrumb(index: number) {
    setBreadcrumbs((prev) => prev.slice(0, index + 1));
    onChange(breadcrumbs[index].path);
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
            key={folder.pathLower}
            onClick={() => navigateToFolder(folder.pathDisplay, folder.name)}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors border-b border-border last:border-b-0"
          >
            <FolderOpen className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
            <span className="truncate flex-1 text-left">{folder.name}</span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          </button>
        ))}
      </div>

      <p className="text-xs text-muted-foreground mt-1.5">
        Files will be copied into: <span className="font-medium">{breadcrumbs.map((b) => b.name).join(' / ')}</span>
      </p>
    </div>
  );
}
