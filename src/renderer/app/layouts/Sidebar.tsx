/**
 * Sidebar -- Navigation sidebar
 *
 * Shows nav items grouped into collapsible "Personal" and "Development" sections.
 * Collapses to icon-only mode.
 */

import { useNavigate, useRouterState } from '@tanstack/react-router';
import {
  BarChart3,
  Bot,
  Briefcase,
  ChevronDown,
  Dumbbell,
  GitBranch,
  Headphones,
  Home,
  Lightbulb,
  ListTodo,
  Map,
  PanelLeft,
  PanelLeftClose,
  Plus,
  ScrollText,
  Settings,
  Terminal,
  Workflow,
} from 'lucide-react';

import { ROUTES, PROJECT_VIEWS, projectViewPath } from '@shared/constants';

import { HubConnectionIndicator } from '@renderer/shared/components/HubConnectionIndicator';
import { cn } from '@renderer/shared/lib/utils';
import { useLayoutStore } from '@renderer/shared/stores';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@ui';

import { UserMenu } from './UserMenu';

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
}

const NAV_BASE_STYLE =
  'flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-sm transition-colors';
const NAV_HOVER_STYLE = 'hover:bg-accent hover:text-foreground';
const INACTIVE_STYLE = 'text-muted-foreground';
const ACTIVE_STYLE = 'bg-accent text-foreground font-medium';
const COLLAPSED_STYLE = 'justify-center px-0';

/** Personal nav items (not project-scoped) */
const personalItems: NavItem[] = [
  { label: 'Dashboard', icon: Home, path: ROUTES.DASHBOARD },
  { label: 'My Work', icon: Briefcase, path: ROUTES.MY_WORK },
  { label: 'Fitness', icon: Dumbbell, path: ROUTES.FITNESS },
  { label: 'Productivity', icon: Headphones, path: ROUTES.PRODUCTIVITY },
];

/** Development nav items (project-scoped) */
const developmentItems: NavItem[] = [
  { label: 'Tasks', icon: ListTodo, path: PROJECT_VIEWS.TASKS },
  { label: 'Terminals', icon: Terminal, path: PROJECT_VIEWS.TERMINALS },
  { label: 'Agents', icon: Bot, path: PROJECT_VIEWS.AGENTS },
  { label: 'Pipeline', icon: Workflow, path: PROJECT_VIEWS.WORKFLOW },
  { label: 'Roadmap', icon: Map, path: PROJECT_VIEWS.ROADMAP },
  { label: 'Ideation', icon: Lightbulb, path: PROJECT_VIEWS.IDEATION },
  { label: 'GitHub', icon: GitBranch, path: PROJECT_VIEWS.GITHUB },
  { label: 'Changelog', icon: ScrollText, path: PROJECT_VIEWS.CHANGELOG },
  { label: 'Insights', icon: BarChart3, path: PROJECT_VIEWS.INSIGHTS },
];

