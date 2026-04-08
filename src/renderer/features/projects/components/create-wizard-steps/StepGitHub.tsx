/**
 * StepGitHub — Wizard step for GitHub repository configuration
 */

import { AlertTriangle } from 'lucide-react';

import { cn } from '@renderer/shared/lib/utils';

import { Label, Switch } from '@ui';

interface StepGitHubProps {
  createGitHubRepo: boolean;
  githubVisibility: 'public' | 'private';
  onCreateRepoChange: (create: boolean) => void;
  onVisibilityChange: (visibility: 'public' | 'private') => void;
}

export function StepGitHub({
  createGitHubRepo,
  githubVisibility,
  onCreateRepoChange,
  onVisibilityChange,
}: StepGitHubProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium">GitHub Repository</h3>

      {/* Toggle: Create GitHub repo */}
      <div className="flex items-center justify-between">
        <Label className="text-sm" htmlFor="create-github-toggle">
          Create GitHub repository
        </Label>
        <Switch
          checked={createGitHubRepo}
          id="create-github-toggle"
          onCheckedChange={onCreateRepoChange}
        />
      </div>

      {/* Visibility radio buttons */}
      {createGitHubRepo ? (
        <fieldset className="space-y-3">
          <legend className="text-muted-foreground text-sm">Repository visibility</legend>
          <div className="space-y-2">
            <div
              className={cn(
                'border-border flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors',
                githubVisibility === 'private' ? 'border-primary bg-primary/5' : 'bg-card',
              )}
            >
              <input
                checked={githubVisibility === 'private'}
                className="text-primary focus:ring-ring h-4 w-4"
                id="visibility-private"
                name="github-visibility"
                type="radio"
                value="private"
                onChange={() => onVisibilityChange('private')}
              />
              <div>
                <Label className="cursor-pointer text-sm font-medium" htmlFor="visibility-private">
                  Private
                </Label>
                <p className="text-muted-foreground text-xs">
                  Only you and collaborators can see this repository
                </p>
              </div>
            </div>
            <div
              className={cn(
                'border-border flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors',
                githubVisibility === 'public' ? 'border-primary bg-primary/5' : 'bg-card',
              )}
            >
              <input
                checked={githubVisibility === 'public'}
                className="text-primary focus:ring-ring h-4 w-4"
                id="visibility-public"
                name="github-visibility"
                type="radio"
                value="public"
                onChange={() => onVisibilityChange('public')}
              />
              <div>
                <Label className="cursor-pointer text-sm font-medium" htmlFor="visibility-public">
                  Public
                </Label>
                <p className="text-muted-foreground text-xs">
                  Anyone on the internet can see this repository
                </p>
              </div>
            </div>
          </div>
        </fieldset>
      ) : null}

      {/* Note about gh CLI */}
      {createGitHubRepo ? (
        <div className="bg-muted/50 flex items-start gap-2 rounded-lg p-3">
          <AlertTriangle className="text-warning mt-0.5 h-4 w-4 shrink-0" />
          <p className="text-muted-foreground text-xs">
            Requires GitHub CLI (<code className="bg-muted rounded px-1 py-0.5">gh</code>) to be
            installed and authenticated.
          </p>
        </div>
      ) : null}
    </div>
  );
}
