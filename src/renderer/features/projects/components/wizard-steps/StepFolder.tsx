/**
 * StepFolder — Wizard step for selecting a project folder
 */

import { FolderOpen, Loader2 } from 'lucide-react';

import { cn } from '@renderer/shared/lib/utils';

import { Button } from '@ui';

interface StepFolderProps {
  selectedPath: string | null;
  isPending: boolean;
  onSelect: () => void;
}

export function StepFolder({ selectedPath, isPending, onSelect }: StepFolderProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <FolderOpen className="text-muted-foreground mb-4 h-12 w-12 opacity-40" />
      <p className="text-muted-foreground mb-4 text-sm">
        Select a folder to initialize as a project
      </p>
      <Button
        disabled={isPending}
        type="button"
        className={cn(
          'rounded-lg px-6 py-2.5 text-sm font-medium',
        )}
        onClick={onSelect}
      >
        {isPending ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Selecting...
          </span>
        ) : (
          'Choose Folder'
        )}
      </Button>
      {selectedPath ? (
        <p className="text-muted-foreground mt-3 text-xs">Selected: {selectedPath}</p>
      ) : null}
    </div>
  );
}
