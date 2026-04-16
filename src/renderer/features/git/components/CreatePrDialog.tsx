/**
 * CreatePrDialog — Dialog for creating a GitHub pull request.
 * Extracted from CommitPanel for size compliance.
 */

import { useState } from 'react';

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

import { useCreatePr } from '../api/useGit';

interface CreatePrDialogProps {
  repoPath: string;
  headBranch: string;
  renderError: (message: string) => React.ReactNode;
}

export function CreatePrDialog({ repoPath, headBranch, renderError }: CreatePrDialogProps) {
  const createPr = useCreatePr();

  const [prTitle, setPrTitle] = useState('');
  const [prBody, setPrBody] = useState('');
  const [prBaseBranch, setPrBaseBranch] = useState('main');
  const [prError, setPrError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setPrTitle('');
      setPrBody('');
      setPrBaseBranch('main');
      setPrError(null);
    }
  }

  function handleCreatePr() {
    if (prTitle.trim().length === 0) return;
    setPrError(null);
    createPr.mutate(
      {
        projectPath: repoPath,
        title: prTitle.trim(),
        body: prBody.trim(),
        baseBranch: prBaseBranch.trim() || 'main',
        headBranch,
      },
      {
        onSuccess: () => {
          handleOpenChange(false);
        },
        onError: (err) => {
          setPrError(err instanceof Error ? err.message : 'Failed to create PR');
        },
      },
    );
  }

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
              onChange={(e) => setPrTitle(e.target.value)}
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
              onChange={(e) => setPrBody(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pr-base-branch">Base Branch</Label>
            <Input
              id="pr-base-branch"
              placeholder="main"
              type="text"
              value={prBaseBranch}
              onChange={(e) => setPrBaseBranch(e.target.value)}
            />
          </div>

          {prError === null ? null : renderError(prError)}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={prTitle.trim().length === 0 || createPr.isPending}
            onClick={handleCreatePr}
          >
            {createPr.isPending ? (
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
