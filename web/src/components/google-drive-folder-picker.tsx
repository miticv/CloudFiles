import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/auth/axios-client';
import { Spinner } from '@/components/ui/spinner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { validateFolderName } from '@/lib/folder-validation';
import { FolderOpen, FolderPlus, ChevronRight, ArrowLeft, Home, X } from 'lucide-react';
import type { GoogleDriveFileListResponse } from '@/api/types';

interface BreadcrumbEntry {
  id: string;
  name: string;
}

interface GoogleDriveFolderPickerProps {
  enabled: boolean;
  onChange: (folderId: string) => void;
  onNewFolderName?: (name: string) => void;
}

export function GoogleDriveFolderPicker({ enabled, onChange, onNewFolderName }: GoogleDriveFolderPickerProps) {
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbEntry[]>([{ id: 'root', name: 'My Drive' }]);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [appliedFolderName, setAppliedFolderName] = useState('');
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

  const validation = newFolderName ? validateFolderName(newFolderName) : null;

  function navigateToFolder(id: string, name: string) {
    setBreadcrumbs((prev) => [...prev, { id, name }]);
    setAppliedFolderName('');
    onChange(id);
    onNewFolderName?.('');
  }

  function navigateToBreadcrumb(index: number) {
    setBreadcrumbs((prev) => prev.slice(0, index + 1));
    const target = breadcrumbs[index];
    setAppliedFolderName('');
    onChange(target.id === 'root' ? '' : target.id);
    onNewFolderName?.('');
  }

  function handleUseFolder() {
    const trimmed = newFolderName.trim();
    if (!validateFolderName(trimmed).valid) return;
    setAppliedFolderName(trimmed);
    setShowCreateFolder(false);
    setNewFolderName('');
    onChange(currentFolder.id === 'root' ? '' : currentFolder.id);
    onNewFolderName?.(trimmed);
  }

  function handleCancelCreate() {
    setShowCreateFolder(false);
    setNewFolderName('');
  }

  const pathDisplay = appliedFolderName
    ? [...breadcrumbs.map((b) => b.name), appliedFolderName].join(' / ')
    : breadcrumbs.map((b) => b.name).join(' / ');

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

      {/* Create Folder */}
      {!showCreateFolder ? (
        <button
          onClick={() => { setShowCreateFolder(true); setAppliedFolderName(''); onNewFolderName?.(''); }}
          className="flex items-center gap-1.5 mt-2 text-xs text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          <FolderPlus className="h-3.5 w-3.5" />
          Create Folder
        </button>
      ) : (
        <div className="mt-2 space-y-1.5">
          <div className="flex items-center gap-2">
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="New folder name"
              className="h-8 text-sm flex-1"
              onKeyDown={(e) => { if (e.key === 'Enter' && validation?.valid) handleUseFolder(); }}
              autoFocus
            />
            <Button size="sm" onClick={handleUseFolder} disabled={!validation?.valid} className="h-8">
              Use
            </Button>
            <button onClick={handleCancelCreate} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
          {validation && !validation.valid && (
            <p className="text-xs text-destructive">{validation.error}</p>
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground mt-1.5">
        Files will be copied into: <span className="font-medium">{pathDisplay}</span>
      </p>
    </div>
  );
}
