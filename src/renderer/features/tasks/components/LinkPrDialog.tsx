/**
 * LinkPrDialog — Associate a GitHub PR with a progress task.
 *
 * Input: prUrl (text). On submit, parses a GitHub pull request URL to
 * derive prNumber via regex. Sets prStatus to "open" as default.
 * Calls useUpdateProgressTask() on submit.
 */

import { useState } from 'react';

import type { ProgressTask } from '@shared/types/progress';

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
  Text,
} from '@ui';

import { useUpdateProgressTask } from '../api/useProgressMutations';

// ── Props ────────────────────────────────────────────────────

interface LinkPrDialogProps {
  task: ProgressTask;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ── Helpers ──────────────────────────────────────────────────

const GITHUB_PR_REGEX = /github\.com\/[^/]+\/[^/]+\/pull\/(\d+)/;

function parsePrNumber(url: string): number | undefined {
  const match = GITHUB_PR_REGEX.exec(url.trim());
  if (match?.[1] === undefined) return undefined;
  const parsed = Number.parseInt(match[1], 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

// ── Component ────────────────────────────────────────────────

export function LinkPrDialog({ task, open, onOpenChange }: LinkPrDialogProps) {
  const updateTask = useUpdateProgressTask();

  const [prUrl, setPrUrl] = useState(task.prUrl ?? '');
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setPrUrl(task.prUrl ?? '');
      setError(null);
    }
    onOpenChange(nextOpen);
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();

    const trimmedUrl = prUrl.trim();

    if (trimmedUrl.length === 0) {
      setError('PR URL is required.');
      return;
    }

    // Validate URL syntax
    try {
      new URL(trimmedUrl);
    } catch {
      setError('Must be a valid URL (e.g. https://github.com/owner/repo/pull/42).');
      return;
    }

    const prNumber = parsePrNumber(trimmedUrl);

    setError(null);

    try {
      await updateTask.mutateAsync({
        slug: task.slug,
        updates: {
          prUrl: trimmedUrl,
          prNumber,
          prStatus: task.prStatus ?? 'open',
        },
      });
      handleOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to link PR.');
    }
  }

  const isSubmitting = updateTask.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Link Pull Request</DialogTitle>
          <DialogDescription>
            Associate a GitHub pull request URL with this task. The PR number will be derived
            automatically from GitHub URLs.
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-4" id="link-pr-form" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pr-url">PR URL</Label>
            <Input
              id="pr-url"
              placeholder="https://github.com/owner/repo/pull/42"
              type="url"
              value={prUrl}
              onChange={(e) => setPrUrl(e.target.value)}
            />
            {prUrl.trim().length > 0 ? (
              <Text className="text-muted-foreground text-xs">
                {parsePrNumber(prUrl) === undefined
                  ? 'PR number could not be parsed from this URL'
                  : `PR #${String(parsePrNumber(prUrl))} detected`}
              </Text>
            ) : null}
          </div>

          {error === null ? null : (
            <Text className="text-destructive text-sm">{error}</Text>
          )}
        </form>

        <DialogFooter>
          <Button
            disabled={isSubmitting}
            variant="outline"
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            disabled={isSubmitting || prUrl.trim().length === 0}
            form="link-pr-form"
            type="submit"
          >
            {isSubmitting ? <Spinner className="mr-2" size="sm" /> : null}
            Link PR
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
