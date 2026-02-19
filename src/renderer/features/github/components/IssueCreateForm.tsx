/**
 * IssueCreateForm -- Dialog for creating a new GitHub issue
 */

import { useCallback, useEffect, useState } from 'react';

import { AlertTriangle, CircleDot, Loader2, X } from 'lucide-react';

import { cn } from '@renderer/shared/lib/utils';

import { useCreateIssue } from '../api/useGitHub';
import { useGitHubStore } from '../store';

// ── Component ────────────────────────────────────────────────

export function IssueCreateForm() {
  const { issueCreateDialogOpen, owner, repo, setIssueCreateDialogOpen } = useGitHubStore();
  const createIssue = useCreateIssue();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [labelsInput, setLabelsInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setTitle('');
    setBody('');
    setLabelsInput('');
    setError(null);
  }, []);

  useEffect(() => {
    resetForm();
  }, [issueCreateDialogOpen, resetForm]);

  function handleClose() {
    setIssueCreateDialogOpen(false);
  }

  function handleSubmit() {
    if (title.trim().length === 0) {
      setError('Title is required');
      return;
    }

    if (owner.length === 0 || repo.length === 0) {
      setError('Repository owner and name must be configured');
      return;
    }

    setError(null);

    const labels = labelsInput
      .split(',')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    createIssue.mutate(
      {
        title: title.trim(),
        body: body.trim().length > 0 ? body.trim() : undefined,
        labels: labels.length > 0 ? labels : undefined,
      },
      {
        onSuccess: () => {
          handleClose();
        },
        onError: (err) => {
          setError(err instanceof Error ? err.message : 'Failed to create issue');
        },
      },
    );
  }

  if (!issueCreateDialogOpen) {
    return null;
  }

  const isFormValid = title.trim().length > 0 && owner.length > 0 && repo.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        aria-label="Close dialog"
        className="absolute inset-0 bg-black/50"
        role="button"
        tabIndex={0}
        onClick={handleClose}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') handleClose();
        }}
      />

      {/* Modal */}
      <div
        aria-labelledby="create-issue-dialog-title"
        className="bg-card border-border relative z-10 w-full max-w-lg rounded-lg border shadow-xl"
        role="dialog"
      >
        {/* Header */}
        <div className="border-border flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-3">
            <CircleDot className="text-primary h-5 w-5" />
            <h2 className="text-foreground text-lg font-semibold" id="create-issue-dialog-title">
              New Issue
            </h2>
            <span className="text-muted-foreground text-xs">
              {owner}/{repo}
            </span>
          </div>
          <button
            aria-label="Close dialog"
            className="text-muted-foreground hover:text-foreground transition-colors"
            type="button"
            onClick={handleClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 px-6 py-4">
          {/* Title field */}
          <div className="space-y-1.5">
            <label className="text-foreground text-sm font-medium" htmlFor="create-issue-title">
              Title <span className="text-destructive">*</span>
            </label>
            <input
              aria-required="true"
              id="create-issue-title"
              placeholder="Issue title..."
              type="text"
              value={title}
              className={cn(
                'bg-card border-border text-foreground placeholder:text-muted-foreground',
                'h-9 w-full rounded-md border px-3 text-sm',
                'focus:border-primary focus:ring-ring focus:ring-1 focus:outline-none',
              )}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && isFormValid && !createIssue.isPending) {
                  handleSubmit();
                }
              }}
            />
          </div>

          {/* Body field */}
          <div className="space-y-1.5">
            <label className="text-foreground text-sm font-medium" htmlFor="create-issue-body">
              Body
            </label>
            <textarea
              id="create-issue-body"
              placeholder="Describe the issue..."
              rows={4}
              value={body}
              className={cn(
                'bg-card border-border text-foreground placeholder:text-muted-foreground',
                'w-full resize-none rounded-md border px-3 py-2 text-sm',
                'focus:border-primary focus:ring-ring focus:ring-1 focus:outline-none',
              )}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>

          {/* Labels field */}
          <div className="space-y-1.5">
            <label className="text-foreground text-sm font-medium" htmlFor="create-issue-labels">
              Labels
            </label>
            <input
              id="create-issue-labels"
              placeholder="bug, enhancement, help wanted (comma-separated)"
              type="text"
              value={labelsInput}
              className={cn(
                'bg-card border-border text-foreground placeholder:text-muted-foreground',
                'h-9 w-full rounded-md border px-3 text-sm',
                'focus:border-primary focus:ring-ring focus:ring-1 focus:outline-none',
              )}
              onChange={(e) => setLabelsInput(e.target.value)}
            />
          </div>

          {/* Error message */}
          {error === null ? null : (
            <div className="rounded-md bg-red-500/10 p-3">
              <div className="flex items-center gap-2 text-sm text-red-400">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-border flex items-center justify-end gap-2 border-t px-6 py-4">
          <button
            type="button"
            className={cn(
              'text-muted-foreground hover:text-foreground rounded-md px-4 py-2 text-sm',
              'transition-colors',
            )}
            onClick={handleClose}
          >
            Cancel
          </button>
          <button
            disabled={!isFormValid || createIssue.isPending}
            type="button"
            className={cn(
              'bg-primary text-primary-foreground flex items-center gap-2 rounded-md px-4 py-2',
              'text-sm font-medium transition-opacity hover:opacity-90',
              'disabled:pointer-events-none disabled:opacity-50',
            )}
            onClick={handleSubmit}
          >
            {createIssue.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <CircleDot className="h-4 w-4" />
                Create Issue
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
