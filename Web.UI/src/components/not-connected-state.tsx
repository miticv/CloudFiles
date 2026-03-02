import { Button } from '@/components/ui/button';
import { CloudOff } from 'lucide-react';

interface NotConnectedStateProps {
  provider: string;
  description: string;
  buttonLabel: string;
  buttonIcon?: React.ReactNode;
  onConnect: () => void;
}

export function NotConnectedState({ provider, description, buttonLabel, buttonIcon, onConnect }: NotConnectedStateProps) {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="text-center space-y-4 max-w-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
          <CloudOff className="h-8 w-8 text-slate-400" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-lg font-semibold text-foreground">{provider} not connected</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Button onClick={onConnect}>
          {buttonIcon}
          {buttonLabel}
        </Button>
      </div>
    </div>
  );
}