export function Sidebar() {
  const navigate = useNavigate();
  const routerState = useRouterState();
  const { sidebarCollapsed, toggleSidebar, activeProjectId, addProjectTab } = useLayoutStore();

  const currentPath = routerState.location.pathname;

  // Sync URL → store: if we're on a /projects/:id/* route but the store lost the active project
  // (e.g. after page reload), re-hydrate it from the URL.
  const urlProjectId = /^\/projects\/([^/]+)/.exec(currentPath)?.[1] ?? null;
  if (urlProjectId !== null && urlProjectId !== activeProjectId) {
    addProjectTab(urlProjectId);
  }

  function handleNav(path: string) {
    if (activeProjectId === null) return;
    void navigate({ to: projectViewPath(activeProjectId, path) });
  }

  function renderPersonalItem(item: NavItem) {
    const isActive =
      currentPath === item.path || currentPath.startsWith(`${item.path}/`);
    return (
      <button
        key={item.path}
        title={sidebarCollapsed ? item.label : undefined}
        className={cn(
          NAV_BASE_STYLE,
          NAV_HOVER_STYLE,
          isActive ? ACTIVE_STYLE : INACTIVE_STYLE,
          sidebarCollapsed && COLLAPSED_STYLE,
        )}
        onClick={() => void navigate({ to: item.path })}
      >
        <item.icon className="h-4 w-4 shrink-0" />
        {sidebarCollapsed ? null : <span>{item.label}</span>}
      </button>
    );
  }

  function renderDevelopmentItem(item: NavItem) {
    const isActive =
      activeProjectId !== null && currentPath.endsWith(`/${item.path}`);
    return (
      <button
        key={item.path}
        disabled={activeProjectId === null}
        title={sidebarCollapsed ? item.label : undefined}
        className={cn(
          NAV_BASE_STYLE,
          NAV_HOVER_STYLE,
          'disabled:pointer-events-none disabled:opacity-40',
          isActive ? ACTIVE_STYLE : INACTIVE_STYLE,
          sidebarCollapsed && COLLAPSED_STYLE,
        )}
        onClick={() => handleNav(item.path)}
      >
        <item.icon className="h-4 w-4 shrink-0" />
        {sidebarCollapsed ? null : <span>{item.label}</span>}
      </button>
    );
  }

  function renderAddProjectButton() {
    return (
      <button
        title={sidebarCollapsed ? 'Add Project' : undefined}
        className={cn(
          NAV_BASE_STYLE,
          NAV_HOVER_STYLE,
          INACTIVE_STYLE,
          sidebarCollapsed && COLLAPSED_STYLE,
        )}
        onClick={() => void navigate({ to: ROUTES.PROJECTS })}
      >
        <Plus className="h-4 w-4 shrink-0" />
        {sidebarCollapsed ? null : <span>Add Project</span>}
      </button>
    );
  }

  return (
    <aside
      className="bg-sidebar text-sidebar-foreground flex h-full w-full flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="border-border flex h-12 items-center justify-between border-b px-3">
        {sidebarCollapsed ? null : (
          <span className="text-foreground text-sm font-semibold">ADC</span>
        )}
        <button
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
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
      <nav className="flex-1 overflow-y-auto p-2">
        {sidebarCollapsed ? (
          <>
            {/* Collapsed: icon-only items without section headers */}
            <div className="my-1">{renderAddProjectButton()}</div>
            <div className="space-y-1">
              {developmentItems.map(renderDevelopmentItem)}
            </div>
            <div className="space-y-1">
              {personalItems.map(renderPersonalItem)}
            </div>
          </>
        ) : (
          <>
            {/* Development section */}
            <Collapsible defaultOpen>
              <CollapsibleTrigger className="group text-muted-foreground hover:text-foreground flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wider">
                <span>Development</span>
                <ChevronDown className="h-3.5 w-3.5 transition-transform group-data-[state=closed]:-rotate-90" />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-1">
                {renderAddProjectButton()}
                {developmentItems.map(renderDevelopmentItem)}
              </CollapsibleContent>
            </Collapsible>

            {/* Personal section */}
            <Collapsible defaultOpen>
              <CollapsibleTrigger className="group text-muted-foreground hover:text-foreground flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wider">
                <span>Personal</span>
                <ChevronDown className="h-3.5 w-3.5 transition-transform group-data-[state=closed]:-rotate-90" />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-1">
                {personalItems.map(renderPersonalItem)}
              </CollapsibleContent>
            </Collapsible>
          </>
        )}
      </nav>

      {/* Footer: User menu + Hub indicator + Settings */}
      <div className="border-border border-t p-2">
        <UserMenu collapsed={sidebarCollapsed} />
        <HubConnectionIndicator collapsed={sidebarCollapsed} />
        <button
          title={sidebarCollapsed ? 'Settings' : undefined}
          className={cn(
            NAV_BASE_STYLE,
            NAV_HOVER_STYLE,
            currentPath.startsWith(ROUTES.SETTINGS) ? ACTIVE_STYLE : INACTIVE_STYLE,
            sidebarCollapsed && COLLAPSED_STYLE,
          )}
          onClick={() => void navigate({ to: ROUTES.SETTINGS })}
        >
          <Settings className="h-4 w-4 shrink-0" />
          {sidebarCollapsed ? null : <span>Settings</span>}
        </button>
      </div>
    </aside>
  );
}
