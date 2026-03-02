import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn, formatFileSize, formatDateTime, getFileExtension, getFileTypeBadgeColor } from '@/lib/utils';

export interface FilePreviewInfo {
  name: string;
  path: string;
  size?: number;
  lastModified?: string;
  contentType?: string;
  metadata?: Record<string, string>;
}

interface FileDetailSheetProps {
  open: boolean;
  onClose: () => void;
  file: FilePreviewInfo | null;
}

export function FileDetailSheet({ open, onClose, file }: FileDetailSheetProps) {
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="pr-6">File Details</SheetTitle>
        </SheetHeader>

        {file && (
          <div className="mt-6 space-y-5">
            {/* File name */}
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Name</p>
              <p className="mt-1 text-sm font-medium text-foreground break-all">{file.name}</p>
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
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
