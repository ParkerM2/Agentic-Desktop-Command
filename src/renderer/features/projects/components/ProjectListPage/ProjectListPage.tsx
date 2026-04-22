/**
 * ProjectListPage — Projects dashboard with search, metrics, and rich project cards
 */

import { FolderOpen, Layers, Pencil, Search, Sparkles, Trash2, Wand2 } from 'lucide-react';

import type { Project, RepoType } from '@shared/types';

import { formatRelativeTime } from '@renderer/shared/lib/utils';

import { Badge, Button, Card, CardContent, Input, PageHeader, PageLayout, Separator, Spinner } from '@ui';

import { useSubProjects } from '../../api/useProjects';
import { CreateProjectWizard } from '../CreateProjectWizard';
import { ProjectEditDialog } from '../ProjectEditDialog';
import { ProjectInitWizard } from '../ProjectInitWizard';

import { useProjectListPage } from './useProjectListPage';

function repoStructureBadgeVariant(structure: RepoType): 'default' | 'secondary' | 'outline' {
  if (structure === 'monorepo') return 'default';
  if (structure === 'multi-repo') return 'secondary';
  return 'outline';
}

function repoStructureLabel(structure: RepoType): string {
  if (structure === 'monorepo') return 'monorepo';
  if (structure === 'multi-repo') return 'multi-repo';
  return 'single';
}

interface ProjectCardProps {
  project: Project;
  taskCount: number;
  onEdit: (e: React.MouseEvent | React.KeyboardEvent, project: Project) => void;
  onOpen: (projectId: string) => void;
  onRemove: (e: React.MouseEvent | React.KeyboardEvent, projectId: string) => void;
}

function ProjectCard({ project, taskCount, onEdit, onOpen, onRemove }: ProjectCardProps) {
  const { data: subProjects } = useSubProjects(project.id);
  const subCount = subProjects?.length ?? 0;

  return (
    <Card
      className="hover:bg-accent/50 cursor-pointer transition-colors"
      role="button"
      tabIndex={0}
      onClick={() => onOpen(project.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(project.id);
        }
      }}
    >
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <FolderOpen className="text-muted-foreground h-5 w-5 shrink-0" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate font-medium">{project.name}</p>
              {project.repoStructure ? (
                <Badge variant={repoStructureBadgeVariant(project.repoStructure)}>
                  {repoStructureLabel(project.repoStructure)}
                </Badge>
              ) : null}
              {subCount > 0 ? (
                <span className="text-muted-foreground flex items-center gap-1 text-xs">
                  <Layers className="h-3 w-3" />
                  {String(subCount)} sub-project{subCount === 1 ? '' : 's'}
                </span>
              ) : null}
            </div>
            <p className="text-muted-foreground truncate text-xs">{project.path}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {taskCount > 0 ? (
            <Badge variant="outline">
              {String(taskCount)} task{taskCount === 1 ? '' : 's'}
            </Badge>
          ) : null}
          <span className="text-muted-foreground text-xs whitespace-nowrap">
            {formatRelativeTime(project.updatedAt)}
          </span>
          <span
            aria-label={`Edit ${project.name}`}
            className="text-muted-foreground hover:bg-accent hover:text-foreground rounded p-1"
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onEdit(e, project);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation();
                onEdit(e, project);
              }
            }}
          >
            <Pencil className="h-4 w-4" />
          </span>
          <span
            aria-label={`Remove ${project.name}`}
            className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded p-1"
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onRemove(e, project.id);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation();
                onRemove(e, project.id);
              }
            }}
          >
            <Trash2 className="h-4 w-4" />
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export function ProjectListPage() {
  const {
    projects,
    isLoading,
    filteredProjects,
    metrics,
    taskCountByProject,
    editingProject,
    wizardOpen,
    createWizardOpen,
    searchQuery,
    setEditingProject,
    setWizardOpen,
    setCreateWizardOpen,
    setSearchQuery,
    handleOpenProject,
    handleWizardSetupStarted,
    handleProjectCreated,
    handleEditProject,
    handleRemoveProject,
  } = useProjectListPage();

  if (isLoading) {
    return (
      <PageLayout>
        <div className="flex h-full items-center justify-center">
          <Spinner className="h-6 w-6" />
        </div>
      </PageLayout>
    );
  }

  const hasProjects = (projects?.length ?? 0) > 0;
  const hasFilteredResults = filteredProjects.length > 0;

  function renderProjectList() {
    if (!hasProjects) {
      return (
        <div className="border-border rounded-lg border border-dashed p-12 text-center">
          <FolderOpen className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
          <p className="text-lg font-medium">No projects yet</p>
          <p className="text-muted-foreground mt-1 text-sm">Add a project folder to get started</p>
        </div>
      );
    }

    if (!hasFilteredResults) {
      return (
        <div className="border-border rounded-lg border border-dashed p-12 text-center">
          <Search className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
          <p className="text-lg font-medium">No matching projects</p>
          <p className="text-muted-foreground mt-1 text-sm">Try a different search term</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 gap-3">
        {filteredProjects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            taskCount={taskCountByProject.get(project.id) ?? 0}
            onEdit={handleEditProject}
            onOpen={handleOpenProject}
            onRemove={handleRemoveProject}
          />
        ))}
      </div>
    );
  }

  return (
    <PageLayout>
      <PageHeader>
        <PageHeader.Row>
          <PageHeader.Title>Projects</PageHeader.Title>
        </PageHeader.Row>
      </PageHeader>

      <div className="mx-auto max-w-4xl p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div />
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setWizardOpen(true)}>
            <Wand2 className="h-4 w-4" />
            Init Wizard
          </Button>
          <Button variant="outline" onClick={() => setCreateWizardOpen(true)}>
            <Sparkles className="h-4 w-4" />
            New Project
          </Button>
        </div>
      </div>

      {/* Search */}
      {hasProjects ? (
        <div className="relative mb-4">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            className="pl-10"
            placeholder="Search projects by name or path..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      ) : null}

      {/* Metrics */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Total Projects
            </p>
            <p className="mt-1 text-2xl font-bold">{String(metrics.totalProjects)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Active Tasks
            </p>
            <p className="mt-1 text-2xl font-bold">{String(metrics.activeTasks)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Active Agents
            </p>
            <p className="mt-1 text-2xl font-bold">{String(metrics.activeAgents)}</p>
          </CardContent>
        </Card>
      </div>

      <Separator className="mb-6" />

      {/* Project list */}
      {renderProjectList()}

      {/* Wizards and dialogs */}
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

      <ProjectEditDialog project={editingProject} onClose={() => setEditingProject(null)} />
      </div>
    </PageLayout>
  );
}
