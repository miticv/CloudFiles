import { useState, useEffect, useRef } from 'react';
import { apiClient } from '@/auth/axios-client';

interface SecureImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  /** Relative API path (e.g., "google/photos/image?url=...") — fetched via Axios with auth */
  secureUrl: string;
}

export function SecureImage({ secureUrl, alt, ...props }: SecureImageProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const prevUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!secureUrl) return;

    let cancelled = false;
    let objectUrl: string | null = null;

    apiClient
      .get(secureUrl, { responseType: 'blob' })
      .then((res) => {
        if (!cancelled) {
          objectUrl = URL.createObjectURL(res.data);
          setBlobUrl(objectUrl);
        }
      })
      .catch(() => {
        // Image load failed silently
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [secureUrl]);

  // Revoke previous blob URL when it changes
  useEffect(() => {
    const prev = prevUrlRef.current;
    prevUrlRef.current = blobUrl;
    return () => {
      if (prev) URL.revokeObjectURL(prev);
    };
  }, [blobUrl]);

  return <img src={blobUrl ?? undefined} alt={alt} {...props} />;
}
