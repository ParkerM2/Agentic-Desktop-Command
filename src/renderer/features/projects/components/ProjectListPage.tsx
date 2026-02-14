/**
 * ProjectListPage — Shows all projects with add/remove controls
 */

import { useState } from 'react';

import { useNavigate } from '@tanstack/react-router';
import { FolderOpen, Plus, Trash2, Loader2, Wand2 } from 'lucide-react';

import { PROJECT_VIEWS, projectViewPath } from '@shared/constants';

import { cn, formatRelativeTime } from '@renderer/shared/lib/utils';
import { useLayoutStore } from '@renderer/shared/stores';

import {
  useProjects,
  useAddProject,
  useRemoveProject,
  useSelectDirectory,
} from '../api/useProjects';

import { ProjectInitWizard } from './ProjectInitWizard';

export function ProjectListPage() {
  const navigate = useNavigate();
  const { data: projects, isLoading } = useProjects();
  const addProject = useAddProject();
  const removeProject = useRemoveProject();
  const selectDirectory = useSelectDirectory();
  const { addProjectTab } = useLayoutStore();
  const [wizardOpen, setWizardOpen] = useState(false);

  async function handleAddProject() {
    const result = await selectDirectory.mutateAsync();
    if (result.path) {
      const project = await addProject.mutateAsync(result.path);
      addProjectTab(project.id);
      void navigate({ to: projectViewPath(project.id, PROJECT_VIEWS.TASKS) });
    }
  }

  function handleOpenProject(projectId: string) {
    addProjectTab(projectId);
    void navigate({ to: projectViewPath(projectId, PROJECT_VIEWS.TASKS) });
  }

  function handleWizardComplete(projectId: string) {
    setWizardOpen(false);
    addProjectTab(projectId);
    void navigate({ to: projectViewPath(projectId, PROJECT_VIEWS.TASKS) });
  }

  function handleRemoveProject(e: React.MouseEvent | React.KeyboardEvent, projectId: string) {
    e.stopPropagation();
    removeProject.mutate(projectId);
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Projects</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={cn(
              'border-border text-foreground flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium',
              'hover:bg-accent transition-colors',
            )}
            onClick={() => setWizardOpen(true)}
          >
            <Wand2 className="h-4 w-4" />
            Init Wizard
          </button>
          <button
            disabled={addProject.isPending}
            className={cn(
              'bg-primary text-primary-foreground flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium',
              'hover:bg-primary/90 transition-colors',
              'disabled:pointer-events-none disabled:opacity-50',
            )}
            onClick={handleAddProject}
          >
            <Plus className="h-4 w-4" />
            Add Project
          </button>
        </div>
      </div>

      {projects && projects.length > 0 ? (
        <div className="space-y-2">
          {projects.map((project) => (
            <button
              key={project.id}
              className={cn(
                'border-border flex w-full items-center justify-between rounded-lg border p-4',
                'hover:bg-accent text-left transition-colors',
              )}
              onClick={() => handleOpenProject(project.id)}
            >
              <div className="flex items-center gap-3">
                <FolderOpen className="text-muted-foreground h-5 w-5" />
                <div>
                  <p className="font-medium">{project.name}</p>
                  <p className="text-muted-foreground text-xs">{project.path}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground text-xs">
                  {formatRelativeTime(project.updatedAt)}
                </span>
                <span
                  className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded p-1"
                  role="button"
                  tabIndex={0}
                  onClick={(e) => handleRemoveProject(e, project.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') handleRemoveProject(e, project.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </span>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="border-border rounded-lg border border-dashed p-12 text-center">
          <FolderOpen className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
          <p className="text-lg font-medium">No projects yet</p>
          <p className="text-muted-foreground mt-1 text-sm">Add a project folder to get started</p>
        </div>
      )}

      {wizardOpen ? (
        <ProjectInitWizard
          onClose={() => setWizardOpen(false)}
          onComplete={handleWizardComplete}
        />
      ) : null}
    </div>
  );
}
