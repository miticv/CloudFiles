import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { usePageTitle } from '@/hooks/use-page-title';
import { useOidc } from '@/auth/oidc-provider';
import { useCreateSession, usePollSession, usePickedItems, getImageProxyPath } from '@/api/google-photos.api';
import { SecureImage } from '@/components/ui/secure-image';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Image as ImageIcon, CloudOff, X, HelpCircle } from 'lucide-react';
import type { PickedMediaItem } from '@/api/types';
import { CopyToBar } from '@/components/copy-to-bar';
import { type CopyProviderId } from '@/lib/providers';
import { CopyToAzureDialog } from './copy-to-azure-dialog';
import { CopyToGcsDialog } from './copy-to-gcs-dialog';
import { CopyToDropboxDialog } from './copy-to-dropbox-dialog';
import { CopyToGoogleDriveDialog } from './copy-to-google-drive-dialog';

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
            Connect your Google account to select and copy photos from Google Photos.
          </p>
        </div>
        <Button onClick={onConnect}>
          <ImageIcon className="h-4 w-4" />
          Connect Google
        </Button>
      </div>
    </div>
  );
}

// ─── Main Component ───
export function Component() {
  usePageTitle('Google Photos');

  const { providers, login } = useOidc();
  const googleConnected = providers.find((p) => p.configId === 'google')?.authenticated ?? false;

  // All accumulated items from completed sessions
  const [savedItems, setSavedItems] = useState<PickedMediaItem[]>([]);
  // Sessions that have already been committed to savedItems
  const [processedSessions, setProcessedSessions] = useState<Set<string>>(new Set());
  const [polling, setPolling] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const popupRef = useRef<Window | null>(null);
  const popupCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [activeDialog, setActiveDialog] = useState<CopyProviderId | null>(null);

  const createSession = useCreateSession();

  // Poll session status
  const { data: sessionData } = usePollSession(sessionId, polling);

  // When session reports media items are set, load them
  const mediaItemsReady = sessionData?.mediaItemsSet === true;

  // Only fetch items for sessions we haven't processed yet
  const shouldFetchItems = mediaItemsReady && !!sessionId && !processedSessions.has(sessionId);
  const { data: fetchedItems, isLoading: loadingItems } = usePickedItems(
    sessionId,
    shouldFetchItems
  );

  // Derive the display list: saved items + any currently fetched items (deduped)
  const pickedItems = useMemo(() => {
    if (!fetchedItems || fetchedItems.length === 0) return savedItems;
    // Only include fetched items that aren't already saved
    const existingIds = new Set(savedItems.map((item) => item.id));
    const deduped = fetchedItems.filter((item) => !existingIds.has(item.id));
    if (deduped.length === 0) return savedItems;
    return [...savedItems, ...deduped];
  }, [savedItems, fetchedItems]);

  // Commit fetched items to permanent state once loaded
  const commitFetchedItems = useCallback(() => {
    if (!fetchedItems || fetchedItems.length === 0 || !sessionId) return;
    if (processedSessions.has(sessionId)) return;

    setSavedItems((prev) => {
      const existingIds = new Set(prev.map((item) => item.id));
      const deduped = fetchedItems.filter((item) => !existingIds.has(item.id));
      return deduped.length > 0 ? [...prev, ...deduped] : prev;
    });
    setProcessedSessions((prev) => new Set(prev).add(sessionId));
    setPolling(false);
    setSessionId(null);
  }, [fetchedItems, sessionId, processedSessions]);

  // When items are fetched, commit them and clean up
  // This fires when fetchedItems query transitions from loading to loaded
  const prevFetchedRef = useRef<PickedMediaItem[] | undefined>(undefined);
  useEffect(() => {
    // Only fire when fetchedItems changes from undefined/empty to populated
    if (fetchedItems && fetchedItems.length > 0 && prevFetchedRef.current !== fetchedItems) {
      prevFetchedRef.current = fetchedItems;
      commitFetchedItems();
      // Close popup
      if (popupRef.current && !popupRef.current.closed) {
        popupRef.current.close();
      }
      popupRef.current = null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchedItems]);

  // Detect popup closed by user
  useEffect(() => {
    if (!polling) {
      if (popupCheckRef.current) {
        clearInterval(popupCheckRef.current);
        popupCheckRef.current = null;
      }
      return;
    }

    popupCheckRef.current = setInterval(() => {
      if (popupRef.current && popupRef.current.closed) {
        setPolling(false);
        setSessionId(null);
        popupRef.current = null;
        if (popupCheckRef.current) {
          clearInterval(popupCheckRef.current);
          popupCheckRef.current = null;
        }
      }
    }, 1000);

    return () => {
      if (popupCheckRef.current) {
        clearInterval(popupCheckRef.current);
        popupCheckRef.current = null;
      }
    };
  }, [polling]);

  const handleSelectPhotos = useCallback(async () => {
    try {
      const session = await createSession.mutateAsync();
      setSessionId(session.id);

      // Open picker in popup
      const width = 1000;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      popupRef.current = window.open(
        session.pickerUri,
        'google-photos-picker',
        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
      );

      // Start polling
      setPolling(true);
    } catch {
      // mutation error is handled by createSession.error
    }
  }, [createSession]);

  function handleClear() {
    setSavedItems([]);
    setProcessedSessions(new Set());
    prevFetchedRef.current = undefined;
    setPolling(false);
    setSessionId(null);
    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.close();
    }
    popupRef.current = null;
  }

  if (!googleConnected) {
    return <NotConnected onConnect={() => login('google')} />;
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-auto space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">Google Photos</h1>
              {pickedItems.length > 0 && (
                <span className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                  {pickedItems.length} selected
                </span>
              )}
              <Dialog>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-full p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
                    title="Google Photos limitations"
                  >
                    <HelpCircle className="h-4.5 w-4.5" />
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Google Photos API Limitations</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 text-sm text-muted-foreground">
                    <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">
                      <p className="font-medium">The Google Photos Picker API only shows albums that were created by this application.</p>
                      <p className="mt-1">This is a restriction imposed by Google &mdash; third-party apps cannot access albums you created manually in Google Photos.</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground mb-2">How to move photos out of Google Photos:</p>
                      <ol className="list-decimal list-inside space-y-2">
                        <li>
                          <span className="font-medium text-foreground">Use Google Takeout</span> &mdash; Go to{' '}
                          <a href="https://takeout.google.com" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">takeout.google.com</a>,
                          select Google Photos, and export your library. Google will send you download links for zip archives.
                        </li>
                        <li>
                          <span className="font-medium text-foreground">Upload to Google Drive</span> &mdash; Extract the downloaded archives and upload the photos to a folder in Google Drive.
                        </li>
                        <li>
                          <span className="font-medium text-foreground">Use CloudFiles to copy</span> &mdash; Navigate to the Google Drive page in this app and use the &ldquo;Copy to Azure&rdquo; or other copy actions to transfer files to your desired destination.
                        </li>
                      </ol>
                    </div>
                    <p className="text-xs">
                      Alternatively, you can upload photos directly to Google Drive from the Google Photos mobile app using the &ldquo;Save to device&rdquo; option, then sync with Drive.
                    </p>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <p className="text-sm text-muted-foreground">
              Select photos from your Google Photos library to copy to other providers.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {pickedItems.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleClear}>
                <X className="h-3.5 w-3.5" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Action card */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
                <ImageIcon className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">Photo Picker</h2>
                <p className="text-xs text-muted-foreground">
                  Opens a Google Photos picker window to select photos
                </p>
              </div>
            </div>
            <Button
              onClick={handleSelectPhotos}
              disabled={polling || createSession.isPending}
            >
              {createSession.isPending ? (
                <>
                  <Spinner size={14} className="text-primary-foreground" />
                  Opening...
                </>
              ) : (
                <>
                  <ImageIcon className="h-4 w-4" />
                  {pickedItems.length > 0 ? 'Select More' : 'Select Photos'}
                </>
              )}
            </Button>
          </div>

          {/* Error creating session */}
          {createSession.isError && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Failed to create a photo picker session. Please try again.
            </div>
          )}
        </div>

        {/* Polling state */}
        {polling && (
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-6">
            <div className="flex items-center justify-center gap-3">
              <Spinner size={20} className="text-indigo-600" />
              <p className="text-sm font-medium text-indigo-700">
                Waiting for photo selection...
              </p>
            </div>
            <p className="text-center text-xs text-indigo-500 mt-2">
              Select your photos in the popup window. This page will update automatically.
            </p>
          </div>
        )}

        {/* Loading items after selection */}
        {loadingItems && mediaItemsReady && (
          <div className="flex items-center justify-center py-8 gap-3">
            <Spinner size={20} />
            <p className="text-sm text-muted-foreground">Loading selected photos...</p>
          </div>
        )}

        {/* Photo grid */}
        {pickedItems.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
            {pickedItems.map((item) => (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>
                  <a
                    href={item.mediaFile.baseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative aspect-square overflow-hidden rounded-lg bg-slate-100 cursor-pointer"
                  >
                    <SecureImage
                      secureUrl={getImageProxyPath(item.mediaFile.baseUrl, 256, 256)}
                      alt={item.mediaFile.filename}
                      className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200" />
                  </a>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{item.mediaFile.filename}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        )}

        {/* Empty state */}
        {pickedItems.length === 0 && !polling && !loadingItems && (
          <div className="text-center py-16">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 mb-4">
              <ImageIcon className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">No photos selected yet</p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Click &quot;Select Photos&quot; above to open the Google Photos picker.
            </p>
            <div className="mt-4 flex items-start justify-center gap-1.5 text-xs text-muted-foreground">
              <HelpCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>
                Tip: You can search for photos by album, date, or content type in the picker window.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Copy Dialogs */}
      <CopyToAzureDialog
        open={activeDialog === 'azure'}
        onOpenChange={(o) => !o && setActiveDialog(null)}
        selectedItems={pickedItems}
        onSuccess={() => setSavedItems([])}
      />
      <CopyToGcsDialog
        open={activeDialog === 'gcs'}
        onOpenChange={(o) => !o && setActiveDialog(null)}
        selectedItems={pickedItems}
        onSuccess={() => setSavedItems([])}
      />
      <CopyToDropboxDialog
        open={activeDialog === 'dropbox'}
        onOpenChange={(o) => !o && setActiveDialog(null)}
        selectedItems={pickedItems}
        onSuccess={() => setSavedItems([])}
      />
      <CopyToGoogleDriveDialog
        open={activeDialog === 'google-drive'}
        onOpenChange={(o) => !o && setActiveDialog(null)}
        selectedItems={pickedItems}
        onSuccess={() => setSavedItems([])}
      />

      {/* Bottom Selection Bar */}
      {pickedItems.length > 0 && (
        <CopyToBar
          sourceProvider="google-photos"
          selectedCount={pickedItems.length}
          onClearSelection={handleClear}
          onCopyTo={(dest) => setActiveDialog(dest)}
        />
      )}
    </div>
  );
}

export { Component as GooglePhotosPage };
export default Component;
