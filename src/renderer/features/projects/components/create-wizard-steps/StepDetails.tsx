/**
 * StepDetails — Wizard step for project name, description, and folder selection
 */

import { FolderOpen, Loader2 } from 'lucide-react';

import { Button, Input, Label, Textarea } from '@ui';

interface StepDetailsProps {
  name: string;
  description: string;
  path: string;
  isSelectingFolder: boolean;
  onNameChange: (name: string) => void;
  onDescriptionChange: (description: string) => void;
  onSelectFolder: () => void;
}

export function StepDetails({
  name,
  description,
  path,
  isSelectingFolder,
  onNameChange,
  onDescriptionChange,
  onSelectFolder,
}: StepDetailsProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium">Project Details</h3>

      <div>
        <Label htmlFor="create-wizard-name" className="text-muted-foreground mb-1 block text-sm">
          Project Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="create-wizard-name"
          placeholder="my-awesome-project"
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
        />
      </div>

      <div>
        <Label htmlFor="create-wizard-description" className="text-muted-foreground mb-1 block text-sm">
          Description
        </Label>
        <Textarea
          id="create-wizard-description"
          placeholder="Optional project description"
          rows={2}
          value={description}
          className="resize-none"
          onChange={(e) => onDescriptionChange(e.target.value)}
        />
      </div>

      <div>
        <Label htmlFor="create-wizard-folder" className="text-muted-foreground mb-1 block text-sm">
          Target Folder
        </Label>
        <div className="flex items-center gap-2">
          <Button
            id="create-wizard-folder"
            variant="outline"
            type="button"
            disabled={isSelectingFolder}
            onClick={onSelectFolder}
          >
            {isSelectingFolder ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FolderOpen className="h-4 w-4 shrink-0" />
            )}
            {isSelectingFolder ? 'Selecting...' : 'Choose Folder'}
          </Button>
          {path.length > 0 ? (
            <span className="text-muted-foreground min-w-0 flex-1 truncate text-xs">{path}</span>
          ) : (
            <span className="text-muted-foreground text-xs italic">No folder selected</span>
          )}
        </div>
      </div>
    </div>
  );
}
