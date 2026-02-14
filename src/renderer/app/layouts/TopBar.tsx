/**
 * TopBar — Unified top bar with project tabs and command bar
 *
 * Replaces ProjectTabBar. Left side has project tabs, right side has
 * the global command bar for assistant input.
 */

import { useNavigate } from '@tanstack/react-router';
import { FolderOpen, Plus, X } from 'lucide-react';

import { ROUTES, PROJECT_VIEWS, projectViewPath } from '@shared/constants';

import { cn } from '@renderer/shared/lib/utils';
import { useLayoutStore } from '@renderer/shared/stores';

import { useProjects } from '@features/projects';

import { CommandBar } from './CommandBar';

export function TopBar() {
  // 1. Hooks
  const navigate = useNavigate();
  const { activeProjectId, projectTabOrder, setActiveProject, removeProjectTab } = useLayoutStore();
  const { data: projects } = useProjects();

  // 2. Derived state
  const openProjects = projectTabOrder
    .map((id) => projects?.find((p) => p.id === id))
    .filter(Boolean);

  // 3. Handlers
  function handleSelectProject(projectId: string) {
    setActiveProject(projectId);
    void navigate({ to: projectViewPath(projectId, PROJECT_VIEWS.TASKS) });
  }

  function handleCloseTab(e: React.MouseEvent | React.KeyboardEvent, projectId: string) {
    e.stopPropagation();
    removeProjectTab(projectId);
  }

  function handleAddProject() {
    void navigate({ to: ROUTES.PROJECTS });
  }

  // 4. Render
  return (
    <div className="border-border bg-card flex h-10 items-center gap-px border-b px-1">
      {/* Left: Project tabs */}
      <div className="flex min-w-0 flex-1 items-center gap-px overflow-hidden">
        {openProjects.map((project) => {
          if (!project) return null;
          const isActive = project.id === activeProjectId;
          return (
            <button
              key={project.id}
              className={cn(
                'group flex items-center gap-2 rounded-t-md px-3 py-1.5 text-sm transition-colors',
                isActive
                  ? 'bg-background text-foreground border-primary border-b-2'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
              onClick={() => handleSelectProject(project.id)}
            >
              <FolderOpen className="h-3.5 w-3.5 shrink-0" />
              <span className="max-w-32 truncate">{project.name}</span>
              <span
                aria-label={`Close ${project.name} tab`}
                className="hover:bg-muted ml-1 rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100"
                role="button"
                tabIndex={0}
                onClick={(e) => handleCloseTab(e, project.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') handleCloseTab(e, project.id);
                }}
              >
                <X className="h-3 w-3" />
              </span>
            </button>
          );
        })}

        <button
          className="text-muted-foreground hover:bg-accent hover:text-foreground ml-1 rounded-md p-1.5"
          title="Open project"
          onClick={handleAddProject}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Right: Command bar */}
      <div className="ml-2 w-80 shrink-0">
        <CommandBar />
      </div>
    </div>
  );
}
