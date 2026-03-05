import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/auth/auth-context';
import { getDropboxToken } from '@/auth/dropbox-auth';
import { useStartPhotosToDropbox } from '@/api/process.api';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { DropboxFolderPicker } from '@/components/dropbox-folder-picker';
import type { PickedMediaItem } from '@/api/types';

interface CopyToDropboxDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedItems: PickedMediaItem[];
  onSuccess: () => void;
}

export function CopyToDropboxDialog({
  open,
  onOpenChange,
  selectedItems,
  onSuccess,
}: CopyToDropboxDialogProps) {
  const navigate = useNavigate();
  const auth = useAuth();
  const startCopy = useStartPhotosToDropbox();

  const [destinationFolder, setDestinationFolder] = useState('');
  const [preparing, setPreparing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canStart = selectedItems.length > 0;

  const handleStart = useCallback(async () => {
    if (!canStart) return;
    setErrorMsg(null);
    setPreparing(true);

    try {
      const dropboxToken = getDropboxToken();
      if (!dropboxToken) {
        setErrorMsg('Dropbox token not available. Please connect Dropbox on the Connections page.');
        setPreparing(false);
        return;
      }

      await startCopy.mutateAsync({
        photoItems: selectedItems.map((item) => ({
          id: item.id,
          baseUrl: item.mediaFile.baseUrl,
          mimeType: item.mediaFile.mimeType,
          filename: item.mediaFile.filename,
        })),
        dropboxAccessToken: dropboxToken,
        destinationFolder: destinationFolder.trim().replace(/^\/+/, ''),
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
    canStart, selectedItems, destinationFolder,
    startCopy, auth.user, onOpenChange, onSuccess, navigate,
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Copy to Dropbox</DialogTitle>
          <DialogDescription>
            {selectedItems.length} photo{selectedItems.length !== 1 ? 's' : ''} selected
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <DropboxFolderPicker enabled={open} onChange={setDestinationFolder} />

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
