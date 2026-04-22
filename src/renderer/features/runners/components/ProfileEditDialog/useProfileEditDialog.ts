import { useEffect, useState } from 'react';

import type { RunnerProfile } from '@shared/ipc/runners/schemas';

import { newRunnerProfile, useSaveRunnerProfile } from '../../api/useRunnerProfiles';

interface UseProfileEditDialogProps {
  open: boolean;
  projectId: string;
  initial?: RunnerProfile;
  onOpenChange: (open: boolean) => void;
}

export function useProfileEditDialog({ open, projectId, initial, onOpenChange }: UseProfileEditDialogProps) {
  const [draft, setDraft] = useState<RunnerProfile>(initial ?? newRunnerProfile(projectId));
  const save = useSaveRunnerProfile(projectId);

  useEffect(() => {
    setDraft(initial ?? newRunnerProfile(projectId));
  }, [initial, projectId, open]);

  function handleSave() {
    save.mutate(
      { ...draft, updatedAt: new Date().toISOString() },
      {
        onSuccess: () => onOpenChange(false),
      },
    );
  }

  return {
    draft,
    save,
    setDraft,
    handleSave,
  };
}
