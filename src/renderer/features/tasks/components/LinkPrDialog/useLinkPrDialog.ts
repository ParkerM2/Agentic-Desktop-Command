/**
 * useLinkPrDialog — logic for LinkPrDialog
 */

import { useCallback, useState } from 'react';

import type { ProgressTask } from '@shared/types/progress';

import { useUpdateProgressTask } from '../../api/useProgressMutations';

const GITHUB_PR_REGEX = /github\.com\/[^/]+\/[^/]+\/pull\/(\d+)/;

export function parsePrNumber(url: string): number | undefined {
  const match = GITHUB_PR_REGEX.exec(url.trim());
  if (match?.[1] === undefined) return undefined;
  const parsed = Number.parseInt(match[1], 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

interface UseLinkPrDialogParams {
  task: ProgressTask;
  onOpenChange: (open: boolean) => void;
}

export function useLinkPrDialog({ task, onOpenChange }: UseLinkPrDialogParams) {
  const updateTask = useUpdateProgressTask();

  const [prUrl, setPrUrl] = useState(task.prUrl ?? '');
  const [error, setError] = useState<string | null>(null);

  const isSubmitting = updateTask.isPending;

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        setPrUrl(task.prUrl ?? '');
        setError(null);
      }
      onOpenChange(nextOpen);
    },
    [task.prUrl, onOpenChange],
  );

  const handleSubmit = useCallback(
    async (e: React.SyntheticEvent<HTMLFormElement>) => {
      e.preventDefault();

      const trimmedUrl = prUrl.trim();

      if (trimmedUrl.length === 0) {
        setError('PR URL is required.');
        return;
      }

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
    },
    [prUrl, task.slug, task.prStatus, updateTask, handleOpenChange],
  );

  return {
    prUrl,
    setPrUrl,
    error,
    isSubmitting,
    parsedPrNumber: prUrl.trim().length > 0 ? parsePrNumber(prUrl) : undefined,
    handleOpenChange,
    handleSubmit,
  };
}
