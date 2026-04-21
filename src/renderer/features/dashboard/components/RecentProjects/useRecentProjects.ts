import { useState } from 'react';

import { useNavigate } from '@tanstack/react-router';

import { PROJECT_VIEWS, projectViewPath } from '@shared/constants';

import { useLayoutStore, useToastStore } from '@renderer/shared/stores';

import { useProjects } from '@features/projects';

export function useRecentProjects() {
  const navigate = useNavigate();
  const { data: projects, isLoading } = useProjects();
  const { addProjectTab } = useLayoutStore();
  const { addToast } = useToastStore();

  const [wizardOpen, setWizardOpen] = useState(false);
  const [createWizardOpen, setCreateWizardOpen] = useState(false);

  function handleOpenProject(projectId: string): void {
    addProjectTab(projectId);
    void navigate({ to: projectViewPath(projectId, PROJECT_VIEWS.TASKS) });
  }

  function handleWizardSetupStarted(projectId: string): void {
    setWizardOpen(false);
    addProjectTab(projectId);
    addToast('Project created — setup running in background', 'success');
    void navigate({ to: projectViewPath(projectId, PROJECT_VIEWS.TASKS) });
  }

  function handleProjectCreated(projectId: string): void {
    setCreateWizardOpen(false);
    addProjectTab(projectId);
    addToast('Project created — setup running in background', 'success');
    void navigate({ to: projectViewPath(projectId, PROJECT_VIEWS.TASKS) });
  }

  return {
    projects: projects ?? [],
    isLoading,
    wizardOpen,
    setWizardOpen,
    createWizardOpen,
    setCreateWizardOpen,
    handleOpenProject,
    handleWizardSetupStarted,
    handleProjectCreated,
  };
}
