import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOidc } from '@/auth/oidc-provider';
import { useNavigate } from 'react-router';
import { type CopyProviderId, getDestinations } from '@/lib/providers';
import { cn } from '@/lib/utils';

interface CopyToBarProps {
  sourceProvider: CopyProviderId;
  selectedCount: number;
  selectedLabel?: string;
  onClearSelection: () => void;
  onCopyTo: (destination: CopyProviderId) => void;
}

export function CopyToBar({
  sourceProvider,
  selectedCount,
  selectedLabel,
  onClearSelection,
  onCopyTo,
}: CopyToBarProps) {
  const { providers } = useOidc();
  const navigate = useNavigate();
  const destinations = getDestinations(sourceProvider);

  const isConnected = (configId: string) =>
    providers.find(p => p.configId === configId)?.authenticated ?? false;

  return (
    <div className="border-t border-border bg-card px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-foreground">
            {selectedLabel ?? `${selectedCount} item${selectedCount !== 1 ? 's' : ''} selected`}
          </span>
          <Button variant="ghost" size="sm" onClick={onClearSelection} className="gap-1 text-muted-foreground">
            <X className="h-3.5 w-3.5" />
            Clear
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {destinations.map(dest => {
            const connected = isConnected(dest.requiredConfigId);
            const Icon = dest.icon;

            return (
              <Button
                key={dest.id}
                size="sm"
                className={cn('gap-1.5', connected ? dest.buttonClass : dest.disabledClass)}
                onClick={() => connected ? onCopyTo(dest.id) : navigate('/connections')}
                title={connected ? `Copy to ${dest.label}` : dest.connectLabel}
              >
                <Icon className="h-4 w-4" />
                {connected ? `Copy to ${dest.label}` : dest.connectLabel}
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
