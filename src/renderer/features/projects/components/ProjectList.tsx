/**
 * ProjectList — Page component for managing projects.
 */

import { FolderOpen, Plus, Trash2 } from 'lucide-react';

import { cn } from '@renderer/shared/lib/utils';
import { useLayoutStore } from '@renderer/shared/stores/layout-store';

import {
  useProjects,
  useAddProject,
  useRemoveProject,
  useSelectDirectory,
} from '../api/useProjects';

export function ProjectList() {
  const { data: projects, isLoading } = useProjects();
  const addProject = useAddProject();
  const removeProject = useRemoveProject();
  const selectDir = useSelectDirectory();
  const activeProjectId = useLayoutStore((s) => s.activeProjectId);
  const setActiveProject = useLayoutStore((s) => s.setActiveProject);

  const handleAdd = async () => {
    const result = await selectDir.mutateAsync();
    if (result.path) {
      const project = await addProject.mutateAsync({ path: result.path });
      setActiveProject(project.id);
    }
  };

  if (isLoading) {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center">
        Loading projects…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Projects</h1>
        <button
          className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 rounded-md px-3 py-1.5 text-sm"
          onClick={handleAdd}
        >
          <Plus className="h-4 w-4" />
          Add Project
        </button>
      </div>

      {projects && projects.length > 0 ? (
        <div className="space-y-2">
          {projects.map((project) => (
            <div
              key={project.id}
              role="button"
              tabIndex={0}
              className={cn(
                'flex cursor-pointer items-center justify-between rounded-lg border px-4 py-3 transition-colors',
                activeProjectId === project.id
                  ? 'border-primary/50 bg-accent'
                  : 'border-border hover:bg-accent/50',
              )}
              onClick={() => setActiveProject(project.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') setActiveProject(project.id);
              }}
            >
              <div>
                <p className="text-sm font-medium">{project.name}</p>
                <p className="text-muted-foreground text-xs">{project.path}</p>
              </div>
              <button
                className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-md p-1.5"
                onClick={(e) => {
                  e.stopPropagation();
                  removeProject.mutate(project.id);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-muted-foreground flex flex-col items-center justify-center py-20">
          <FolderOpen className="mb-3 h-12 w-12 opacity-40" />
          <p className="text-sm">No projects yet. Add a project folder to get started.</p>
        </div>
      )}
    </div>
  );
}
