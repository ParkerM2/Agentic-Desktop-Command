/**
 * ProjectListPage — Projects dashboard with search, metrics, and rich project cards
 */

import { useMemo, useState } from 'react';

import { useNavigate } from '@tanstack/react-router';
import {
  Cloud,
  FolderOpen,
  Layers,
  Lock,
  Pencil,
  Search,
  Sparkles,
  Trash2,
  Unlock,
  Wand2,
} from 'lucide-react';

import { PROJECT_VIEWS, projectViewPath } from '@shared/constants';
import type { Project, RepoType } from '@shared/types';

import { formatRelativeTime } from '@renderer/shared/lib/utils';
import { useLayoutStore, useToastStore } from '@renderer/shared/stores';

import { Badge, Button, Card, CardContent, Input, PageHeader, PageLayout, Separator, Spinner, Text } from '@ui';

import { useAllTasks } from '@features/tasks';

import { useProjects, useRemoveProject, useSubProjects } from '../api/useProjects';
import { useClaimProject, useForceReclaimProject, useReleaseProject } from '../api/useRelay';

import { CreateProjectWizard } from './CreateProjectWizard';
import { ProjectEditDialog } from './ProjectEditDialog';
import { ProjectInitWizard } from './ProjectInitWizard';

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
  onClaim: (projectId: string) => void;
  onRelease: (projectId: string) => void;
  onForceReclaim: (projectId: string) => void;
}

function ProjectCard({
  project,
  taskCount,
  onEdit,
  onOpen,
  onRemove,
  onClaim,
  onRelease,
  onForceReclaim,
}: ProjectCardProps) {
  const { data: subProjects } = useSubProjects(project.id);
  const subCount = subProjects?.length ?? 0;

  const isRemote = project.isRemote === true;
  const isClaimedByOther = isRemote && Boolean(project.claimedBy) && project.claimedBy !== project.hubDeviceId;
  const isClaimedByMe = isRemote && Boolean(project.claimedBy) && project.claimedBy === project.hubDeviceId;
  const isUnclaimed = isRemote && !project.claimedBy;

  return (
    <Card
      className={`hover:bg-accent/50 relative cursor-pointer transition-colors ${isClaimedByOther ? 'opacity-60' : ''}`}
      role="button"
      tabIndex={0}
      onClick={() => {
        if (!isClaimedByOther) {
          onOpen(project.id);
        }
      }}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !isClaimedByOther) {
          e.preventDefault();
          onOpen(project.id);
        }
      }}
    >
      {/* Lock overlay for projects claimed by other devices */}
      {isClaimedByOther ? (
        <div className="bg-background/60 absolute inset-0 z-10 flex items-center justify-center rounded-lg">
          <div className="flex items-center gap-2">
            <Lock className="text-muted-foreground h-4 w-4" />
            <Text className="text-muted-foreground text-sm">
              Claimed by another device
            </Text>
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onForceReclaim(project.id);
              }}
            >
              Force Reclaim
            </Button>
          </div>
        </div>
      ) : null}

      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <FolderOpen className="text-muted-foreground h-5 w-5 shrink-0" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Text className="truncate font-medium">{project.name}</Text>
              {isRemote ? (
                <Badge variant="secondary">
                  <Cloud className="mr-1 h-3 w-3" />
                  Hub
                </Badge>
              ) : null}
              {isClaimedByMe ? (
                <Badge variant="default">
                  <Lock className="mr-1 h-3 w-3" />
                  Claimed
                </Badge>
              ) : null}
              {project.repoStructure ? (
                <Badge variant={repoStructureBadgeVariant(project.repoStructure)}>
                  {repoStructureLabel(project.repoStructure)}
                </Badge>
              ) : null}
              {subCount > 0 ? (
                <Text className="text-muted-foreground flex items-center gap-1 text-xs">
                  <Layers className="h-3 w-3" />
                  {String(subCount)} sub-project{subCount === 1 ? '' : 's'}
                </Text>
              ) : null}
            </div>
            <Text className="text-muted-foreground truncate text-xs">{project.path}</Text>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Relay claim/release actions for remote projects */}
          {isRemote && isUnclaimed ? (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onClaim(project.id);
              }}
            >
              <Lock className="mr-1 h-3 w-3" />
              Claim
            </Button>
          ) : null}
          {isClaimedByMe ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onRelease(project.id);
              }}
            >
              <Unlock className="mr-1 h-3 w-3" />
              Release
            </Button>
          ) : null}

          {taskCount > 0 ? (
            <Badge variant="outline">
              {String(taskCount)} task{taskCount === 1 ? '' : 's'}
            </Badge>
          ) : null}
          <Text className="text-muted-foreground text-xs whitespace-nowrap">
            {formatRelativeTime(project.updatedAt)}
          </Text>
          <Button
            aria-label={`Edit ${project.name}`}
            className="text-muted-foreground h-8 w-8"
            size="icon"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(e, project);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            aria-label={`Remove ${project.name}`}
            className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive h-8 w-8"
            size="icon"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(e, project.id);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function ProjectListPage() {
  const navigate = useNavigate();
  const { data: projects, isLoading } = useProjects();
  const { data: allTasks } = useAllTasks();
  const removeProject = useRemoveProject();
  const claimProject = useClaimProject();
  const releaseProject = useReleaseProject();
  const forceReclaimProject = useForceReclaimProject();
  const { addProjectTab } = useLayoutStore();
  const { addToast } = useToastStore();
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [createWizardOpen, setCreateWizardOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProjects = useMemo(() => {
    if (!projects) return [];
    const query = searchQuery.toLowerCase().trim();
    if (query.length === 0) return projects;
    return projects.filter(
      (p) => p.name.toLowerCase().includes(query) || p.path.toLowerCase().includes(query),
    );
  }, [projects, searchQuery]);

  const metrics = useMemo(() => {
    const tasks = allTasks ?? [];
    const totalProjects = projects?.length ?? 0;
    const activeTasks = tasks.filter((t) => ['in_progress', 'running'].includes(t.status)).length;
    const activeAgents = tasks.filter(
      (t) =>
        t.status === 'running' &&
        Boolean((t.metadata as Record<string, unknown> | undefined)?.agentName),
    ).length;
    return { totalProjects, activeTasks, activeAgents };
  }, [allTasks, projects]);

  const taskCountByProject = useMemo(() => {
    const tasks = allTasks ?? [];
    const counts = new Map<string, number>();
    for (const task of tasks) {
      const pid = task.projectId;
      if (pid) {
        counts.set(pid, (counts.get(pid) ?? 0) + 1);
      }
    }
    return counts;
  }, [allTasks]);

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

  function handleClaimProject(projectId: string) {
    claimProject.mutate(projectId, {
      onSuccess: () => addToast('Project claimed', 'success'),
    });
  }

  function handleReleaseProject(projectId: string) {
    releaseProject.mutate(projectId, {
      onSuccess: () => addToast('Project released', 'success'),
    });
  }

  function handleForceReclaimProject(projectId: string) {
    forceReclaimProject.mutate(projectId, {
      onSuccess: () => addToast('Project reclaimed', 'success'),
    });
  }

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
            onClaim={handleClaimProject}
            onEdit={handleEditProject}
            onForceReclaim={handleForceReclaimProject}
            onOpen={handleOpenProject}
            onRelease={handleReleaseProject}
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
