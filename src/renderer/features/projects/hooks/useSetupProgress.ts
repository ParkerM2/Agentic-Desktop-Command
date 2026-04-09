/**
 * useSetupProgress — Listens to project setup pipeline progress events.
 *
 * Subscribes to `event:project.setupProgress` IPC events and returns
 * the current state of the setup pipeline for a given project.
 */

import { useCallback, useState } from 'react';

import { PROJECTS_EVENTS } from '@shared/ipc/projects/channels';
import type { CodebaseAnalysis, SetupStep } from '@shared/types/project-setup';

import { useIpcEvent } from '@renderer/shared/hooks';

interface SetupProgressState {
  steps: SetupStep[];
  currentStep: string | null;
  analysis: CodebaseAnalysis | null;
  isComplete: boolean;
  hasErrors: boolean;
}

export function useSetupProgress(projectId: string): SetupProgressState {
  const [steps, setSteps] = useState<SetupStep[]>([]);
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<CodebaseAnalysis | null>(null);

  const handleProgress = useCallback(
    (payload: {
      projectId: string;
      currentStep: string;
      steps: SetupStep[];
      analysis?: CodebaseAnalysis;
    }) => {
      if (payload.projectId !== projectId) {
        return;
      }
      setSteps(payload.steps);
      setCurrentStep(payload.currentStep);
      if (payload.analysis) {
        setAnalysis(payload.analysis);
      }
    },
    [projectId],
  );

  useIpcEvent(PROJECTS_EVENTS.SETUP.PROGRESS, handleProgress);

  const isComplete =
    steps.length > 0 &&
    steps.every((s) => s.status === 'done' || s.status === 'error' || s.status === 'skipped');

  const hasErrors = steps.some((s) => s.status === 'error');

  return { steps, currentStep, analysis, isComplete, hasErrors };
}
