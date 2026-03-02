import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useOidc } from '@/auth/oidc-provider';
import { useAuth } from '@/auth/auth-context';
import { apiClient } from '@/auth/axios-client';
import { useAlbums, useCreateAlbum } from '@/api/google-album.api';
import { useStartDropboxToGooglePhotos } from '@/api/process.api';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import type { DropboxItem, DropboxFolderResponse, DropboxFileForCopy } from '@/api/types';

interface CopyToGooglePhotosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedFiles: DropboxItem[];
  selectedFolders: DropboxItem[];
  onSuccess: () => void;
}

async function listAllFilesInFolder(folderPath: string, prefix: string): Promise<DropboxFileForCopy[]> {
  const files: DropboxFileForCopy[] = [];
  const res = await apiClient.get<DropboxFolderResponse>(
    `dropbox/files/list?path=${encodeURIComponent(folderPath)}`
  );

  for (const item of res.data.items) {
    if (item.isFolder) {
      const subFiles = await listAllFilesInFolder(item.pathDisplay, `${prefix}${item.name}/`);
      files.push(...subFiles);
    } else {
      files.push({
        path: item.pathDisplay,
        name: `${prefix}${item.name}`,
        size: item.size,
      });
    }
  }

  // Handle pagination
  let cursor = res.data.cursor;
  let hasMore = res.data.hasMore;
  while (hasMore) {
    const cont = await apiClient.get<DropboxFolderResponse>(
      `dropbox/files/list/continue?cursor=${encodeURIComponent(cursor)}`
    );
    for (const item of cont.data.items) {
      if (item.isFolder) {
        const subFiles = await listAllFilesInFolder(item.pathDisplay, `${prefix}${item.name}/`);
        files.push(...subFiles);
      } else {
        files.push({
          path: item.pathDisplay,
          name: `${prefix}${item.name}`,
          size: item.size,
        });
      }
    }
    cursor = cont.data.cursor;
    hasMore = cont.data.hasMore;
  }

  return files;
}

export function CopyToGooglePhotosDialog({
  open,
  onOpenChange,
  selectedFiles,
  selectedFolders,
  onSuccess,
}: CopyToGooglePhotosDialogProps) {
  const navigate = useNavigate();
  const { getAccessToken } = useOidc();
  const auth = useAuth();
  const startCopy = useStartDropboxToGooglePhotos();
  const { data: albums, isLoading: loadingAlbums } = useAlbums();
  const createAlbum = useCreateAlbum();

  const [albumMode, setAlbumMode] = useState<'existing' | 'new'>('existing');
  const [selectedAlbumId, setSelectedAlbumId] = useState('');
  const [newAlbumTitle, setNewAlbumTitle] = useState('');
  const [preparing, setPreparing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const selectedAlbum = albums?.find((a) => a.id === selectedAlbumId);
  const hasAlbum = albumMode === 'existing' ? !!selectedAlbumId : !!newAlbumTitle.trim();
  const canStart = hasAlbum && (selectedFiles.length > 0 || selectedFolders.length > 0);

  const handleStart = useCallback(async () => {
    if (!canStart) return;
    setErrorMsg(null);
    setPreparing(true);

    try {
      // Flatten: direct files
      const allFiles: DropboxFileForCopy[] = selectedFiles.map((f) => ({
        path: f.pathDisplay,
        name: f.name,
        size: f.size,
      }));

      // Expand folders recursively
      for (const folder of selectedFolders) {
        const folderFiles = await listAllFilesInFolder(folder.pathDisplay, `${folder.name}/`);
        allFiles.push(...folderFiles);
      }

      if (allFiles.length === 0) {
        setErrorMsg('No files found in the selected items.');
        setPreparing(false);
        return;
      }

      const googleToken = await getAccessToken('google');
      if (!googleToken) {
        setErrorMsg('Google token not available. Please connect Google on the Connections page.');
        setPreparing(false);
        return;
      }

      let albumId = selectedAlbumId;
      let albumTitle = selectedAlbum?.title ?? '';

      if (albumMode === 'new') {
        const created = await createAlbum.mutateAsync(newAlbumTitle.trim());
        albumId = created.id;
        albumTitle = created.title;
      }

      await startCopy.mutateAsync({
        items: allFiles,
        googleAccessToken: googleToken,
        albumId,
        albumTitle,
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
    canStart, selectedFiles, selectedFolders, selectedAlbumId, selectedAlbum,
    albumMode, newAlbumTitle, getAccessToken, createAlbum, startCopy, auth.user,
    onOpenChange, onSuccess, navigate,
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Copy to Google Photos</DialogTitle>
          <DialogDescription>
            {selectedFiles.length > 0 && `${selectedFiles.length} file${selectedFiles.length !== 1 ? 's' : ''}`}
            {selectedFiles.length > 0 && selectedFolders.length > 0 && ' and '}
            {selectedFolders.length > 0 && `${selectedFolders.length} folder${selectedFolders.length !== 1 ? 's' : ''}`}
            {' '}selected
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Album Mode Toggle */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Album</label>
            <div className="flex gap-2">
              <Button
                variant={albumMode === 'existing' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAlbumMode('existing')}
              >
                Existing Album
              </Button>
              <Button
                variant={albumMode === 'new' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAlbumMode('new')}
              >
                New Album
              </Button>
            </div>
          </div>

          {/* Existing Album Selector */}
          {albumMode === 'existing' && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Select Album</label>
              <Select value={selectedAlbumId} onValueChange={setSelectedAlbumId}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingAlbums ? 'Loading...' : 'Select an album'} />
                </SelectTrigger>
                <SelectContent>
                  {albums?.map((album) => (
                    <SelectItem key={album.id} value={album.id}>
                      {album.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* New Album Title */}
          {albumMode === 'new' && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Album Title</label>
              <Input
                value={newAlbumTitle}
                onChange={(e) => setNewAlbumTitle(e.target.value)}
                placeholder="e.g. Dropbox Photos"
              />
            </div>
          )}

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
