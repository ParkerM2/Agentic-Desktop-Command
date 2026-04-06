/**
 * ProjectTabBar — Horizontal tabs for open projects
 *
 * Shows project tabs + "add project" button. Clicking a tab
 * switches the active project and navigates to its last view.
 */

import { useNavigate } from '@tanstack/react-router';
import { FolderOpen, Plus, X } from 'lucide-react';

import { PROJECT_VIEWS, ROUTES, projectViewPath } from '@shared/constants';

import { cn } from '@renderer/shared/lib/utils';
import { useLayoutStore } from '@renderer/shared/stores';

import { Button } from '@ui';

import { useProjects } from '@features/projects';

export function ProjectTabBar() {
  const navigate = useNavigate();
  const { activeProjectId, projectTabOrder, removeProjectTab, setActiveProject } = useLayoutStore();
  const { data: projects } = useProjects();

  const openProjects = projectTabOrder
    .map((id) => projects?.find((p) => p.id === id))
    .filter(Boolean);

  function handleSelectProject(projectId: string) {
    setActiveProject(projectId);
    void navigate({ to: projectViewPath(projectId, PROJECT_VIEWS.TASKS) });
  }

  function handleCloseTab(e: React.MouseEvent, projectId: string) {
    e.stopPropagation();
    removeProjectTab(projectId);
  }

  function handleAddProject() {
    void navigate({ to: ROUTES.PROJECTS });
  }

  return (
    <div className="border-border bg-card flex h-10 items-center gap-px border-b px-1">
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
            <Button
              aria-label={`Close ${project.name} tab`}
              className="ml-1 h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100"
              size="icon"
              variant="ghost"
              onClick={(e) => handleCloseTab(e, project.id)}
            >
              <X className="h-3 w-3" />
            </Button>
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
  );
}
