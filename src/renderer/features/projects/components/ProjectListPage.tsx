/**
 * ProjectListPage — Shows all projects with add/remove controls
 */

import { useState } from 'react';

import { useNavigate } from '@tanstack/react-router';
import { FolderOpen, Layers, Loader2, Pencil, Sparkles, Trash2, Wand2 } from 'lucide-react';

import { PROJECT_VIEWS, projectViewPath } from '@shared/constants';
import type { Project, RepoType } from '@shared/types';

import { cn, formatRelativeTime } from '@renderer/shared/lib/utils';
import { useLayoutStore, useToastStore } from '@renderer/shared/stores';

import { useProjects, useRemoveProject, useSubProjects } from '../api/useProjects';

import { CreateProjectWizard } from './CreateProjectWizard';
import { ProjectEditDialog } from './ProjectEditDialog';
import { ProjectInitWizard } from './ProjectInitWizard';

function repoStructureBadgeClass(structure: RepoType): string {
  if (structure === 'monorepo') return 'bg-info/10 text-info';
  if (structure === 'multi-repo') return 'bg-warning/10 text-warning';
  return 'bg-muted text-muted-foreground';
}

function repoStructureLabel(structure: RepoType): string {
  if (structure === 'monorepo') return 'monorepo';
  if (structure === 'multi-repo') return 'multi-repo';
  return 'single';
}

interface ProjectRowProps {
  project: Project;
  onEdit: (e: React.MouseEvent | React.KeyboardEvent, project: Project) => void;
  onOpen: (projectId: string) => void;
  onRemove: (e: React.MouseEvent | React.KeyboardEvent, projectId: string) => void;
}

function ProjectRow({ project, onEdit, onOpen, onRemove }: ProjectRowProps) {
  const { data: subProjects } = useSubProjects(project.id);
  const subCount = subProjects?.length ?? 0;

  return (
    <button
      className={cn(
        'border-border flex w-full items-center justify-between rounded-lg border p-4',
        'hover:bg-accent text-left transition-colors',
      )}
      onClick={() => onOpen(project.id)}
    >
      <div className="flex items-center gap-3">
        <FolderOpen className="text-muted-foreground h-5 w-5" />
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium">{project.name}</p>
            {project.repoStructure ? (
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-xs font-medium',
                  repoStructureBadgeClass(project.repoStructure),
                )}
              >
                {repoStructureLabel(project.repoStructure)}
              </span>
            ) : null}
            {subCount > 0 ? (
              <span className="text-muted-foreground flex items-center gap-1 text-xs">
                <Layers className="h-3 w-3" />
                {String(subCount)} sub-project{subCount === 1 ? '' : 's'}
              </span>
            ) : null}
          </div>
          <p className="text-muted-foreground text-xs">{project.path}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-muted-foreground text-xs">
          {formatRelativeTime(project.updatedAt)}
        </span>
        <span
          aria-label={`Edit ${project.name}`}
          className="text-muted-foreground hover:bg-accent hover:text-foreground rounded p-1"
          role="button"
          tabIndex={0}
          onClick={(e) => onEdit(e, project)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') onEdit(e, project);
          }}
        >
          <Pencil className="h-4 w-4" />
        </span>
        <span
          aria-label={`Remove ${project.name}`}
          className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded p-1"
          role="button"
          tabIndex={0}
          onClick={(e) => onRemove(e, project.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') onRemove(e, project.id);
          }}
        >
          <Trash2 className="h-4 w-4" />
        </span>
      </div>
    </button>
  );
}

export function ProjectListPage() {
  const navigate = useNavigate();
  const { data: projects, isLoading } = useProjects();
  const removeProject = useRemoveProject();
  const { addProjectTab } = useLayoutStore();
  const { addToast } = useToastStore();
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [createWizardOpen, setCreateWizardOpen] = useState(false);

  function handleOpenProject(projectId: string) {
    addProjectTab(projectId);
    void navigate({ to: projectViewPath(projectId, PROJECT_VIEWS.TASKS) });
  }

  function handleWizardSetupStarted(projectId: string) {
    setWizardOpen(false);
    addProjectTab(projectId);
    addToast('Project created — setup running in background', 'success');
    void navigate({ to: projectViewPath(projectId, PROJECT_VIEWS.TASKS) });
  }

  function handleProjectCreated(projectId: string) {
    setCreateWizardOpen(false);
    addProjectTab(projectId);
    addToast('Project created — setup running in background', 'success');
    void navigate({ to: projectViewPath(projectId, PROJECT_VIEWS.TASKS) });
  }

  function handleEditProject(e: React.MouseEvent | React.KeyboardEvent, project: Project) {
    e.stopPropagation();
    setEditingProject(project);
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
            type="button"
            className={cn(
              'border-border text-foreground flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium',
              'hover:bg-accent transition-colors',
            )}
            onClick={() => setCreateWizardOpen(true)}
          >
            <Sparkles className="h-4 w-4" />
            New Project
          </button>
        </div>
      </div>

      {projects && projects.length > 0 ? (
        <div className="space-y-2">
          {projects.map((project) => (
            <ProjectRow
              key={project.id}
              project={project}
              onEdit={handleEditProject}
              onOpen={handleOpenProject}
              onRemove={handleRemoveProject}
            />
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
          onSetupStarted={handleWizardSetupStarted}
        />
      ) : null}

      <CreateProjectWizard
        open={createWizardOpen}
        onClose={() => setCreateWizardOpen(false)}
        onProjectCreated={handleProjectCreated}
      />

      <ProjectEditDialog
        project={editingProject}
        onClose={() => setEditingProject(null)}
      />
    </div>
  );
}
