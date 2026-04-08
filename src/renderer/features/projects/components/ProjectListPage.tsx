/**
 * ProjectListPage — Projects dashboard with search, metrics, and rich project cards
 */

import { useMemo, useState } from 'react';

import { useNavigate } from '@tanstack/react-router';
import { FolderOpen, Layers, Lock, MoreVertical, Pencil, Search, Server, Sparkles, Trash2, Wand2 } from 'lucide-react';

import { PROJECT_VIEWS, projectViewPath } from '@shared/constants';
import type { Project, RepoType } from '@shared/types';

import { formatRelativeTime } from '@renderer/shared/lib/utils';
import { useLayoutStore, useToastStore } from '@renderer/shared/stores';

import { useDeviceStore } from '@features/devices';

import {
  Badge,
  Button,
  Card,
  CardContent,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  PageHeader,
  PageLayout,
  Separator,
  Spinner,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@ui';

import { useAllTasks } from '@features/tasks';

import { useClaimProject, useProjects, useReleaseProject, useRemoveProject, useSubProjects } from '../api/useProjects';

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
  currentDeviceId: string | null;
  onEdit: (e: React.MouseEvent | React.KeyboardEvent, project: Project) => void;
  onOpen: (project: Project) => void;
  onRemove: (e: React.MouseEvent | React.KeyboardEvent, projectId: string) => void;
  onRelease: (e: React.MouseEvent | React.KeyboardEvent, projectId: string) => void;
  onForceReclaim: (e: React.MouseEvent | React.KeyboardEvent, project: Project) => void;
}

function ProjectCard({
  project,
  taskCount,
  currentDeviceId,
  onEdit,
  onOpen,
  onRemove,
  onRelease,
  onForceReclaim,
}: ProjectCardProps) {
  const { data: subProjects } = useSubProjects(project.id);
  const subCount = subProjects?.length ?? 0;

  const isRemote = project.remote === true;
  const isClaimedByOther =
    isRemote &&
    project.claimedByDeviceId != null &&
    project.claimedByDeviceId !== currentDeviceId;
  const isClaimedByMe =
    isRemote &&
    project.claimedByDeviceId != null &&
    project.claimedByDeviceId === currentDeviceId;
  const isLocalHostedAndClaimedByOther =
    !isRemote &&
    project.hostDeviceId === currentDeviceId &&
    project.claimedByDeviceId != null &&
    project.claimedByDeviceId !== currentDeviceId;

  const showContextMenu = isClaimedByMe || isLocalHostedAndClaimedByOther;

  function handleCardClick() {
    onOpen(project);
  }

  function handleCardKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpen(project);
    }
  }

  function renderHubBadge() {
    if (!isRemote) return null;
    const deviceName = project.hostDeviceName ?? 'Remote';
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge className="flex items-center gap-1" size="sm" variant="info">
              <Server className="h-3 w-3 shrink-0" />
              {deviceName}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>Hosted on {deviceName}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  function renderLockOverlay() {
    if (!isClaimedByOther) return null;
    return (
      <div className="bg-background/70 absolute inset-0 flex items-center justify-center rounded-lg">
        <div className="flex items-center gap-2">
          <Lock className="text-muted-foreground h-4 w-4 shrink-0" />
          <span className="text-muted-foreground text-sm">
            In use by {project.hostDeviceName ?? 'another device'}
          </span>
        </div>
      </div>
    );
  }

  function renderContextMenu() {
    if (!showContextMenu) return null;
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label={`More actions for ${project.name}`}
            className="h-7 w-7"
            size="icon"
            variant="ghost"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {isClaimedByMe ? (
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onRelease(e, project.id);
              }}
            >
              Release
            </DropdownMenuItem>
          ) : null}
          {isLocalHostedAndClaimedByOther ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onForceReclaim(e, project);
                }}
              >
                Force Reclaim
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Card
      className="hover:bg-accent/50 relative cursor-pointer transition-colors"
      role="button"
      tabIndex={isClaimedByOther ? -1 : 0}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
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
              {renderHubBadge()}
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
          {renderContextMenu()}
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
      {renderLockOverlay()}
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
  const { addProjectTab } = useLayoutStore();
  const { addToast } = useToastStore();
  const { currentDeviceId } = useDeviceStore();
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

  function handleOpenProject(project: Project) {
    if (project.remote === true && project.hostDeviceId != null) {
      // Trigger claim flow for remote projects
      claimProject.mutate(
        { projectId: project.id, hostDeviceId: project.hostDeviceId },
        {
          onSuccess: (result) => {
            if (result.success) {
              addProjectTab(project.id);
              void navigate({ to: projectViewPath(project.id, PROJECT_VIEWS.TASKS) });
            } else {
              addToast(result.error ?? 'Could not claim project', 'error');
            }
          },
        },
      );
    } else {
      addProjectTab(project.id);
      void navigate({ to: projectViewPath(project.id, PROJECT_VIEWS.TASKS) });
    }
  }

  function handleReleaseProject(
    e: React.MouseEvent | React.KeyboardEvent,
    projectId: string,
  ) {
    e.stopPropagation();
    releaseProject.mutate(projectId, {
      onSuccess: () => {
        addToast('Project released', 'success');
      },
    });
  }

  function handleForceReclaimProject(
    e: React.MouseEvent | React.KeyboardEvent,
    project: Project,
  ) {
    e.stopPropagation();
    // Force reclaim: release then open
    releaseProject.mutate(project.id, {
      onSuccess: () => {
        addToast('Project reclaimed', 'success');
        addProjectTab(project.id);
        void navigate({ to: projectViewPath(project.id, PROJECT_VIEWS.TASKS) });
      },
    });
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
            currentDeviceId={currentDeviceId}
            project={project}
            taskCount={taskCountByProject.get(project.id) ?? 0}
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
