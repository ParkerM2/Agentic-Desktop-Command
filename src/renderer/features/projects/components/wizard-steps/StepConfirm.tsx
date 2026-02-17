/**
 * StepConfirm — Wizard step for reviewing and confirming project setup
 */

interface WorkspaceOption {
  id: string;
  name: string;
}

interface StepConfirmProps {
  projectName: string;
  selectedPath: string | null;
  repoType: string;
  hasChildRepos: boolean;
  selectedReposSize: number;
  workspaceId: string | null;
  workspaces: WorkspaceOption[];
  defaultBranch: string | undefined;
}

export function StepConfirm({
  projectName,
  selectedPath,
  repoType,
  hasChildRepos,
  selectedReposSize,
  workspaceId,
  workspaces,
  defaultBranch,
}: StepConfirmProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium">Confirm Project Setup</h3>
      <div className="border-border rounded-lg border p-4">
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Name</dt>
            <dd className="font-medium">{projectName}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Path</dt>
            <dd className="max-w-[250px] truncate text-right font-medium">{selectedPath}</dd>
          </div>
          {workspaceId ? (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Workspace</dt>
              <dd className="font-medium">
                {workspaces.find((ws) => ws.id === workspaceId)?.name ?? workspaceId}
              </dd>
            </div>
          ) : null}
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Repo type</dt>
            <dd className="font-medium">{repoType}</dd>
          </div>
          {defaultBranch ? (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Default branch</dt>
              <dd className="font-medium">{defaultBranch}</dd>
            </div>
          ) : null}
          {hasChildRepos ? (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Sub-repos</dt>
              <dd className="font-medium">{String(selectedReposSize)}</dd>
            </div>
          ) : null}
        </dl>
      </div>
    </div>
  );
}
