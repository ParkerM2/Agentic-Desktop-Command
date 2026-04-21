/**
 * CommitPanel — Staged files list, commit message, commit/push/PR actions.
 */

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

import { CreatePrDialog } from '../CreatePrDialog';

import { useCommitPanel } from './useCommitPanel';

export interface CommitPanelProps {
  repoPath: string;
  projectId: string;
}

function renderError(message: string) {
  return (
    <div className="bg-destructive/10 rounded-md p-3">
      <div className="text-destructive flex items-center gap-2 text-sm">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        {message}
      </div>
    </div>
  );
}

export function CommitPanel({ repoPath }: CommitPanelProps) {
  const {
    staged,
    hasStagedFiles,
    canCommit,
    headBranch,
    commitMessage,
    setCommitMessage,
    commitError,
    pushError,
    isCommitting,
    isPushing,
    handleCommit,
    handlePush,
  } = useCommitPanel(repoPath);

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
            onChange={(e) => { setCommitMessage(e.target.value); }}
          />
        </div>

        {commitError === null ? null : renderError(commitError)}
        {pushError === null ? null : renderError(pushError)}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={!canCommit || isCommitting}
            size="sm"
            variant="primary"
            onClick={handleCommit}
          >
            {isCommitting ? (
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

          <Button
            disabled={isPushing}
            size="sm"
            variant="secondary"
            onClick={handlePush}
          >
            {isPushing ? (
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
