import { useState } from 'react';
import { NavLink, useLocation } from 'react-router';
import { cn } from '@/lib/utils';
import { useNavigation } from '@/hooks/use-navigation';
import {
  HardDrive, Cloud, FolderOpen, Image, CloudOff, CloudCog, Droplets, RefreshCw,
  Users, Link as LinkIcon, Chrome, ChevronRight,
} from 'lucide-react';
import type { MenuItem } from '@/api/types';

const iconMap: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
  HardDrive, Cloud, FolderOpen, Image, CloudOff, CloudCog, Droplets, RefreshCw, Users, Link: LinkIcon, Chrome,
};

function NavItem({ item }: { item: MenuItem }) {
  if (item.type === 'separator') {
    return (
      <div className="px-3 pt-6 pb-1">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {item.name}
        </span>
      </div>
    );
  }

  const Icon = item.icon ? iconMap[item.icon] : null;

  return (
    <NavLink
      to={item.path!}
      className={({ isActive }) =>
        cn(
          'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150',
          isActive
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )
      }
    >
      {Icon && <Icon size={18} className="shrink-0" />}
      <span className="truncate">{item.name}</span>
      {item.connectionStatuses && (
        <div className="ml-auto flex items-center gap-1.5">
          {item.connectionStatuses.map((s) => (
            <span
              key={s.configId}
              className={cn(
                'h-2 w-2 rounded-full',
                s.connected ? 'bg-emerald-500' : 'bg-slate-300'
              )}
              title={`${s.label}: ${s.connected ? 'Connected' : 'Not connected'}`}
            />
          ))}
        </div>
      )}
    </NavLink>
  );
}

function NavGroup({ item }: { item: MenuItem }) {
  const location = useLocation();
  const childPaths = item.children?.map((c) => c.path) ?? [];
  const isChildActive = childPaths.some((p) => p && location.pathname.startsWith(p));
  const [open, setOpen] = useState(isChildActive);

  const Icon = item.icon ? iconMap[item.icon] : null;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 cursor-pointer',
          isChildActive
            ? 'text-primary'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )}
      >
        {Icon && <Icon size={18} className="shrink-0" />}
        <span className="truncate">{item.name}</span>
        <ChevronRight
          size={14}
          className={cn(
            'ml-auto shrink-0 transition-transform duration-150',
            open && 'rotate-90'
          )}
        />
      </button>
      {open && (
        <div className="ml-3 space-y-0.5">
          {item.children?.map((child) => (
            <NavItem key={child.path} item={child} />
          ))}
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  const menuItems = useNavigation();

  return (
    <aside className="flex h-full w-64 flex-col border-r border-sidebar-border bg-sidebar-bg">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 px-5 border-b border-sidebar-border">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Cloud className="h-4.5 w-4.5 text-white" size={18} />
        </div>
        <span className="text-lg font-bold tracking-tight text-foreground">CloudFiles</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {menuItems.map((item, i) =>
          item.type === 'group' ? (
            <NavGroup key={item.name || `grp-${i}`} item={item} />
          ) : (
            <NavItem key={item.path || `sep-${i}`} item={item} />
          )
        )}
      </nav>
    </aside>
  );
}
