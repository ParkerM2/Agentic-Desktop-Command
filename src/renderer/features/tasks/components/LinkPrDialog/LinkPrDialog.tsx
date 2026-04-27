/**
 * LinkPrDialog — Associate a GitHub PR with a progress task.
 *
 * Input: prUrl (text). On submit, parses a GitHub pull request URL to
 * derive prNumber via regex. Sets prStatus to "open" as default.
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

import { useLinkPrDialog } from './useLinkPrDialog';

// ── Props ────────────────────────────────────────────────────

interface LinkPrDialogProps {
  task: ProgressTask;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ── Component ────────────────────────────────────────────────

export function LinkPrDialog({ task, open, onOpenChange }: LinkPrDialogProps) {
  const {
    prUrl,
    setPrUrl,
    error,
    isSubmitting,
    parsedPrNumber,
    handleOpenChange,
    handleSubmit,
  } = useLinkPrDialog({ task, onOpenChange });

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
                {parsedPrNumber === undefined
                  ? 'PR number could not be parsed from this URL'
                  : `PR #${String(parsedPrNumber)} detected`}
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
