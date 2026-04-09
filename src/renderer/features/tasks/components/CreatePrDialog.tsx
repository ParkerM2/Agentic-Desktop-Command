/**
 * CreatePrDialog — Modal dialog for creating a GitHub pull request
 * after task completion.
 */

import { useCallback, useEffect, useState } from 'react';

import { useMutation } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, ExternalLink, GitPullRequestDraft } from 'lucide-react';

import { GIT } from '@shared/ipc/git/channels';

import { ipc } from '@renderer/shared/lib/ipc';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Spinner,
  Textarea,
} from '@ui';

// ── Types ──────────────────────────────────────────────────────

interface CreatePrDialogProps {
  open: boolean;
  projectPath: string;
  taskDescription: string;
  taskName: string;
  onOpenChange: (open: boolean) => void;
}

interface PrResult {
  number: number;
  title: string;
  url: string;
}

// ── Component ──────────────────────────────────────────────────

export function CreatePrDialog({
  open,
  projectPath,
  taskDescription,
  taskName,
  onOpenChange,
}: CreatePrDialogProps) {
  // 1. Hooks
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [baseBranch, setBaseBranch] = useState('main');
  const [headBranch, setHeadBranch] = useState('');
  const [createdPr, setCreatedPr] = useState<PrResult | null>(null);

  const createPr = useMutation({
    mutationFn: (input: {
      baseBranch: string;
      body: string;
      headBranch: string;
      projectPath: string;
      title: string;
    }) => ipc(GIT.CREATE.PR, input),
    onSuccess: (data) => {
      setCreatedPr({ url: data.url, number: data.number, title: data.title });
    },
  });

  const resetForm = useCallback(() => {
    setTitle(taskName);
    setBody(taskDescription);
    setBaseBranch('main');
    setHeadBranch('');
    setCreatedPr(null);
    createPr.reset();
  }, [taskName, taskDescription, createPr]);

  // Auto-detect current branch when dialog opens
  useEffect(() => {
    if (!open) return;
    resetForm();

    if (projectPath.length === 0) return;

    // Fire-and-forget: fetch current branch to pre-fill headBranch
    void ipc(GIT.GET.STATUS, { repoPath: projectPath }).then((status) => {
      setHeadBranch(status.branch);
      return status;
    });
  }, [open, projectPath, resetForm]);

  // 2. Derived state
  const isFormValid =
    title.trim().length > 0 &&
    baseBranch.trim().length > 0 &&
    headBranch.trim().length > 0 &&
    projectPath.length > 0;
  const hasError = createPr.isError;
  const isSuccess = createdPr !== null;

  // 3. Event handlers
  function handleSubmit() {
    if (!isFormValid || createPr.isPending) return;

    createPr.mutate({
      projectPath,
      title: title.trim(),
      body: body.trim(),
      baseBranch: baseBranch.trim(),
      headBranch: headBranch.trim(),
    });
  }

  function handleClose() {
    onOpenChange(false);
  }

  function handleOpenPr() {
    if (createdPr !== null) {
      void window.open(createdPr.url, '_blank');
    }
  }

  // 4. Render helpers
  function renderSuccessState() {
    if (createdPr === null) return null;

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-md bg-emerald-500/10 p-4">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
          <div>
            <div className="text-foreground text-sm font-medium">
              Pull request created successfully
            </div>
            <div className="text-muted-foreground mt-0.5 text-xs">
              PR #{String(createdPr.number)}: {createdPr.title}
            </div>
          </div>
        </div>
        <Button className="w-full" variant="outline" onClick={handleOpenPr}>
          <ExternalLink className="mr-1.5 h-4 w-4" />
          Open PR in Browser
        </Button>
      </div>
    );
  }

  function renderFormState() {
    return (
      <div className="space-y-4">
        {/* Title field */}
        <div className="space-y-1.5">
          <Label htmlFor="create-pr-title" variant="required">
            Title
          </Label>
          <Input
            aria-required="true"
            id="create-pr-title"
            placeholder="PR title..."
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && isFormValid && !createPr.isPending) {
                handleSubmit();
              }
            }}
          />
        </div>

        {/* Body field */}
        <div className="space-y-1.5">
          <Label htmlFor="create-pr-body">Description</Label>
          <Textarea
            id="create-pr-body"
            placeholder="PR description..."
            resize="none"
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </div>

        {/* Branch fields */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="create-pr-base-branch" variant="required">
              Base Branch
            </Label>
            <Input
              aria-required="true"
              id="create-pr-base-branch"
              placeholder="main"
              type="text"
              value={baseBranch}
              onChange={(e) => setBaseBranch(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="create-pr-head-branch" variant="required">
              Head Branch
            </Label>
            <Input
              aria-required="true"
              id="create-pr-head-branch"
              placeholder="feature/..."
              type="text"
              value={headBranch}
              onChange={(e) => setHeadBranch(e.target.value)}
            />
          </div>
        </div>

        {/* Error message */}
        {hasError ? (
          <div className="rounded-md bg-red-500/10 p-3">
            <div className="flex items-center gap-2 text-sm text-red-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {createPr.error instanceof Error
                ? createPr.error.message
                : 'Failed to create pull request'}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  // 5. Render
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitPullRequestDraft className="h-5 w-5" />
            Create Pull Request
          </DialogTitle>
          <DialogDescription>
            {isSuccess
              ? 'Your pull request has been created.'
              : 'Create a GitHub pull request for this task.'}
          </DialogDescription>
        </DialogHeader>

        {isSuccess ? renderSuccessState() : renderFormState()}

        <DialogFooter>
          {isSuccess ? (
            <Button variant="primary" onClick={handleClose}>
              Done
            </Button>
          ) : (
            <>
              <Button variant="ghost" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                disabled={!isFormValid || createPr.isPending}
                variant="primary"
                onClick={handleSubmit}
              >
                {createPr.isPending ? (
                  <>
                    <Spinner size="sm" />
                    Creating...
                  </>
                ) : (
                  <>
                    <GitPullRequestDraft className="h-4 w-4" />
                    Create PR
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
