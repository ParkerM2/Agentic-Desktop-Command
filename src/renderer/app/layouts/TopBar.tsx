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

import { ipc } from '@renderer/shared/lib/ipc';
import { cn } from '@renderer/shared/lib/utils';
import { useLayoutStore } from '@renderer/shared/stores';

import { Button } from '@ui';

import { HealthIndicator } from '@features/health';
import { useProjects } from '@features/projects';
import { WorkflowStatusBar } from '@features/workflow';

import { useSidebar } from '@ui/sidebar';

import { TitleBarScreenshot } from './TitleBarScreenshot';

export function TopBar() {
  const navigate = useNavigate();
  const { activeProjectId, projectTabOrder, removeProjectTab, setActiveProject } = useLayoutStore();
  const { data: projects } = useProjects();
  const { toggleSidebar } = useSidebar();
  const [isMaximized, setIsMaximized] = useState(false);

  const refreshMaximizedState = useCallback(async () => {
    try {
      const result = await ipc('window.isMaximized', {});
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
    void ipc('window.minimize', {});
  }

  function handleMaximize() {
    void ipc('window.maximize', {});
    setIsMaximized((prev) => !prev);
  }

  function handleClose() {
    void ipc('window.close', {});
  }

  return (
    <div className="electron-drag border-border bg-card flex h-10 shrink-0 items-stretch border-b">
      {/* Sidebar toggle */}
      <div className="electron-no-drag border-border flex shrink-0 items-center border-r">
        <Button
          aria-label="Toggle sidebar"
          className="text-muted-foreground hover:bg-accent hover:text-foreground h-10 w-10 rounded-none"
          size="icon"
          variant="ghost"
          onClick={toggleSidebar}
        >
          <PanelLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* Project tabs — VSCode-style: right border per tab, horizontal scroll */}
      <div className="electron-no-drag flex min-w-0 flex-1 items-stretch overflow-x-auto overflow-y-hidden">
        {openProjects.map((project) => {
          if (!project) return null;
          const isActive = project.id === activeProjectId;
          return (
            <button
              key={project.id}
              className={cn(
                'border-border group flex h-full shrink-0 items-center gap-1.5 border-r px-3 text-xs transition-colors',
                isActive
                  ? 'bg-background text-foreground'
                  : 'bg-card text-muted-foreground hover:text-foreground',
              )}
              onClick={() => handleSelectProject(project.id)}
            >
              {isActive ? (
                <FolderOpen className="text-primary h-3 w-3 shrink-0" />
              ) : (
                <Folder className="h-3 w-3 shrink-0" />
              )}
              <span className="max-w-32 truncate">{project.name}</span>
              <button
                aria-label={`Close ${project.name} tab`}
                className="text-muted-foreground hover:text-foreground ml-0.5 flex h-4 w-4 items-center justify-center rounded-sm opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeProjectTab(project.id);
                }}
              >
                <X className="h-3 w-3" />
              </button>
            </button>
          );
        })}

        {/* Add tab — sticky, grows with list until hitting settings */}
        <button
          className="border-border text-muted-foreground hover:text-foreground flex h-full shrink-0 items-center border-r px-3 transition-colors"
          title="Open project"
          type="button"
          onClick={handleAddProject}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>

        {/* Drag spacer fills remaining space */}
        <div className="flex-1" />
      </div>

      {/* Utility buttons — left border per item, matching tab style */}
      <div className="electron-no-drag flex h-full items-center">
        <WorkflowStatusBar />
        <button
          aria-label="Settings"
          className="border-border text-muted-foreground hover:bg-accent hover:text-foreground flex h-full items-center border-l px-3"
          type="button"
          onClick={() => void navigate({ to: ROUTES.SETTINGS })}
        >
          <Settings className="h-3.5 w-3.5" />
        </button>
        <div className="border-border flex h-full items-center border-l">
          <TitleBarScreenshot />
        </div>
        <div className="border-border flex h-full items-center border-l px-2">
          <HealthIndicator />
        </div>
      </div>

      {/* Window controls — left border per button */}
      <div className="electron-no-drag flex h-full items-center">
        <button
          aria-label="Minimize window"
          className="border-border text-muted-foreground hover:bg-muted hover:text-foreground flex h-full w-10 items-center justify-center border-l"
          type="button"
          onClick={handleMinimize}
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <button
          aria-label={isMaximized ? 'Restore window' : 'Maximize window'}
          className="border-border text-muted-foreground hover:bg-muted hover:text-foreground flex h-full w-10 items-center justify-center border-l"
          type="button"
          onClick={handleMaximize}
        >
          {isMaximized ? (
            <svg
              aria-hidden="true"
              className="h-3 w-3"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              viewBox="0 0 10 10"
            >
              <rect height="7" rx="0.5" width="7" x="0.5" y="2.5" />
              <path d="M2.5 2.5V1a.5.5 0 0 1 .5-.5h6a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-.5.5H8" />
            </svg>
          ) : (
            <Square className="h-3 w-3" />
          )}
        </button>
        <button
          aria-label="Close window"
          className="border-border text-muted-foreground hover:bg-destructive hover:text-destructive-foreground flex h-full w-10 items-center justify-center border-l"
          type="button"
          onClick={handleClose}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
