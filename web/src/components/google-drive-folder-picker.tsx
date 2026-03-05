import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/auth/axios-client';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { FolderOpen, ChevronRight, ArrowLeft, Home } from 'lucide-react';
import type { GoogleDriveFileListResponse } from '@/api/types';

interface BreadcrumbEntry {
  id: string;
  name: string;
}

interface GoogleDriveFolderPickerProps {
  enabled: boolean;
  onChange: (folderId: string) => void;
}

export function GoogleDriveFolderPicker({ enabled, onChange }: GoogleDriveFolderPickerProps) {
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbEntry[]>([{ id: 'root', name: 'My Drive' }]);
  const currentFolder = breadcrumbs[breadcrumbs.length - 1];

  const { data, isLoading } = useQuery({
    queryKey: ['drive', 'files', currentFolder.id],
    queryFn: () =>
      apiClient.get<GoogleDriveFileListResponse>(
        `google/drive/files?folderId=${encodeURIComponent(currentFolder.id)}`
      ).then(r => r.data),
    enabled,
  });

  const folders = (data?.files ?? []).filter((f) => f.isFolder);

  function navigateToFolder(id: string, name: string) {
    setBreadcrumbs((prev) => [...prev, { id, name }]);
    onChange(id);
  }

  function navigateToBreadcrumb(index: number) {
    setBreadcrumbs((prev) => prev.slice(0, index + 1));
    const target = breadcrumbs[index];
    onChange(target.id === 'root' ? '' : target.id);
  }

  return (
    <div>
      <p className="text-sm font-medium text-foreground mb-2">Destination Folder</p>

      {/* Breadcrumbs */}
      <div className="flex items-center gap-1 mb-2 flex-wrap">
        {breadcrumbs.map((entry, index) => (
          <span key={entry.id} className="flex items-center gap-1 text-sm">
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
            key={folder.id}
            onClick={() => navigateToFolder(folder.id, folder.name)}
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
