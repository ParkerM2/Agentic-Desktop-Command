/**
 * CommitPanel — Staged files list, commit message, commit/push/PR actions.
 */

import { useState } from 'react';

import { AlertTriangle, GitCommit, Upload } from 'lucide-react';

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Label,
  Spinner,
  Text,
  Textarea,
} from '@ui';

import { useGitCommit, useGitPush, useGitStatus } from '../api/useGit';

import { CreatePrDialog } from './CreatePrDialog';

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

  const [commitMessage, setCommitMessage] = useState('');
  const [commitError, setCommitError] = useState<string | null>(null);
  const [pushError, setPushError] = useState<string | null>(null);

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
          <CreatePrDialog
            headBranch={headBranch}
            renderError={renderError}
            repoPath={repoPath}
          />
        </div>
      </CardContent>
    </Card>
  );
}
