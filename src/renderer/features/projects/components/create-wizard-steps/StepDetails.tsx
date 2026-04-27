/**
 * StepDetails — Wizard step for project name, description, and folder selection
 */

import { FolderOpen, Loader2 } from 'lucide-react';

import { Button, Heading, Input, Label, Textarea } from '@ui';

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
      <Heading as="h3" className="text-sm font-medium">Project Details</Heading>

      <div>
        <Label className="text-muted-foreground mb-1 block text-sm" htmlFor="create-wizard-name">
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
        <Label className="text-muted-foreground mb-1 block text-sm" htmlFor="create-wizard-description">
          Description
        </Label>
        <Textarea
          className="resize-none"
          id="create-wizard-description"
          placeholder="Optional project description"
          rows={2}
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
        />
      </div>

      <div>
        <Label className="text-muted-foreground mb-1 block text-sm" htmlFor="create-wizard-folder">
          Target Folder
        </Label>
        <div className="flex items-center gap-2">
          <Button
            disabled={isSelectingFolder}
            id="create-wizard-folder"
            type="button"
            variant="outline"
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
