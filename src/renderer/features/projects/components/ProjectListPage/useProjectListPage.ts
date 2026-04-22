import { useMemo, useState } from 'react';

import { useNavigate } from '@tanstack/react-router';

import { PROJECT_VIEWS, projectViewPath } from '@shared/constants';
import type { Project } from '@shared/types';

import { useLayoutStore, useToastStore } from '@renderer/shared/stores';

import { useAllTasks } from '@features/tasks';

import { useProjects, useRemoveProject } from '../../api/useProjects';

export function useProjectListPage() {
  const navigate = useNavigate();
  const { data: projects, isLoading } = useProjects();
  const { data: allTasks } = useAllTasks();
  const removeProject = useRemoveProject();
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

  return {
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
  };
}
