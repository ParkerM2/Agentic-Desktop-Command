import { useEffect, useState } from 'react';

import type { RunnerProfile } from '@shared/ipc/runners/schemas';

import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Switch,
} from '@ui';

import { newRunnerProfile, useSaveRunnerProfile } from '../api/useRunnerProfiles';

interface Props {
  open: boolean;
  projectId: string;
  initial?: RunnerProfile;
  onOpenChange: (open: boolean) => void;
}

export function ProfileEditDialog({ open, projectId, initial, onOpenChange }: Props) {
  const [draft, setDraft] = useState<RunnerProfile>(initial ?? newRunnerProfile(projectId));
  const save = useSaveRunnerProfile(projectId);

  useEffect(() => {
    setDraft(initial ?? newRunnerProfile(projectId));
  }, [initial, projectId, open]);

  const onSave = () => {
    save.mutate(
      { ...draft, updatedAt: new Date().toISOString() },
      {
        onSuccess: () => onOpenChange(false),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit Runner Profile' : 'New Runner Profile'}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3">
          <div>
            <Label htmlFor="r-name">Name</Label>
            <Input
              id="r-name"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="r-cmd">Command</Label>
            <Input
              id="r-cmd"
              placeholder="npm run dev"
              value={draft.command}
              onChange={(e) => setDraft({ ...draft, command: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="r-cwd">Working directory (relative)</Label>
            <Input
              id="r-cwd"
              value={draft.cwdRelative}
              onChange={(e) => setDraft({ ...draft, cwdRelative: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="r-url">Health check URL (optional)</Label>
            <Input
              id="r-url"
              placeholder="http://localhost:3000"
              value={draft.healthCheckUrl ?? ''}
              onChange={(e) =>
                setDraft({ ...draft, healthCheckUrl: e.target.value || undefined })
              }
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={draft.autoRestart}
              onCheckedChange={(v) => setDraft({ ...draft, autoRestart: v })}
            />
            <Label>Auto-restart on failure</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={save.isPending} onClick={onSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
