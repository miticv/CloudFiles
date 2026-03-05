import { useState, useRef, useEffect } from 'react';
import { useBuckets } from '@/api/google-storage.api';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';

const LS_BUCKET_KEY = 'gcs_bucket_name';
const LS_PROJECT_KEY = 'gcs_project_id';

interface GcsBucketInputProps {
  value: string;
  onChange: (value: string) => void;
  enabled: boolean;
}

export function GcsBucketInput({ value, onChange, enabled }: GcsBucketInputProps) {
  const [projectId] = useState(() => localStorage.getItem(LS_PROJECT_KEY) || '');
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Pre-fill from localStorage when dialog opens
  useEffect(() => {
    if (!enabled || value) return;
    const saved = localStorage.getItem(LS_BUCKET_KEY);
    if (saved) onChange(saved);
  }, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: buckets, isLoading } = useBuckets(enabled && projectId ? projectId : null);

  const filtered = buckets?.filter((b) =>
    b.name.toLowerCase().includes(value.toLowerCase()),
  ) ?? [];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setShowDropdown(true)}
        placeholder="e.g. my-gcs-bucket"
      />

      {showDropdown && projectId && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
          {isLoading ? (
            <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
              <Spinner size={12} /> Loading buckets…
            </div>
          ) : filtered.length > 0 ? (
            <ul className="max-h-40 overflow-y-auto py-1">
              {filtered.map((b) => (
                <li key={b.name}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between px-3 py-1.5 text-sm hover:bg-accent text-left"
                    onClick={() => { onChange(b.name); setShowDropdown(false); }}
                  >
                    <span className="truncate">{b.name}</span>
                    <span className="ml-2 shrink-0 text-xs text-muted-foreground">{b.location}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              {value ? 'No matching buckets' : 'No buckets found'}
            </div>
          )}
          <div className="border-t px-3 py-1.5 text-xs text-muted-foreground">
            Project: {projectId}
          </div>
        </div>
      )}
    </div>
  );
}
