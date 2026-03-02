import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useOidc } from '@/auth/oidc-provider';
import { useAuth } from '@/auth/auth-context';
import { useAlbums, useCreateAlbum } from '@/api/google-album.api';
import { useStartMigration } from '@/api/process.api';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import type { FileItem } from '@/api/types';

interface CopyToGooglePhotosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedFiles: FileItem[];
  accountName: string;
  containerName: string;
  onSuccess: () => void;
}

export function CopyToGooglePhotosDialog({
  open,
  onOpenChange,
  selectedFiles,
  accountName,
  containerName,
  onSuccess,
}: CopyToGooglePhotosDialogProps) {
  const navigate = useNavigate();
  const { getAccessToken } = useOidc();
  const auth = useAuth();
  const startCopy = useStartMigration();
  const { data: albums, isLoading: loadingAlbums } = useAlbums();
  const createAlbum = useCreateAlbum();

  const [albumMode, setAlbumMode] = useState<'existing' | 'new'>('existing');
  const [selectedAlbumId, setSelectedAlbumId] = useState('');
  const [newAlbumTitle, setNewAlbumTitle] = useState('');
  const [preparing, setPreparing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const selectedAlbum = albums?.find((a) => a.id === selectedAlbumId);
  const hasAlbum = albumMode === 'existing' ? !!selectedAlbumId : !!newAlbumTitle.trim();
  const canStart = hasAlbum && selectedFiles.length > 0;

  const handleStart = useCallback(async () => {
    if (!canStart) return;
    setErrorMsg(null);
    setPreparing(true);

    try {
      const azureToken = await getAccessToken('azure-storage');
      if (!azureToken) {
        setErrorMsg('Azure Storage token not available. Please connect Azure on the Connections page.');
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
        albumId,
        albumTitle,
        selectedItemsList: selectedFiles.map((f) => ({
          itemPath: f.itemPath,
          isFolder: f.isFolder,
        })),
        accountName,
        containerName,
        azureAccessToken: azureToken,
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
    canStart, selectedFiles, accountName, containerName, selectedAlbumId, selectedAlbum,
    albumMode, newAlbumTitle, getAccessToken, createAlbum, startCopy, auth.user,
    onOpenChange, onSuccess, navigate,
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Copy to Google Photos</DialogTitle>
          <DialogDescription>
            {selectedFiles.length} item{selectedFiles.length !== 1 ? 's' : ''} selected from {accountName}/{containerName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
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

          {albumMode === 'new' && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Album Title</label>
              <Input
                value={newAlbumTitle}
                onChange={(e) => setNewAlbumTitle(e.target.value)}
                placeholder="e.g. Azure Photos"
              />
            </div>
          )}

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
