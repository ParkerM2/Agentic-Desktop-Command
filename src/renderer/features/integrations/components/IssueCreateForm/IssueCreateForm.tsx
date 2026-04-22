/**
 * IssueCreateForm -- Dialog for creating a new GitHub issue
 */

import { AlertTriangle, CircleDot, Loader2 } from 'lucide-react';

import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  InlineAlert,
  Input,
  Label,
  Textarea,
} from '@ui';

import { useIssueCreateForm } from './useIssueCreateForm';

export function IssueCreateForm() {
  const {
    issueCreateDialogOpen,
    setIssueCreateDialogOpen,
    owner,
    repo,
    createIssue,
    title,
    setTitle,
    body,
    setBody,
    labelsInput,
    setLabelsInput,
    error,
    isFormValid,
    handleClose,
    handleSubmit,
  } = useIssueCreateForm();

  return (
    <Dialog open={issueCreateDialogOpen} onOpenChange={setIssueCreateDialogOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <CircleDot className="text-primary h-5 w-5" />
            New Issue
            <span className="text-muted-foreground text-xs font-normal">
              {owner}/{repo}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Title field */}
          <div className="space-y-1.5">
            <Label htmlFor="create-issue-title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              aria-required="true"
              id="create-issue-title"
              placeholder="Issue title..."
              type="text"
              value={title}
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
            <Label htmlFor="create-issue-body">Body</Label>
            <Textarea
              id="create-issue-body"
              placeholder="Describe the issue..."
              resize="none"
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>

          {/* Labels field */}
          <div className="space-y-1.5">
            <Label htmlFor="create-issue-labels">Labels</Label>
            <Input
              id="create-issue-labels"
              placeholder="bug, enhancement, help wanted (comma-separated)"
              type="text"
              value={labelsInput}
              onChange={(e) => setLabelsInput(e.target.value)}
            />
          </div>

          {/* Error message */}
          {error === null ? null : (
            <InlineAlert icon={AlertTriangle} variant="error">
              {error}
            </InlineAlert>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            disabled={!isFormValid || createIssue.isPending}
            type="button"
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
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
