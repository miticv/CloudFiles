import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    return format(new Date(dateStr), 'MMM d, yyyy');
  } catch {
    return dateStr;
  }
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    return format(new Date(dateStr), 'MMM d, yyyy h:mm a');
  } catch {
    return dateStr;
  }
}

export function formatRelative(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
  } catch {
    return dateStr;
  }
}

export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
}

export function getFileTypeBadgeColor(ext: string): string {
  switch (ext.toLowerCase()) {
    case 'pdf': return 'bg-red-100 text-red-700';
    case 'doc': case 'docx': return 'bg-blue-100 text-blue-700';
    case 'xls': case 'xlsx': return 'bg-green-100 text-green-700';
    case 'ppt': case 'pptx': return 'bg-orange-100 text-orange-700';
    case 'jpg': case 'jpeg': return 'bg-amber-100 text-amber-700';
    case 'png': case 'gif': case 'svg': case 'webp': return 'bg-purple-100 text-purple-700';
    case 'mp4': case 'mov': case 'avi': return 'bg-pink-100 text-pink-700';
    case 'zip': case 'rar': case '7z': return 'bg-slate-100 text-slate-700';
    case 'txt': case 'csv': return 'bg-gray-100 text-gray-700';
    case 'json': case 'xml': case 'yml': case 'yaml': return 'bg-teal-100 text-teal-700';
    default: return 'bg-slate-100 text-slate-600';
  }
}

export function extractError(error: unknown): string {
  if (!error) return 'An unknown error occurred';
  if (typeof error === 'string') return error;

  const err = error as Record<string, unknown>;

  if (err.response) {
    const response = err.response as Record<string, unknown>;
    const data = response.data as Record<string, unknown> | string | undefined;
    if (data) {
      if (typeof data === 'string') return data;
      if (typeof data.message === 'string') return data.message;
    }
    const status = response.status as number;
    if (status === 401) return 'Authentication failed. Please sign in again.';
    if (status === 403) return 'You do not have permission to perform this action.';
    if (status === 404) return 'The requested resource was not found.';
    return `Request failed with status ${status}`;
  }

  if (err.message && typeof err.message === 'string') return err.message;
  if (err.code === 'ERR_NETWORK') return 'Network error. Please check your connection.';

  return 'An unexpected error occurred';
}
