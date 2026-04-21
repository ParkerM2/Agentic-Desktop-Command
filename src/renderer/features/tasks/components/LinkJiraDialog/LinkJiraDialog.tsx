/**
 * LinkJiraDialog — Associate a Jira ticket with a progress task.
 *
 * Fields: jiraTicket (text) + jiraUrl (URL, validated on submit).
 * Calls useUpdateProgressTask() on submit.
 */

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

import { useLinkJiraDialog } from './useLinkJiraDialog';

// ── Props ────────────────────────────────────────────────────

interface LinkJiraDialogProps {
  task: ProgressTask;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ── Component ────────────────────────────────────────────────

export function LinkJiraDialog({ task, open, onOpenChange }: LinkJiraDialogProps) {
  const {
    jiraTicket,
    setJiraTicket,
    jiraUrl,
    setJiraUrl,
    error,
    isSubmitting,
    handleOpenChange,
    handleSubmit,
  } = useLinkJiraDialog({ task, onOpenChange });

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
