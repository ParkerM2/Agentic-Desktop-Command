/**
 * LinkJiraDialog — Associate a Jira ticket with a progress task.
 *
 * Fields: jiraTicket (text) + jiraUrl (URL, validated on submit).
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

interface LinkJiraDialogProps {
  task: ProgressTask;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ── Helpers ──────────────────────────────────────────────────

function isValidUrl(value: string): boolean {
  if (value.trim().length === 0) return true; // optional
  try {
    new URL(value.trim());
    return true;
  } catch {
    return false;
  }
}

// ── Component ────────────────────────────────────────────────

export function LinkJiraDialog({ task, open, onOpenChange }: LinkJiraDialogProps) {
  const updateTask = useUpdateProgressTask();

  const [jiraTicket, setJiraTicket] = useState(task.jiraTicket ?? '');
  const [jiraUrl, setJiraUrl] = useState(task.jiraUrl ?? '');
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setJiraTicket(task.jiraTicket ?? '');
      setJiraUrl(task.jiraUrl ?? '');
      setError(null);
    }
    onOpenChange(nextOpen);
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
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
  }

  const isSubmitting = updateTask.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Link Jira Ticket</DialogTitle>
          <DialogDescription>
            Associate a Jira ticket with this task. The ticket ID will appear as a badge.
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-4" id="link-jira-form" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="jira-ticket-id">Ticket ID</Label>
            <Input
              id="jira-ticket-id"
              placeholder="ABC-123"
              value={jiraTicket}
              onChange={(e) => setJiraTicket(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="jira-ticket-url">Jira URL (optional)</Label>
            <Input
              id="jira-ticket-url"
              placeholder="https://jira.example.com/browse/ABC-123"
              type="url"
              value={jiraUrl}
              onChange={(e) => setJiraUrl(e.target.value)}
            />
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
            disabled={isSubmitting || jiraTicket.trim().length === 0}
            form="link-jira-form"
            type="submit"
          >
            {isSubmitting ? <Spinner className="mr-2" size="sm" /> : null}
            Link Ticket
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
