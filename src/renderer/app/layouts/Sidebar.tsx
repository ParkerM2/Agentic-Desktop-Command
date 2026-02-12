/**
 * Sidebar — Navigation sidebar
 *
 * Shows nav items for the active project's views.
 * Collapses to icon-only mode.
 */

import { useNavigate, useRouterState } from '@tanstack/react-router';
import {
  LayoutDashboard,
  ListTodo,
  Terminal,
  Bot,
  GitBranch,
  Map,
  Lightbulb,
  Settings,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';

import { cn } from '@renderer/shared/lib/utils';
import { useLayoutStore } from '@renderer/shared/stores';

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
}

const navItems: NavItem[] = [
  { label: 'Kanban', icon: LayoutDashboard, path: 'kanban' },
  { label: 'Tasks', icon: ListTodo, path: 'tasks' },
  { label: 'Terminals', icon: Terminal, path: 'terminals' },
  { label: 'Agents', icon: Bot, path: 'agents' },
  { label: 'Roadmap', icon: Map, path: 'roadmap' },
  { label: 'Ideation', icon: Lightbulb, path: 'ideation' },
  { label: 'GitHub', icon: GitBranch, path: 'github' },
];

export function Sidebar() {
  const navigate = useNavigate();
  const routerState = useRouterState();
  const { sidebarCollapsed, toggleSidebar, activeProjectId } = useLayoutStore();

  const currentPath = routerState.location.pathname;

  function handleNav(path: string) {
    if (!activeProjectId) return;
    void navigate({ to: `/projects/${activeProjectId}/${path}` });
  }

  return (
    <aside
      className={cn(
        'border-border bg-card flex flex-col border-r transition-all duration-200',
        sidebarCollapsed ? 'w-14' : 'w-52',
      )}
    >
      {/* Header */}
      <div className="border-border flex h-12 items-center justify-between border-b px-3">
        {!sidebarCollapsed && (
          <span className="text-foreground text-sm font-semibold">Claude UI</span>
        )}
        <button
          className="text-muted-foreground hover:bg-accent hover:text-foreground rounded-md p-1.5"
          onClick={toggleSidebar}
        >
          {sidebarCollapsed ? (
            <PanelLeft className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => {
          const isActive = currentPath.includes(`/${item.path}`);
          return (
            <button
              key={item.path}
              disabled={!activeProjectId}
              title={sidebarCollapsed ? item.label : undefined}
              className={cn(
                'flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-sm transition-colors',
                'hover:bg-accent hover:text-foreground',
                'disabled:pointer-events-none disabled:opacity-40',
                isActive ? 'bg-accent text-foreground font-medium' : 'text-muted-foreground',
                sidebarCollapsed && 'justify-center px-0',
              )}
              onClick={() => handleNav(item.path)}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Settings at bottom */}
      <div className="border-border border-t p-2">
        <button
          title={sidebarCollapsed ? 'Settings' : undefined}
          className={cn(
            'text-muted-foreground flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-sm',
            'hover:bg-accent hover:text-foreground transition-colors',
            currentPath.includes('/settings') && 'bg-accent text-foreground font-medium',
            sidebarCollapsed && 'justify-center px-0',
          )}
          onClick={() => navigate({ to: '/settings' })}
        >
          <Settings className="h-4 w-4 shrink-0" />
          {!sidebarCollapsed && <span>Settings</span>}
        </button>
      </div>
    </aside>
  );
}
