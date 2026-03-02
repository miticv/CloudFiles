import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/auth/auth-context';
import { apiClient } from '@/auth/axios-client';
import { useStartDriveToGcs } from '@/api/process.api';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import type { GoogleDriveFile, GoogleDriveFileListResponse, DriveFileForCopy } from '@/api/types';

const GOOGLE_FOLDER_MIME = 'application/vnd.google-apps.folder';
const GOOGLE_DOCS_MIMES = new Set([
  'application/vnd.google-apps.document',
  'application/vnd.google-apps.spreadsheet',
  'application/vnd.google-apps.presentation',
  'application/vnd.google-apps.form',
  'application/vnd.google-apps.drawing',
  'application/vnd.google-apps.site',
  'application/vnd.google-apps.script',
  'application/vnd.google-apps.jam',
  'application/vnd.google-apps.map',
]);

interface CopyToGcsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedFiles: GoogleDriveFile[];
  selectedFolders: GoogleDriveFile[];
  onSuccess: () => void;
}

async function listAllFilesInFolder(folderId: string, prefix: string): Promise<DriveFileForCopy[]> {
  const files: DriveFileForCopy[] = [];
  let pageToken: string | null = null;

  do {
    const params: string[] = [`folderId=${encodeURIComponent(folderId)}`];
    if (pageToken) params.push(`pageToken=${encodeURIComponent(pageToken)}`);
    const res = await apiClient.get<GoogleDriveFileListResponse>(
      `google/drive/files?${params.join('&')}`
    );
    const data = res.data;

    for (const item of data.files) {
      if (item.mimeType === GOOGLE_FOLDER_MIME) {
        const subFiles = await listAllFilesInFolder(item.id, `${prefix}${item.name}/`);
        files.push(...subFiles);
      } else if (!GOOGLE_DOCS_MIMES.has(item.mimeType)) {
        files.push({
          id: item.id,
          name: `${prefix}${item.name}`,
          mimeType: item.mimeType,
          size: item.size,
        });
      }
    }

    pageToken = data.nextPageToken;
  } while (pageToken);

  return files;
}

export function CopyToGcsDialog({
  open,
  onOpenChange,
  selectedFiles,
  selectedFolders,
  onSuccess,
}: CopyToGcsDialogProps) {
  const navigate = useNavigate();
  const auth = useAuth();
  const startCopy = useStartDriveToGcs();

  const [bucketName, setBucketName] = useState('');
  const [destinationFolder, setDestinationFolder] = useState('');
  const [preparing, setPreparing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canStart = !!bucketName.trim() && (selectedFiles.length > 0 || selectedFolders.length > 0);

  const handleStart = useCallback(async () => {
    if (!canStart) return;
    setErrorMsg(null);
    setPreparing(true);

    try {
      const allFiles: DriveFileForCopy[] = selectedFiles.map((f) => ({
        id: f.id,
        name: f.name,
        mimeType: f.mimeType,
        size: f.size,
      }));

      for (const folder of selectedFolders) {
        const folderFiles = await listAllFilesInFolder(folder.id, `${folder.name}/`);
        allFiles.push(...folderFiles);
      }

      if (allFiles.length === 0) {
        setErrorMsg('No copyable files found in the selected items.');
        setPreparing(false);
        return;
      }

      await startCopy.mutateAsync({
        driveItems: allFiles,
        bucketName: bucketName.trim(),
        destinationFolder: destinationFolder.trim(),
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
    canStart, selectedFiles, selectedFolders, bucketName, destinationFolder,
    startCopy, auth.user, onOpenChange, onSuccess, navigate,
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Copy to Google Cloud Storage</DialogTitle>
          <DialogDescription>
            {selectedFiles.length > 0 && `${selectedFiles.length} file${selectedFiles.length !== 1 ? 's' : ''}`}
            {selectedFiles.length > 0 && selectedFolders.length > 0 && ' and '}
            {selectedFolders.length > 0 && `${selectedFolders.length} folder${selectedFolders.length !== 1 ? 's' : ''}`}
            {' '}selected
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Bucket Name</label>
            <Input
              value={bucketName}
              onChange={(e) => setBucketName(e.target.value)}
              placeholder="e.g. my-gcs-bucket"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Destination Folder (optional)</label>
            <Input
              value={destinationFolder}
              onChange={(e) => setDestinationFolder(e.target.value)}
              placeholder="e.g. backups/drive"
            />
            <p className="text-xs text-muted-foreground">
              Files will be copied to this path in the bucket. Leave empty to copy to root.
            </p>
          </div>

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
