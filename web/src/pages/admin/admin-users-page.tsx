import { useCallback } from 'react';
import { usePageTitle } from '@/hooks/use-page-title';
import { useUsers, useUpdateUser } from '@/api/admin.api';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { cn, formatDateTime, extractError } from '@/lib/utils';
import { Users, RotateCcw, AlertCircle } from 'lucide-react';
import type { UserDto } from '@/api/types';

// ─── Provider badge config ───

const providerConfig: Record<string, { label: string; className: string }> = {
  google: { label: 'Google', className: 'bg-red-50 text-red-700 border-red-200' },
  azure: { label: 'Azure', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  local: { label: 'Local', className: 'bg-slate-50 text-slate-600 border-slate-200' },
};

function getProviderBadge(provider: string) {
  const key = provider.toLowerCase();
  const cfg = providerConfig[key] ?? { label: provider, className: 'bg-slate-50 text-slate-600 border-slate-200' };
  return cfg;
}

// ─── Component ───

export function Component() {
  usePageTitle('User Management');

  const { data: users, isLoading, isError, error, refetch } = useUsers();
  const updateUser = useUpdateUser();

  const handleToggle = useCallback(
    (user: UserDto, field: 'isActive' | 'isApproved', value: boolean) => {
      updateUser.mutate({
        partitionKey: user.partitionKey,
        rowKey: user.rowKey,
        data: {
          isActive: field === 'isActive' ? value : user.isActive,
          isApproved: field === 'isApproved' ? value : user.isApproved,
        },
      });
    },
    [updateUser]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-indigo-50 p-2">
              <Users className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">User Management</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Manage user accounts, approval status, and access control.
              </p>
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isLoading}
        >
          <RotateCcw className={cn('w-4 h-4 mr-1.5', isLoading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Spinner size={32} />
          <p className="mt-4 text-sm">Loading users...</p>
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="rounded-full bg-red-50 p-3 mb-4">
            <AlertCircle className="w-6 h-6 text-red-500" />
          </div>
          <p className="text-sm font-medium text-foreground mb-1">Failed to load users</p>
          <p className="text-sm text-muted-foreground mb-4">{extractError(error)}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RotateCcw className="w-4 h-4 mr-1.5" />
            Try Again
          </Button>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !isError && users?.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <div className="rounded-full bg-slate-100 p-3 mb-4">
            <Users className="w-6 h-6 text-slate-400" />
          </div>
          <p className="text-sm font-medium text-foreground mb-1">No users found</p>
          <p className="text-sm text-muted-foreground">
            Users will appear here once they register.
          </p>
        </div>
      )}

      {/* Users table */}
      {!isLoading && !isError && users && users.length > 0 && (
        <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left font-medium text-muted-foreground px-4 py-3">Email</th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3">Display Name</th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3">Provider</th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3">Created</th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3">Last Login</th>
                  <th className="text-center font-medium text-muted-foreground px-4 py-3">Active</th>
                  <th className="text-center font-medium text-muted-foreground px-4 py-3">Approved</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((user) => (
                  <UserRow
                    key={`${user.partitionKey}-${user.rowKey}`}
                    user={user}
                    onToggle={handleToggle}
                    isUpdating={updateUser.isPending}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Count footer */}
          <div className="border-t border-border px-4 py-2.5 bg-muted/20">
            <p className="text-xs text-muted-foreground">
              {users.length} user{users.length !== 1 ? 's' : ''} total
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── User Row ───

interface UserRowProps {
  user: UserDto;
  onToggle: (user: UserDto, field: 'isActive' | 'isApproved', value: boolean) => void;
  isUpdating: boolean;
}

function UserRow({ user, onToggle, isUpdating }: UserRowProps) {
  const providerBadge = getProviderBadge(user.authProvider);

  return (
    <tr className="hover:bg-accent/30 transition-colors">
      <td className="px-4 py-3">
        <span className="font-medium text-foreground">{user.email}</span>
      </td>
      <td className="px-4 py-3 text-muted-foreground">{user.displayName || '\u2014'}</td>
      <td className="px-4 py-3">
        <Badge
          variant="outline"
          className={cn('text-[11px] font-medium', providerBadge.className)}
        >
          {providerBadge.label}
        </Badge>
      </td>
      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
        {formatDateTime(user.createdAt)}
      </td>
      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
        {formatDateTime(user.lastLoginAt)}
      </td>
      <td className="px-4 py-3 text-center">
        <Switch
          checked={user.isActive}
          onCheckedChange={(checked) => onToggle(user, 'isActive', checked)}
          disabled={isUpdating}
          aria-label={`Toggle active for ${user.email}`}
        />
      </td>
      <td className="px-4 py-3 text-center">
        <Switch
          checked={user.isApproved}
          onCheckedChange={(checked) => onToggle(user, 'isApproved', checked)}
          disabled={isUpdating}
          aria-label={`Toggle approved for ${user.email}`}
        />
      </td>
    </tr>
  );
}

export { Component as AdminUsersPage };
export default Component;
