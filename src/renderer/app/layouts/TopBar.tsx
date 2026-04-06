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

import { HubStatus } from '@renderer/shared/components/HubStatus';
import { ipc } from '@renderer/shared/lib/ipc';
import { cn } from '@renderer/shared/lib/utils';
import { useLayoutStore } from '@renderer/shared/stores';

import { Button, Separator } from '@ui';

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
      <div className="electron-no-drag flex items-center">
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
      <div className="bg-border my-2 w-px shrink-0" />

      {/* Project tabs */}
      <div className="electron-no-drag flex min-w-0 items-stretch overflow-hidden">
        {openProjects.map((project) => {
          if (!project) return null;
          const isActive = project.id === activeProjectId;
          return (
            <button
              key={project.id}
              className={cn(
                'border-border group flex h-full items-center gap-1.5 border-r px-4 text-xs transition-colors',
                'border-t-2',
                isActive
                  ? 'border-t-primary bg-background text-foreground'
                  : 'border-t-transparent text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
              onClick={() => handleSelectProject(project.id)}
            >
              {isActive ? (
                <FolderOpen className="text-primary h-3 w-3 shrink-0" />
              ) : (
                <Folder className="h-3 w-3 shrink-0" />
              )}
              <span className="max-w-32 truncate font-mono">{project.name}</span>
              <Button
                aria-label={`Close ${project.name} tab`}
                className="ml-0.5 h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100"
                size="icon"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  removeProjectTab(project.id);
                }}
              >
                ×
              </Button>
            </button>
          );
        })}
        <button
          className="text-muted-foreground hover:text-foreground flex h-full items-center px-3 transition-colors"
          title="Open project"
          onClick={handleAddProject}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Drag spacer */}
      <div className="flex-1" />

      {/* Utility buttons */}
      <div className="electron-no-drag flex items-center gap-0.5 px-1">
        <WorkflowStatusBar />
        <Button
          aria-label="Settings"
          size="icon-sm"
          variant="ghost"
          onClick={() => void navigate({ to: ROUTES.SETTINGS })}
        >
          <Settings />
        </Button>
        <TitleBarScreenshot />
        <HealthIndicator />
        <HubStatus />
      </div>

      {/* Separator */}
      <Separator className="mx-1 self-center" orientation="vertical" />

      {/* Window controls */}
      <div className="electron-no-drag flex h-full items-center">
        <Button
          aria-label="Minimize window"
          className="text-muted-foreground hover:bg-muted hover:text-foreground h-10 w-10 rounded-none"
          size="icon"
          variant="ghost"
          onClick={handleMinimize}
        >
          <Minus className="h-3.5 w-3.5" />
        </Button>
        <Button
          aria-label={isMaximized ? 'Restore window' : 'Maximize window'}
          className="text-muted-foreground hover:bg-muted hover:text-foreground h-10 w-10 rounded-none"
          size="icon"
          variant="ghost"
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
        </Button>
        <Button
          aria-label="Close window"
          className="text-muted-foreground hover:bg-destructive hover:text-destructive-foreground h-10 w-10 rounded-none"
          size="icon"
          variant="ghost"
          onClick={handleClose}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
