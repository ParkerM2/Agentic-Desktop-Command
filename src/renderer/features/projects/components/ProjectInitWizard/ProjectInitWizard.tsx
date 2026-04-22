/**
 * ProjectInitWizard — Multi-step wizard for project initialization
 *
 * Steps:
 * 1. Select folder
 * 2. Show detection results
 * 3. If multi-repo, show SubRepoSelector
 * 4. Configure project settings
 * 5. Confirm and create
 */

import { Check, ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react';

import { cn } from '@renderer/shared/lib/utils';

import { Button, Heading } from '@ui';

import {
  StepConfigure,
  StepConfirm,
  StepDetection,
  StepFolder,
  StepSubRepos,
} from '../wizard-steps';

import { useProjectInitWizard } from './useProjectInitWizard';

interface ProjectInitWizardProps {
  onClose: () => void;
  onSetupStarted: (projectId: string) => void;
}

function getStepIndicatorClass(currentStep: number, stepIndex: number): string {
  if (currentStep === stepIndex) return 'bg-primary text-primary-foreground';
  if (currentStep > stepIndex) return 'bg-success text-success-foreground';
  return 'bg-muted text-muted-foreground';
}

export function ProjectInitWizard({ onClose, onSetupStarted }: ProjectInitWizardProps) {
  const {
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
    STEP_LABELS,
  } = useProjectInitWizard({ onClose, onSetupStarted });

  return (
    <div
      aria-label="Initialize project"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
    >
      <div className="bg-card border-border mx-4 flex max-h-[90vh] w-full max-w-lg flex-col rounded-xl border shadow-xl">
        {/* Header */}
        <div className="border-border flex items-center justify-between border-b px-6 py-4">
          <Heading as="h2" className="text-lg">Initialize Project</Heading>
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
          {visibleSteps.map((stepIndex, idx) => (
            <div key={stepIndex} className="flex items-center gap-2">
              {idx > 0 ? (
                <div className="bg-border h-px w-4" />
              ) : null}
              <div
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
                  getStepIndicatorClass(step, stepIndex),
                )}
              >
                {step > stepIndex ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  String(idx + 1)
                )}
              </div>
              <span
                className={cn(
                  'text-xs',
                  step === stepIndex ? 'text-foreground font-medium' : 'text-muted-foreground',
                )}
              >
                {STEP_LABELS[stepIndex]}
              </span>
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="min-h-[280px] flex-1 overflow-y-auto px-6 py-5">
          {step === 0 ? (
            <StepFolder
              isPending={selectDirectory.isPending}
              selectedPath={selectedPath}
              onSelect={handleSelectFolder}
            />
          ) : null}

          {step === 1 ? (
            <StepDetection
              detection={detection.data}
              error={detection.error}
              isLoading={detection.isLoading}
              repoType={repoType}
              selectedPath={selectedPath}
              onTypeChange={setRepoType}
            />
          ) : null}

          {step === 2 ? (
            <StepSubRepos
              repos={detection.data?.childRepos ?? []}
              selected={selectedRepos}
              onSelectionChange={setSelectedRepos}
            />
          ) : null}

          {step === 3 ? (
            <StepConfigure
              description={description}
              hasChildRepos={hasChildRepos}
              projectName={projectName}
              repoType={repoType}
              selectedPath={selectedPath}
              selectedReposSize={selectedRepos.size}
              workspaceId={workspaceId}
              workspaces={workspaces ?? []}
              onDescriptionChange={setDescription}
              onNameChange={setProjectName}
              onWorkspaceChange={setWorkspaceId}
            />
          ) : null}

          {step === 4 ? (
            <StepConfirm
              defaultBranch={detection.data?.defaultBranch}
              description={description}
              hasChildRepos={hasChildRepos}
              projectName={projectName}
              repoType={repoType}
              selectedPath={selectedPath}
              selectedReposSize={selectedRepos.size}
              workspaceId={workspaceId}
              workspaces={workspaces ?? []}
            />
          ) : null}
        </div>

        {/* Footer */}
        <div className="border-border flex items-center justify-between border-t px-6 py-4">
          <Button
            disabled={currentVisibleIndex <= 0}
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
              type="button"
              className={cn(
                'bg-primary text-primary-foreground rounded-lg px-5 py-2 text-sm font-medium transition-colors',
                'hover:bg-primary/90 disabled:opacity-50',
              )}
              disabled={
                addProject.isPending ||
                createSubProject.isPending ||
                projectName.trim().length === 0
              }
              onClick={handleConfirm}
            >
              {addProject.isPending || createSubProject.isPending ? (
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
              disabled={step === 0 && selectedPath === null}
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
