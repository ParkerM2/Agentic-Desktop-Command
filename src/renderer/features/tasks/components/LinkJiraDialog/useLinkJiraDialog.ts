/**
 * useLinkJiraDialog — logic for LinkJiraDialog
 */

import { useCallback, useState } from 'react';

import type { ProgressTask } from '@shared/types/progress';

import { useUpdateProgressTask } from '../../api/useProgressMutations';

function isValidUrl(value: string): boolean {
  if (value.trim().length === 0) return true;
  try {
    new URL(value.trim());
    return true;
  } catch {
    return false;
  }
}

interface UseLinkJiraDialogParams {
  task: ProgressTask;
  onOpenChange: (open: boolean) => void;
}

export function useLinkJiraDialog({ task, onOpenChange }: UseLinkJiraDialogParams) {
  const updateTask = useUpdateProgressTask();

  const [jiraTicket, setJiraTicket] = useState(task.jiraTicket ?? '');
  const [jiraUrl, setJiraUrl] = useState(task.jiraUrl ?? '');
  const [error, setError] = useState<string | null>(null);

  const isSubmitting = updateTask.isPending;

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        setJiraTicket(task.jiraTicket ?? '');
        setJiraUrl(task.jiraUrl ?? '');
        setError(null);
      }
      onOpenChange(nextOpen);
    },
    [task.jiraTicket, task.jiraUrl, onOpenChange],
  );

  const handleSubmit = useCallback(
    async (e: React.SyntheticEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (jiraTicket.trim().length === 0) {
        setError('Ticket ID is required.');
        return;
      }

      if (!isValidUrl(jiraUrl)) {
        setError('Jira URL must be a valid URL (e.g. https://jira.example.com/browse/ABC-123).');
        return;
      }

      setError(null);

      try {
        await updateTask.mutateAsync({
          slug: task.slug,
          updates: {
            jiraTicket: jiraTicket.trim(),
            jiraUrl: jiraUrl.trim() || undefined,
          },
        });
        handleOpenChange(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to link Jira ticket.');
      }
    },
    [jiraTicket, jiraUrl, task.slug, updateTask, handleOpenChange],
  );

  return {
    jiraTicket,
    setJiraTicket,
    jiraUrl,
    setJiraUrl,
    error,
    isSubmitting,
    handleOpenChange,
    handleSubmit,
  };
}
