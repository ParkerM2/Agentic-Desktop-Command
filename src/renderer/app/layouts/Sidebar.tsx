/**
 * Sidebar — Navigation sidebar
 *
 * Shows nav items for the active project's views.
 * Collapses to icon-only mode.
 */

import { useNavigate, useRouterState } from '@tanstack/react-router';
import {
  BarChart3,
  Bot,
  GitBranch,
  Home,
  LayoutDashboard,
  Lightbulb,
  ListTodo,
  Map,
  PanelLeft,
  PanelLeftClose,
  ScrollText,
  Settings,
  Terminal,
} from 'lucide-react';

import { ROUTES, PROJECT_VIEWS, projectViewPath } from '@shared/constants';

import { cn } from '@renderer/shared/lib/utils';
import { useLayoutStore } from '@renderer/shared/stores';

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
}

const navItems: NavItem[] = [
  { label: 'Kanban', icon: LayoutDashboard, path: PROJECT_VIEWS.KANBAN },
  { label: 'Tasks', icon: ListTodo, path: PROJECT_VIEWS.TASKS },
  { label: 'Terminals', icon: Terminal, path: PROJECT_VIEWS.TERMINALS },
  { label: 'Agents', icon: Bot, path: PROJECT_VIEWS.AGENTS },
  { label: 'Roadmap', icon: Map, path: PROJECT_VIEWS.ROADMAP },
  { label: 'Ideation', icon: Lightbulb, path: PROJECT_VIEWS.IDEATION },
  { label: 'GitHub', icon: GitBranch, path: PROJECT_VIEWS.GITHUB },
  { label: 'Changelog', icon: ScrollText, path: PROJECT_VIEWS.CHANGELOG },
  { label: 'Insights', icon: BarChart3, path: PROJECT_VIEWS.INSIGHTS },
];

export function Sidebar() {
  const navigate = useNavigate();
  const routerState = useRouterState();
  const { sidebarCollapsed, toggleSidebar, activeProjectId } = useLayoutStore();

  const currentPath = routerState.location.pathname;

  function handleNav(path: string) {
    if (!activeProjectId) return;
    void navigate({ to: projectViewPath(activeProjectId, path) });
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
        {/* Dashboard — top-level, not project-scoped */}
        <button
          title={sidebarCollapsed ? 'Dashboard' : undefined}
          className={cn(
            'flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-sm transition-colors',
            'hover:bg-accent hover:text-foreground',
            currentPath === ROUTES.DASHBOARD
              ? 'bg-accent text-foreground font-medium'
              : 'text-muted-foreground',
            sidebarCollapsed && 'justify-center px-0',
          )}
          onClick={() => void navigate({ to: ROUTES.DASHBOARD })}
        >
          <Home className="h-4 w-4 shrink-0" />
          {!sidebarCollapsed && <span>Dashboard</span>}
        </button>

        {/* Divider */}
        <div className="border-border my-1 border-t" />

        {/* Project views */}
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
            currentPath.includes(ROUTES.SETTINGS) && 'bg-accent text-foreground font-medium',
            sidebarCollapsed && 'justify-center px-0',
          )}
          onClick={() => navigate({ to: ROUTES.SETTINGS })}
        >
          <Settings className="h-4 w-4 shrink-0" />
          {!sidebarCollapsed && <span>Settings</span>}
        </button>
      </div>
    </aside>
  );
}
