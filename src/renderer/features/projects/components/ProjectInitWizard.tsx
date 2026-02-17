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

import { useEffect, useState } from 'react';

import { useMutation, useQuery } from '@tanstack/react-query';
import { Check, ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react';

import { ipc } from '@renderer/shared/lib/ipc';
import { cn } from '@renderer/shared/lib/utils';

import { useWorkspaces } from '@features/workspaces';

import { useAddProject, useCreateSubProject } from '../api/useProjects';

import {
  StepConfigure,
  StepConfirm,
  StepDetection,
  StepFolder,
  StepSubRepos,
} from './wizard-steps';

interface ProjectInitWizardProps {
  onClose: () => void;
  onComplete: (projectId: string) => void;
}

const STEP_LABELS = ['Select Folder', 'Detection', 'Sub-Repos', 'Configure', 'Confirm'] as const;

function getVisibleSteps(hasChildRepos: boolean): number[] {
  if (hasChildRepos) return [0, 1, 2, 3, 4];
  return [0, 1, 3, 4];
}

function getStepIndicatorClass(currentStep: number, stepIndex: number): string {
  if (currentStep === stepIndex) return 'bg-primary text-primary-foreground';
  if (currentStep > stepIndex) return 'bg-success text-success-foreground';
  return 'bg-muted text-muted-foreground';
}

// ── Main Component ───────────────────────────────────────────

export function ProjectInitWizard({ onClose, onComplete }: ProjectInitWizardProps) {
  const [step, setStep] = useState(0);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [repoType, setRepoType] = useState('single');
  const [selectedRepos, setSelectedRepos] = useState<Set<string>>(new Set());
  const [projectName, setProjectName] = useState('');
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  const addProject = useAddProject();
  const createSubProject = useCreateSubProject();
  const { data: workspaces } = useWorkspaces();

  const selectDirectory = useMutation({
    mutationFn: () => ipc('projects.selectDirectory', {}),
  });

  const detection = useQuery({
    queryKey: ['projects', 'detectRepo', selectedPath],
    queryFn: () => ipc('projects.detectRepo', { path: selectedPath ?? '' }),
    enabled: selectedPath !== null && step >= 1,
    staleTime: 300_000,
  });

  const hasChildRepos = (detection.data?.childRepos.length ?? 0) > 0;
  const visibleSteps = getVisibleSteps(hasChildRepos);
  const currentVisibleIndex = visibleSteps.indexOf(step);
  const isLastStep = currentVisibleIndex === visibleSteps.length - 1;

  // Update repo type when detection completes
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

  function handleNext() {
    const nextIndex = currentVisibleIndex + 1;
    if (nextIndex < visibleSteps.length) {
      setStep(visibleSteps[nextIndex]);
    }
  }

  function handleBack() {
    const prevIndex = currentVisibleIndex - 1;
    if (prevIndex >= 0) {
      setStep(visibleSteps[prevIndex]);
    }
  }

  async function handleConfirm() {
    if (!selectedPath) return;
    const project = await addProject.mutateAsync(selectedPath);

    // Create sub-projects from selected repos
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

    onComplete(project.id);
  }

  return (
    <div
      aria-label="Initialize project"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
    >
      <div className="bg-card border-border mx-4 flex w-full max-w-lg flex-col rounded-xl border shadow-xl">
        {/* Header */}
        <div className="border-border flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">Initialize Project</h2>
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
              hasChildRepos={hasChildRepos}
              projectName={projectName}
              repoType={repoType}
              selectedPath={selectedPath}
              selectedReposSize={selectedRepos.size}
              workspaceId={workspaceId}
              workspaces={workspaces ?? []}
              onNameChange={setProjectName}
              onWorkspaceChange={setWorkspaceId}
            />
          ) : null}

          {step === 4 ? (
            <StepConfirm
              defaultBranch={detection.data?.defaultBranch}
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
          <button
            disabled={currentVisibleIndex <= 0}
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
            </button>
          ) : (
            <button
              disabled={step === 0 && selectedPath === null}
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
