/**
 * TopBar — Unified app bar
 *
 * Single bar replacing the old TitleBar + TopBar stack.
 * Lives inside SidebarInset (inside SidebarProvider) so SidebarTrigger works.
 * Provides the electron drag region, project tabs, utility buttons, and window controls.
 */

import { useCallback, useEffect, useState } from 'react';

import { useNavigate } from '@tanstack/react-router';
import { Folder, FolderOpen, Minus, PanelLeft, Plus, Settings, Square, X } from 'lucide-react';

import { PROJECT_VIEWS, ROUTES, projectViewPath } from '@shared/constants';
import { WINDOW } from '@shared/ipc/window/channels';
import type { ToolbarStyleId } from '@shared/types/layout';

import { ipc } from '@renderer/shared/lib/ipc';
import { cn } from '@renderer/shared/lib/utils';
import { useLayoutStore } from '@renderer/shared/stores';

import { Badge, Button } from '@ui';

import { useProjects } from '@features/projects';
import { HealthIndicator } from '@features/settings';
import { WorkflowStatusBar } from '@features/workflow';

import { useSidebar } from '@ui/sidebar';

import { TitleBarScreenshot } from './TitleBarScreenshot';

// ── Toolbar style classes ─────────────────────────────────────

const TOOLBAR_CLASSES: Record<ToolbarStyleId, string> = {
  default: 'h-10 bg-card border border-border',
  floating: 'h-9 bg-card/90 border border-border rounded-lg shadow-sm overflow-hidden',
};

export function TopBar() {
  const navigate = useNavigate();
  const { toolbarStyle, activeProjectId, projectTabOrder, removeProjectTab, setActiveProject } = useLayoutStore();
  const { data: projects } = useProjects();
  const { toggleSidebar } = useSidebar();
  const [isMaximized, setIsMaximized] = useState(false);

  const refreshMaximizedState = useCallback(async () => {
    try {
      const result = await ipc(WINDOW.CHECK.MAXIMIZED, {});
      setIsMaximized(result.isMaximized);
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    void refreshMaximizedState();
  }, [refreshMaximizedState]);

  useEffect(() => {
    function handleResize() {
      void refreshMaximizedState();
    }
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [refreshMaximizedState]);

  const openProjects = projectTabOrder
    .map((id) => projects?.find((p) => p.id === id))
    .filter(Boolean);

  function handleSelectProject(projectId: string) {
    setActiveProject(projectId);
    void navigate({ to: projectViewPath(projectId, PROJECT_VIEWS.TASKS) });
  }

  function handleAddProject() {
    void navigate({ to: ROUTES.PROJECTS });
  }

  function handleMinimize() {
    void ipc(WINDOW.MINIMIZE.APP, {});
  }

  function handleMaximize() {
    void ipc(WINDOW.MAXIMIZE.APP, {});
    setIsMaximized((prev) => !prev);
  }

  function handleClose() {
    void ipc(WINDOW.CLOSE.APP, {});
  }

  return (
    <div className={cn('electron-drag flex shrink-0 items-stretch', TOOLBAR_CLASSES[toolbarStyle])}>
      {/* Sidebar toggle */}
      <div className="electron-no-drag flex shrink-0 items-stretch">
        <Button
          aria-label="Toggle sidebar"
          className="border-r border-l-0"
          size="toolbar"
          variant="toolbar"
          onClick={toggleSidebar}
        >
          <PanelLeft />
        </Button>
      </div>

      {/* Project tabs — VSCode-style: right border per tab, horizontal scroll */}
      <div className="electron-no-drag flex min-w-0 items-stretch overflow-x-auto overflow-y-hidden">
        {openProjects.map((project) => {
          if (!project) return null;
          const isActive = project.id === activeProjectId;
          return (
            <div
              key={project.id}
              role="tab"
              tabIndex={0}
              className={cn(
                'border-border group flex h-full shrink-0 cursor-pointer items-center gap-1.5 border-r px-3 text-xs transition-colors',
                isActive
                  ? 'bg-background text-foreground'
                  : 'bg-card text-muted-foreground hover:text-foreground',
              )}
              onClick={() => handleSelectProject(project.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleSelectProject(project.id);
                }
              }}
            >
              {isActive ? (
                <FolderOpen className="text-primary h-3 w-3 shrink-0" />
              ) : (
                <Folder className="h-3 w-3 shrink-0" />
              )}
              <span className="max-w-32 truncate">{project.name}</span>
              <Button
                aria-label={`Close ${project.name} tab`}
                className="text-muted-foreground hover:text-foreground ml-0.5 h-4 w-4 opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100"
                size="icon"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  removeProjectTab(project.id);
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          );
        })}

        {/* Add tab — sticky, grows with list until hitting settings */}
        <Button
          aria-label="Open project"
          className="border-border text-muted-foreground hover:text-foreground h-full shrink-0 rounded-none border-r px-3"
          title="Open project"
          variant="ghost"
          onClick={handleAddProject}
        >
          <Plus className="h-4 w-4" />
        </Button>

      </div>

      {/* Drag spacer fills remaining space — must be outside electron-no-drag */}
      <div className="electron-drag flex-1" />

      {/* Utility buttons — same w-10 sizing as window controls */}
      <div className="electron-no-drag flex h-full items-center">
        <Badge display={window.appInfo.devMode} size="sm" value="DEV" variant="warning" />
        <WorkflowStatusBar />
        <Button
          aria-label="Settings"
          size="toolbar"
          variant="toolbar"
          onClick={() => void navigate({ to: ROUTES.SETTINGS })}
        >
          <Settings />
        </Button>
        <TitleBarScreenshot />
        <div className="border-border flex h-full items-center border-l px-2">
          <HealthIndicator />
        </div>
      </div>

      {/* Window controls — left border per button */}
      <div className="electron-no-drag flex h-full items-center">
        <Button
          aria-label="Minimize window"
          size="toolbar"
          variant="toolbar"
          onClick={handleMinimize}
        >
          <Minus />
        </Button>
        <Button
          aria-label={isMaximized ? 'Restore window' : 'Maximize window'}
          size="toolbar"
          variant="toolbar"
          onClick={handleMaximize}
        >
          {isMaximized ? (
            <svg
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              viewBox="0 0 10 10"
            >
              <rect height="7" rx="0.5" width="7" x="0.5" y="2.5" />
              <path d="M2.5 2.5V1a.5.5 0 0 1 .5-.5h6a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-.5.5H8" />
            </svg>
          ) : (
            <Square />
          )}
        </Button>
        <Button
          aria-label="Close window"
          className="hover:bg-destructive hover:text-destructive-foreground"
          size="toolbar"
          variant="toolbar"
          onClick={handleClose}
        >
          <X />
        </Button>
      </div>
    </div>
  );
}
