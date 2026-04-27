import { useCallback, useEffect, useState } from 'react';

import { useMutation, useQuery } from '@tanstack/react-query';

import { PROJECTS } from '@shared/ipc/projects/channels';

import { ipc } from '@renderer/shared/lib/ipc';

import { useWorkspaces } from '@features/workspace';

import { useAddProject, useCreateSubProject, useSetupExisting } from '../../api/useProjects';
import { useWizardNavigation } from '../../hooks/useWizardNavigation';

const STEP_LABELS = ['Select Folder', 'Detection', 'Sub-Repos', 'Configure', 'Confirm'] as const;
const TOTAL_STEPS = STEP_LABELS.length;

function getVisibleSteps(hasChildRepos: boolean): number[] {
  if (hasChildRepos) return [0, 1, 2, 3, 4];
  return [0, 1, 3, 4];
}

interface UseProjectInitWizardProps {
  onClose: () => void;
  onSetupStarted: (projectId: string) => void;
}

export function useProjectInitWizard({ onClose, onSetupStarted }: UseProjectInitWizardProps) {
  const { step, setStep } = useWizardNavigation(TOTAL_STEPS);

  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [repoType, setRepoType] = useState('single');
  const [selectedRepos, setSelectedRepos] = useState<Set<string>>(new Set());
  const [projectName, setProjectName] = useState('');
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [description, setDescription] = useState('');

  const addProject = useAddProject();
  const createSubProject = useCreateSubProject();
  const setupExisting = useSetupExisting();
  const { data: workspaces } = useWorkspaces();

  const selectDirectory = useMutation({
    mutationFn: () => ipc(PROJECTS.SELECT.DIRECTORY, {}),
  });

  const detection = useQuery({
    queryKey: ['projects', 'detectRepo', selectedPath],
    queryFn: () => ipc(PROJECTS.DETECT.REPO, { path: selectedPath ?? '' }),
    enabled: selectedPath !== null && step >= 1,
    staleTime: 300_000,
  });

  const hasChildRepos = (detection.data?.childRepos.length ?? 0) > 0;
  const visibleSteps = getVisibleSteps(hasChildRepos);
  const currentVisibleIndex = visibleSteps.indexOf(step);
  const isLastStep = currentVisibleIndex === visibleSteps.length - 1;

  useEffect(() => {
    if (detection.data && step === 1 && repoType === 'single') {
      setRepoType(detection.data.repoType);
    }
  }, [detection.data, step, repoType]);

  async function handleSelectFolder() {
    const result = await selectDirectory.mutateAsync();
    if (result.path) {
      setSelectedPath(result.path);
      const folderName = result.path.split(/[\\/]/).pop() ?? '';
      setProjectName(folderName);
      setStep(1);
    }
  }

  const handleNext = useCallback(() => {
    const nextIndex = currentVisibleIndex + 1;
    if (nextIndex < visibleSteps.length) {
      setStep(visibleSteps[nextIndex]);
    }
  }, [currentVisibleIndex, visibleSteps, setStep]);

  const handleBack = useCallback(() => {
    const prevIndex = currentVisibleIndex - 1;
    if (prevIndex >= 0) {
      setStep(visibleSteps[prevIndex]);
    }
  }, [currentVisibleIndex, visibleSteps, setStep]);

  async function handleConfirm() {
    if (!selectedPath) return;
    const project = await addProject.mutateAsync({
      path: selectedPath,
      name: projectName.trim() || undefined,
      workspaceId: workspaceId ?? undefined,
      description: description.trim() || undefined,
      repoStructure: repoType as 'single' | 'monorepo' | 'multi-repo',
      defaultBranch: detection.data?.defaultBranch ?? undefined,
    });

    if (selectedRepos.size > 0 && detection.data) {
      const repos = detection.data.childRepos.filter((r) => selectedRepos.has(r.path));
      await Promise.all(
        repos.map((repo) =>
          createSubProject.mutateAsync({
            projectId: project.id,
            name: repo.name,
            relativePath: repo.relativePath,
            gitUrl: repo.gitUrl,
          }),
        ),
      );
    }

    void setupExisting.mutateAsync({ projectId: project.id });

    onSetupStarted(project.id);
  }

  return {
    step,
    selectedPath,
    repoType,
    selectedRepos,
    projectName,
    workspaceId,
    description,
    detection,
    hasChildRepos,
    visibleSteps,
    currentVisibleIndex,
    isLastStep,
    addProject,
    createSubProject,
    selectDirectory,
    workspaces,
    setRepoType,
    setSelectedRepos,
    setProjectName,
    setWorkspaceId,
    setDescription,
    handleSelectFolder,
    handleNext,
    handleBack,
    handleConfirm,
    onClose,
    STEP_LABELS,
  };
}
