import { HardDrive, Cloud, Cloudy, ImageIcon } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type CopyProviderId = 'azure' | 'gcs' | 'google-drive' | 'google-photos' | 'dropbox';

export interface CopyProviderConfig {
  id: CopyProviderId;
  label: string;
  icon: LucideIcon;
  buttonClass: string;
  disabledClass: string;
  requiredConfigId: string;
  connectLabel: string;
}

export const COPY_PROVIDERS: CopyProviderConfig[] = [
  {
    id: 'azure',
    label: 'Azure Storage',
    icon: HardDrive,
    buttonClass: 'bg-[#0078D4] text-white hover:bg-[#106EBE]',
    disabledClass: 'bg-muted text-muted-foreground',
    requiredConfigId: 'azure-storage',
    connectLabel: 'Connect Azure',
  },
  {
    id: 'gcs',
    label: 'Google Cloud Storage',
    icon: Cloud,
    buttonClass: 'bg-teal-600 text-white hover:bg-teal-700',
    disabledClass: 'bg-muted text-muted-foreground',
    requiredConfigId: 'google',
    connectLabel: 'Connect Google',
  },
  {
    id: 'google-drive',
    label: 'Google Drive',
    icon: Cloud,
    buttonClass: 'bg-green-600 text-white hover:bg-green-700',
    disabledClass: 'bg-muted text-muted-foreground',
    requiredConfigId: 'google',
    connectLabel: 'Connect Google',
  },
  {
    id: 'google-photos',
    label: 'Google Photos',
    icon: ImageIcon,
    buttonClass: 'bg-[#4285F4] text-white hover:bg-[#3367D6]',
    disabledClass: 'bg-muted text-muted-foreground',
    requiredConfigId: 'google',
    connectLabel: 'Connect Google',
  },
  {
    id: 'dropbox',
    label: 'Dropbox',
    icon: Cloudy,
    buttonClass: 'bg-blue-600 text-white hover:bg-blue-700',
    disabledClass: 'bg-muted text-muted-foreground',
    requiredConfigId: 'dropbox',
    connectLabel: 'Connect Dropbox',
  },
];

export function getProvider(id: CopyProviderId): CopyProviderConfig {
  return COPY_PROVIDERS.find(p => p.id === id)!;
}

export function getDestinations(source: CopyProviderId): CopyProviderConfig[] {
  return COPY_PROVIDERS.filter(p => p.id !== source);
}
