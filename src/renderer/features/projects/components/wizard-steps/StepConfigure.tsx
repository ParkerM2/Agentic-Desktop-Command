/**
 * StepConfigure — Wizard step for project settings (name, workspace)
 */

import { cn } from '@renderer/shared/lib/utils';

interface WorkspaceOption {
  id: string;
  name: string;
}

interface StepConfigureProps {
  projectName: string;
  selectedPath: string | null;
  repoType: string;
  hasChildRepos: boolean;
  selectedReposSize: number;
  workspaceId: string | null;
  workspaces: WorkspaceOption[];
  onNameChange: (name: string) => void;
  onWorkspaceChange: (id: string | null) => void;
}

export function StepConfigure({
  projectName,
  selectedPath,
  repoType,
  hasChildRepos,
  selectedReposSize,
  workspaceId,
  workspaces,
  onNameChange,
  onWorkspaceChange,
}: StepConfigureProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium">Project Settings</h3>
      <div>
        <label className="text-muted-foreground mb-1 block text-sm" htmlFor="wizard-name">
          Project Name
        </label>
        <input
          id="wizard-name"
          placeholder="My Project"
          type="text"
          value={projectName}
          className={cn(
            'border-border bg-background w-full rounded-lg border px-3 py-2 text-sm',
            'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
          )}
          onChange={(e) => onNameChange(e.target.value)}
        />
      </div>
      {workspaces.length > 0 ? (
        <div>
          <label className="text-muted-foreground mb-1 block text-sm" htmlFor="wizard-workspace">
            Workspace
          </label>
          <select
            id="wizard-workspace"
            value={workspaceId ?? ''}
            className={cn(
              'border-border bg-background w-full rounded-lg border px-3 py-2 text-sm',
              'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
            )}
            onChange={(e) => onWorkspaceChange(e.target.value || null)}
          >
            <option value="">No workspace</option>
            {workspaces.map((ws) => (
              <option key={ws.id} value={ws.id}>
                {ws.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <div className="text-muted-foreground text-sm">
        <p className="mb-1">
          <span className="font-medium">Path:</span> {selectedPath}
        </p>
        <p className="mb-1">
          <span className="font-medium">Type:</span> {repoType}
        </p>
        {hasChildRepos ? (
          <p>
            <span className="font-medium">Sub-repos:</span> {String(selectedReposSize)} selected
          </p>
        ) : null}
      </div>
    </div>
  );
}
