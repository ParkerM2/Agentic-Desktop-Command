/**
 * SubRepoDetector — Displays detection results for child repos
 */

import { AlertCircle, FolderGit2, Loader2 } from 'lucide-react';

import type { PROJECTS } from '@shared/ipc/projects/channels';
import type { InvokeOutput } from '@shared/ipc-contract';

type RepoDetectionResult = InvokeOutput<typeof PROJECTS.DETECT.REPO>;

interface SubRepoDetectorProps {
  detection: RepoDetectionResult | undefined;
  isLoading: boolean;
  error: Error | null;
}

export function SubRepoDetector({ detection, isLoading, error }: SubRepoDetectorProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-6">
        <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
        <span className="text-muted-foreground text-sm">Detecting repositories...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-4">
        <AlertCircle className="text-destructive h-5 w-5" />
        <div>
          <p className="text-destructive text-sm font-medium">Detection failed</p>
          <p className="text-muted-foreground text-xs">{error.message}</p>
        </div>
      </div>
    );
  }

  if (!detection) return null;

  return (
    <div className="space-y-3">
      <div className="text-sm">
        <span className="text-muted-foreground">Git repository: </span>
        <span className={detection.isGitRepo ? 'text-success' : 'text-muted-foreground'}>
          {detection.isGitRepo ? 'Yes' : 'No'}
        </span>
      </div>

      {detection.defaultBranch ? (
        <div className="text-sm">
          <span className="text-muted-foreground">Default branch: </span>
          <span className="text-foreground font-medium">{detection.defaultBranch}</span>
        </div>
      ) : null}

      {detection.childRepos.length > 0 ? (
        <div>
          <p className="text-muted-foreground mb-2 text-sm">
            Found {String(detection.childRepos.length)} child{' '}
            {detection.childRepos.length === 1 ? 'repository' : 'repositories'}:
          </p>
          <div className="space-y-1">
            {detection.childRepos.map((repo) => (
              <div
                key={repo.path}
                className="border-border flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
              >
                <FolderGit2 className="text-muted-foreground h-4 w-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="font-medium">{repo.name}</span>
                  <span className="text-muted-foreground ml-2 text-xs">{repo.relativePath}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
