import { useEffect, useState } from 'react';

import { useMutation } from '@tanstack/react-query';

import { PROJECTS } from '@shared/ipc/projects/channels';
import type { CreateProjectInput } from '@shared/types/project-setup';

import { ipc } from '@renderer/shared/lib/ipc';

const STEP_LABELS = ['Details', 'Tech Stack', 'GitHub', 'Review'] as const;
const TOTAL_STEPS = STEP_LABELS.length;

interface WizardState {
  name: string;
  description: string;
  path: string;
  techStack: string[];
  createGitHubRepo: boolean;
  githubVisibility: 'public' | 'private';
}

function canProceed(step: number, state: WizardState): boolean {
  if (step === 0) {
    return state.name.trim().length > 0 && state.path.length > 0;
  }
  return true;
}

interface UseCreateProjectWizardProps {
  open: boolean;
  onClose: () => void;
  onProjectCreated?: (projectId: string) => void;
}

export function useCreateProjectWizard({ open, onClose, onProjectCreated }: UseCreateProjectWizardProps) {
  const [step, setStep] = useState(0);
  const [state, setState] = useState<WizardState>({
    name: '',
    description: '',
    path: '',
    techStack: [],
    createGitHubRepo: true,
    githubVisibility: 'private',
  });

  const selectDirectory = useMutation({
    mutationFn: () => ipc(PROJECTS.SELECT.DIRECTORY, {}),
  });

  const createProject = useMutation({
    mutationFn: (input: CreateProjectInput) => ipc(PROJECTS.CREATE.NEW, input),
  });

  const isLastStep = step === TOTAL_STEPS - 1;
  const isFirstStep = step === 0;

  function handleNext() {
    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1);
    }
  }

  function handleBack() {
    if (step > 0) {
      setStep(step - 1);
    }
  }

  async function handleSelectFolder() {
    const result = await selectDirectory.mutateAsync();
    if (result.path) {
      const folderName = result.path.split(/[\\/]/).pop() ?? '';
      setState((prev) => ({
        ...prev,
        path: result.path ?? '',
        name: prev.name.length === 0 ? folderName : prev.name,
      }));
    }
  }

  async function handleCreate() {
    const input: CreateProjectInput = {
      name: state.name.trim(),
      description: state.description.trim() || undefined,
      path: state.path,
      techStack: state.techStack.length > 0 ? state.techStack : undefined,
      createGitHubRepo: state.createGitHubRepo,
      githubVisibility: state.githubVisibility,
    };

    const project = await createProject.mutateAsync(input);
    onProjectCreated?.(project.id);
  }

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  return {
    step,
    state,
    setState,
    selectDirectory,
    createProject,
    isLastStep,
    isFirstStep,
    handleNext,
    handleBack,
    handleSelectFolder,
    handleCreate,
    canProceed,
    STEP_LABELS,
    TOTAL_STEPS,
  };
}
