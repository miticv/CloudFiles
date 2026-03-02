import { useState, useCallback } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { SecureImage } from '@/components/ui/secure-image';
import { cn, formatFileSize, formatDateTime, getFileExtension, getFileTypeBadgeColor } from '@/lib/utils';
import { apiClient } from '@/auth/axios-client';
import { Download, HelpCircle } from 'lucide-react';

export interface FilePreviewInfo {
  name: string;
  path: string;
  size?: number;
  lastModified?: string;
  contentType?: string;
  metadata?: Record<string, string>;
  downloadUrl?: string;
}

interface FileDetailSheetProps {
  open: boolean;
  onClose: () => void;
  file: FilePreviewInfo | null;
}

export function FileDetailSheet({ open, onClose, file }: FileDetailSheetProps) {
  const [downloading, setDownloading] = useState(false);

  const isImage = file?.contentType?.startsWith('image/') ?? false;

  const handleDownload = useCallback(async () => {
    if (!file?.downloadUrl) return;
    setDownloading(true);
    try {
      const res = await apiClient.get(file.downloadUrl, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // download failed
    } finally {
      setDownloading(false);
    }
  }, [file?.downloadUrl, file?.name]);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="pr-6">File Details</SheetTitle>
        </SheetHeader>

        {file && (
          <div className="mt-6 space-y-5">
            {/* Image preview */}
            {isImage && file.downloadUrl && (
              <div className="rounded-lg border border-border overflow-hidden bg-slate-50">
                <SecureImage
                  secureUrl={file.downloadUrl}
                  alt={file.name}
                  className="w-full h-auto max-h-64 object-contain"
                />
              </div>
            )}

            {/* File name + download */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Name</p>
                <p className="mt-1 text-sm font-medium text-foreground break-all">{file.name}</p>
              </div>
              {file.downloadUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 mt-3"
                  onClick={handleDownload}
                  disabled={downloading}
                >
                  {downloading ? (
                    <Spinner size={14} />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  Download
                </Button>
              )}
            </div>

            {/* Type badge */}
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Type</p>
              <div className="mt-1">
                {(() => {
                  const ext = getFileExtension(file.name);
                  return ext ? (
                    <span className={cn('inline-block rounded px-2 py-0.5 text-xs font-semibold uppercase', getFileTypeBadgeColor(ext))}>
                      {ext}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">Unknown</span>
                  );
                })()}
              </div>
            </div>

            {/* Size */}
            {file.size != null && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Size</p>
                <p className="mt-1 text-sm text-foreground">{formatFileSize(file.size)}</p>
              </div>
            )}

            {/* Last Modified */}
            {file.lastModified && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Last Modified</p>
                <p className="mt-1 text-sm text-foreground">{formatDateTime(file.lastModified)}</p>
              </div>
            )}

            {/* Content Type */}
            {file.contentType && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Content Type</p>
                <p className="mt-1 text-sm text-foreground">{file.contentType}</p>
              </div>
            )}

            {/* Path */}
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Path</p>
              <p className="mt-1 text-sm text-muted-foreground break-all">{file.path}</p>
            </div>

            {/* Metadata */}
            {file.metadata && Object.keys(file.metadata).length > 0 && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Metadata</p>
                <div className="mt-1 space-y-1">
                  {Object.entries(file.metadata).map(([key, value]) => (
                    <div key={key} className="flex items-start gap-2 text-sm">
                      <span className="font-medium text-foreground">{key}:</span>
                      <span className="text-muted-foreground break-all">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Help note when download is not available */}
            {!file.downloadUrl && (
              <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <HelpCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>
                  Download and image preview are available for Azure Blob Storage and Dropbox files only.
                </span>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
