import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { usePageTitle } from '@/hooks/use-page-title';
import { useOidc } from '@/auth/oidc-provider';
import { useCreateSession, usePollSession, usePickedItems, getImageProxyUrl } from '@/api/google-photos.api';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Image as ImageIcon, CloudOff, X, Upload, HelpCircle } from 'lucide-react';
import type { PickedMediaItem } from '@/api/types';

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
    <div className="h-full overflow-auto">
      <div className="space-y-6 p-6">
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
            </div>
            <p className="text-sm text-muted-foreground">
              Select photos from your Google Photos library to copy to Azure Blob Storage.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {pickedItems.length > 0 && (
              <>
                <Button variant="outline" size="sm" onClick={handleClear}>
                  <X className="h-3.5 w-3.5" />
                  Clear
                </Button>
                <Button size="sm">
                  <Upload className="h-3.5 w-3.5" />
                  Copy to Azure ({pickedItems.length})
                </Button>
              </>
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
                    <img
                      src={getImageProxyUrl(item.mediaFile.baseUrl, 256, 256)}
                      alt={item.mediaFile.filename}
                      className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                      loading="lazy"
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
    </div>
  );
}

export { Component as GooglePhotosPage };
export default Component;
