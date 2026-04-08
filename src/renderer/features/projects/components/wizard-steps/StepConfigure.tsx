/**
 * StepConfigure — Wizard step for project settings (name, workspace)
 */

import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@ui';

interface WorkspaceOption {
  id: string;
  name: string;
}

interface StepConfigureProps {
  projectName: string;
  description: string;
  selectedPath: string | null;
  repoType: string;
  hasChildRepos: boolean;
  selectedReposSize: number;
  workspaceId: string | null;
  workspaces: WorkspaceOption[];
  onNameChange: (name: string) => void;
  onDescriptionChange: (description: string) => void;
  onWorkspaceChange: (id: string | null) => void;
}

export function StepConfigure({
  projectName,
  description,
  selectedPath,
  repoType,
  hasChildRepos,
  selectedReposSize,
  workspaceId,
  workspaces,
  onNameChange,
  onDescriptionChange,
  onWorkspaceChange,
}: StepConfigureProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium">Project Settings</h3>
      <div>
        <Label className="text-muted-foreground mb-1 block text-sm" htmlFor="wizard-name">
          Project Name
        </Label>
        <Input
          id="wizard-name"
          placeholder="My Project"
          type="text"
          value={projectName}
          onChange={(e) => onNameChange(e.target.value)}
        />
      </div>
      <div>
        <Label className="text-muted-foreground mb-1 block text-sm" htmlFor="wizard-description">
          Description
        </Label>
        <Textarea
          className="resize-none"
          id="wizard-description"
          placeholder="Optional project description"
          rows={2}
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
        />
      </div>
      {workspaces.length > 0 ? (
        <div>
          <Label className="text-muted-foreground mb-1 block text-sm" htmlFor="wizard-workspace">
            Workspace
          </Label>
          <Select
            value={workspaceId ?? ''}
            onValueChange={(val) => onWorkspaceChange(val.length > 0 ? val : null)}
          >
            <SelectTrigger id="wizard-workspace">
              <SelectValue placeholder="No workspace" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">No workspace</SelectItem>
              {workspaces.map((ws) => (
                <SelectItem key={ws.id} value={ws.id}>
                  {ws.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
