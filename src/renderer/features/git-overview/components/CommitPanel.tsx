/**
 * CommitPanel — Staged files list, commit message, commit/push/PR actions.
 */

import { useState } from 'react';

import { AlertTriangle, GitCommit, GitPullRequest, Upload } from 'lucide-react';

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  Spinner,
  Text,
  Textarea,
} from '@ui';

import { useGitCommit, useGitPush, useGitStatus, useCreatePr } from '../api/useGit';

export interface CommitPanelProps {
  repoPath: string;
  projectId: string;
}

function renderError(message: string) {
  return (
    <div className="rounded-md bg-red-500/10 p-3">
      <div className="flex items-center gap-2 text-sm text-red-400">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        {message}
      </div>
    </div>
  );
}

export function CommitPanel({ repoPath }: CommitPanelProps) {
  // Hooks
  const { data: status } = useGitStatus(repoPath);
  const gitCommit = useGitCommit();
  const gitPush = useGitPush();
  const createPr = useCreatePr();

  const [commitMessage, setCommitMessage] = useState('');
  const [commitError, setCommitError] = useState<string | null>(null);
  const [pushError, setPushError] = useState<string | null>(null);

  // PR dialog state
  const [prTitle, setPrTitle] = useState('');
  const [prBody, setPrBody] = useState('');
  const [prBaseBranch, setPrBaseBranch] = useState('main');
  const [prError, setPrError] = useState<string | null>(null);
  const [prDialogOpen, setPrDialogOpen] = useState(false);

  // Derived state
  const staged = status?.staged ?? [];
  const hasStagedFiles = staged.length > 0;
  const hasCommitMessage = commitMessage.trim().length > 0;
  const canCommit = hasStagedFiles && hasCommitMessage;
  const headBranch = status?.branch ?? '';

  // Event handlers
  function handleCommit() {
    if (!canCommit) return;
    setCommitError(null);
    gitCommit.mutate(
      { projectPath: repoPath, message: commitMessage.trim(), files: staged },
      {
        onSuccess: () => {
          setCommitMessage('');
          setCommitError(null);
        },
        onError: (err) => {
          setCommitError(err instanceof Error ? err.message : 'Commit failed');
        },
      },
    );
  }

  function handlePush() {
    setPushError(null);
    gitPush.mutate(
      { projectPath: repoPath },
      {
        onError: (err) => {
          setPushError(err instanceof Error ? err.message : 'Push failed');
        },
      },
    );
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
          setPrDialogOpen(false);
          setPrTitle('');
          setPrBody('');
          setPrBaseBranch('main');
          setPrError(null);
        },
        onError: (err) => {
          setPrError(err instanceof Error ? err.message : 'Failed to create PR');
        },
      },
    );
  }

  function handlePrDialogOpenChange(open: boolean) {
    setPrDialogOpen(open);
    if (!open) {
      setPrTitle('');
      setPrBody('');
      setPrBaseBranch('main');
      setPrError(null);
    }
  }

  // Render
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Commit &amp; Push</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Staged files */}
        <div className="space-y-1.5">
          <Label>Staged Files</Label>
          {hasStagedFiles ? (
            <div className="border-border rounded-md border p-2 space-y-1">
              {staged.map((file) => (
                <Text
                  key={file}
                  className="text-xs font-mono text-foreground truncate block"
                >
                  {file}
                </Text>
              ))}
            </div>
          ) : (
            <div className="border-border rounded-md border p-2">
              <Text className="text-muted-foreground text-xs">No staged files.</Text>
            </div>
          )}
        </div>

        {/* Commit message */}
        <div className="space-y-1.5">
          <Label htmlFor="commit-message">Commit Message</Label>
          <Textarea
            className="min-h-[80px]"
            id="commit-message"
            placeholder="Describe your changes..."
            resize="none"
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
          />
        </div>

        {/* Commit error */}
        {commitError === null ? null : renderError(commitError)}

        {/* Push error */}
        {pushError === null ? null : renderError(pushError)}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          {/* Commit */}
          <Button
            disabled={!canCommit || gitCommit.isPending}
            size="sm"
            variant="primary"
            onClick={handleCommit}
          >
            {gitCommit.isPending ? (
              <>
                <Spinner size="sm" />
                Committing...
              </>
            ) : (
              <>
                <GitCommit className="h-4 w-4" />
                Commit
              </>
            )}
          </Button>

          {/* Push */}
          <Button
            disabled={gitPush.isPending}
            size="sm"
            variant="secondary"
            onClick={handlePush}
          >
            {gitPush.isPending ? (
              <>
                <Spinner size="sm" />
                Pushing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Push
              </>
            )}
          </Button>

          {/* Create PR */}
          <Dialog open={prDialogOpen} onOpenChange={handlePrDialogOpenChange}>
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
                {/* PR title */}
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

                {/* PR body */}
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

                {/* Base branch */}
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

                {/* PR error */}
                {prError === null ? null : renderError(prError)}
              </div>

              <DialogFooter>
                <Button
                  variant="ghost"
                  onClick={() => handlePrDialogOpenChange(false)}
                >
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
        </div>
      </CardContent>
    </Card>
  );
}
