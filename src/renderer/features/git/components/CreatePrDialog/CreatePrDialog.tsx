/**
 * CreatePrDialog — Dialog for creating a GitHub pull request.
 * Extracted from CommitPanel for size compliance.
 */

import { GitPullRequest } from 'lucide-react';

import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  Spinner,
  Textarea,
} from '@ui';

import { useCreatePrDialog } from './useCreatePrDialog';

interface CreatePrDialogProps {
  repoPath: string;
  headBranch: string;
  renderError: (message: string) => React.ReactNode;
}

export function CreatePrDialog({ repoPath, headBranch, renderError }: CreatePrDialogProps) {
  const {
    prTitle,
    setPrTitle,
    prBody,
    setPrBody,
    prBaseBranch,
    setPrBaseBranch,
    prError,
    open,
    isPending,
    handleOpenChange,
    handleCreatePr,
  } = useCreatePrDialog();

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <GitPullRequest className="h-4 w-4" />
          Create PR
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Pull Request</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="pr-title">Title</Label>
            <Input
              aria-required="true"
              id="pr-title"
              placeholder="Pull request title..."
              type="text"
              value={prTitle}
              onChange={(e) => { setPrTitle(e.target.value); }}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pr-body">Description</Label>
            <Textarea
              className="min-h-[80px]"
              id="pr-body"
              placeholder="Describe the changes..."
              resize="none"
              value={prBody}
              onChange={(e) => { setPrBody(e.target.value); }}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pr-base-branch">Base Branch</Label>
            <Input
              id="pr-base-branch"
              placeholder="main"
              type="text"
              value={prBaseBranch}
              onChange={(e) => { setPrBaseBranch(e.target.value); }}
            />
          </div>

          {prError === null ? null : renderError(prError)}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => { handleOpenChange(false); }}>
            Cancel
          </Button>
          <Button
            disabled={prTitle.trim().length === 0 || isPending}
            onClick={() => { handleCreatePr(repoPath, headBranch); }}
          >
            {isPending ? (
              <>
                <Spinner size="sm" />
                Creating...
              </>
            ) : (
              <>
                <GitPullRequest className="h-4 w-4" />
                Create PR
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
