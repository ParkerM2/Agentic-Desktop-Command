/**
 * CreateProjectWizard — Multi-step wizard for creating a new project from scratch
 *
 * Steps:
 * 0. Project details (name, description, folder)
 * 1. Tech stack selection
 * 2. GitHub repository settings
 * 3. Review and create
 */

import { useEffect, useState } from 'react';

import { useMutation } from '@tanstack/react-query';
import { Check, ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react';

import type { CreateProjectInput } from '@shared/types/project-setup';

import { ipc } from '@renderer/shared/lib/ipc';
import { cn } from '@renderer/shared/lib/utils';

import { StepDetails, StepGitHub, StepReview, StepTechStack } from './create-wizard-steps';

interface CreateProjectWizardProps {
  open: boolean;
  onClose: () => void;
  onProjectCreated?: (projectId: string) => void;
}

interface WizardState {
  name: string;
  description: string;
  path: string;
  techStack: string[];
  createGitHubRepo: boolean;
  githubVisibility: 'public' | 'private';
}

const STEP_LABELS = ['Details', 'Tech Stack', 'GitHub', 'Review'] as const;
const TOTAL_STEPS = STEP_LABELS.length;

function getStepIndicatorClass(currentStep: number, stepIndex: number): string {
  if (currentStep === stepIndex) return 'bg-primary text-primary-foreground';
  if (currentStep > stepIndex) return 'bg-success text-success-foreground';
  return 'bg-muted text-muted-foreground';
}

function canProceed(step: number, state: WizardState): boolean {
  if (step === 0) {
    return state.name.trim().length > 0 && state.path.length > 0;
  }
  return true;
}

export function CreateProjectWizard({
  open,
  onClose,
  onProjectCreated,
}: CreateProjectWizardProps) {
  // 1. Hooks
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
    mutationFn: () => ipc('projects.selectDirectory', {}),
  });

  const createProject = useMutation({
    mutationFn: (input: CreateProjectInput) => ipc('projects.createNew', input),
  });

  // 2. Derived state
  const isLastStep = step === TOTAL_STEPS - 1;
  const isFirstStep = step === 0;

  // 3. Event handlers
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

  // Close on Escape key
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

  // 4. Render
  if (!open) return null;

  return (
    <div
      aria-label="Create new project"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
    >
      <div className="bg-card border-border mx-4 flex max-h-[90vh] w-full max-w-lg flex-col rounded-xl border shadow-xl">
        {/* Header */}
        <div className="border-border flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">Create New Project</h2>
          <button
            aria-label="Close"
            className="text-muted-foreground hover:text-foreground rounded-md p-1 transition-colors"
            type="button"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="border-border flex items-center gap-2 border-b px-6 py-3">
          {STEP_LABELS.map((label, idx) => (
            <div key={label} className="flex items-center gap-2">
              {idx > 0 ? <div className="bg-border h-px w-4" /> : null}
              <div
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
                  getStepIndicatorClass(step, idx),
                )}
              >
                {step > idx ? <Check className="h-3.5 w-3.5" /> : String(idx + 1)}
              </div>
              <span
                className={cn(
                  'text-xs',
                  step === idx ? 'text-foreground font-medium' : 'text-muted-foreground',
                )}
              >
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="min-h-[280px] flex-1 overflow-y-auto px-6 py-5">
          {step === 0 ? (
            <StepDetails
              description={state.description}
              isSelectingFolder={selectDirectory.isPending}
              name={state.name}
              path={state.path}
              onDescriptionChange={(description) => setState((prev) => ({ ...prev, description }))}
              onNameChange={(name) => setState((prev) => ({ ...prev, name }))}
              onSelectFolder={handleSelectFolder}
            />
          ) : null}

          {step === 1 ? (
            <StepTechStack
              techStack={state.techStack}
              onTechStackChange={(techStack) => setState((prev) => ({ ...prev, techStack }))}
            />
          ) : null}

          {step === 2 ? (
            <StepGitHub
              createGitHubRepo={state.createGitHubRepo}
              githubVisibility={state.githubVisibility}
              onCreateRepoChange={(createGitHubRepo) =>
                setState((prev) => ({ ...prev, createGitHubRepo }))
              }
              onVisibilityChange={(githubVisibility) =>
                setState((prev) => ({ ...prev, githubVisibility }))
              }
            />
          ) : null}

          {step === 3 ? (
            <StepReview
              createGitHubRepo={state.createGitHubRepo}
              description={state.description}
              githubVisibility={state.githubVisibility}
              name={state.name}
              path={state.path}
              techStack={state.techStack}
            />
          ) : null}
        </div>

        {/* Footer */}
        <div className="border-border flex items-center justify-between border-t px-6 py-4">
          <button
            disabled={isFirstStep}
            type="button"
            className={cn(
              'text-muted-foreground flex items-center gap-1 text-sm transition-colors',
              'hover:text-foreground disabled:invisible',
            )}
            onClick={handleBack}
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>

          {isLastStep ? (
            <button
              disabled={createProject.isPending || !canProceed(0, state)}
              type="button"
              className={cn(
                'bg-primary text-primary-foreground rounded-lg px-5 py-2 text-sm font-medium transition-colors',
                'hover:bg-primary/90 disabled:opacity-50',
              )}
              onClick={handleCreate}
            >
              {createProject.isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </span>
              ) : (
                'Create Project'
              )}
            </button>
          ) : (
            <button
              disabled={!canProceed(step, state)}
              type="button"
              className={cn(
                'text-primary flex items-center gap-1 text-sm font-medium transition-colors',
                'hover:text-primary/80 disabled:opacity-50',
              )}
              onClick={handleNext}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
