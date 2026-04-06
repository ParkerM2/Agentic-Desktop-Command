/**
 * ProjectList — Page component for managing projects.
 */

import { FolderOpen, GitBranch, Plus, Trash2 } from 'lucide-react';

import type { Project } from '@shared/types';

import { cn } from '@renderer/shared/lib/utils';
import { useLayoutStore } from '@renderer/shared/stores/layout-store';

import { Badge, Button } from '@ui';

import { useGitStatus } from '../api/useGit';
import {
  useProjects,
  useAddProject,
  useRemoveProject,
  useSelectDirectory,
} from '../api/useProjects';

function GitStatusIndicator({ project }: { project: Project }) {
  const { data: status } = useGitStatus(project.path);

  if (!status) {
    return null;
  }

  return (
    <div className="flex items-center gap-1.5">
      <GitBranch className="text-muted-foreground h-3 w-3" />
      <span className="text-muted-foreground text-xs">{status.branch}</span>
      {status.isClean ? (
        <Badge className="px-1.5 py-0 text-[10px]" variant="outline">clean</Badge>
      ) : (
        <Badge className="px-1.5 py-0 text-[10px]" variant="secondary">
          {String(status.modified.length + status.staged.length)} changed
        </Badge>
      )}
    </div>
  );
}

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
        <Button size="sm" onClick={handleAdd}>
          <Plus className="h-4 w-4" />
          Add Project
        </Button>
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
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{project.name}</p>
                  <GitStatusIndicator project={project} />
                </div>
                <p className="text-muted-foreground text-xs">{project.path}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation();
                  removeProject.mutate(project.id);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
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
