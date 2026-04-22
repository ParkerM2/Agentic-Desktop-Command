/**
 * CreateProjectWizard — Multi-step wizard for creating a new project from scratch
 *
 * Steps:
 * 0. Project details (name, description, folder)
 * 1. Tech stack selection
 * 2. GitHub repository settings
 * 3. Review and create
 */

import { Check, ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react';

import { cn } from '@renderer/shared/lib/utils';

import { Button, Heading } from '@ui';

import { StepDetails, StepGitHub, StepReview, StepTechStack } from '../create-wizard-steps';

import { useCreateProjectWizard } from './useCreateProjectWizard';

interface CreateProjectWizardProps {
  open: boolean;
  onClose: () => void;
  onProjectCreated?: (projectId: string) => void;
}

function getStepIndicatorClass(currentStep: number, stepIndex: number): string {
  if (currentStep === stepIndex) return 'bg-primary text-primary-foreground';
  if (currentStep > stepIndex) return 'bg-success text-success-foreground';
  return 'bg-muted text-muted-foreground';
}

export function CreateProjectWizard({
  open,
  onClose,
  onProjectCreated,
}: CreateProjectWizardProps) {
  const {
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
  } = useCreateProjectWizard({ open, onClose, onProjectCreated });

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
          <Heading as="h2" className="text-lg">Create New Project</Heading>
          <Button
            aria-label="Close"
            className="text-muted-foreground hover:text-foreground rounded-md p-1 transition-colors"
            size="icon"
            type="button"
            variant="ghost"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
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
          <Button
            disabled={isFirstStep}
            type="button"
            variant="ghost"
            className={cn(
              'text-muted-foreground flex items-center gap-1 text-sm transition-colors',
              'hover:text-foreground disabled:invisible',
            )}
            onClick={handleBack}
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>

          {isLastStep ? (
            <Button
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
            </Button>
          ) : (
            <Button
              disabled={!canProceed(step, state)}
              type="button"
              variant="ghost"
              className={cn(
                'text-primary flex items-center gap-1 text-sm font-medium transition-colors',
                'hover:text-primary/80 disabled:opacity-50',
              )}
              onClick={handleNext}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
