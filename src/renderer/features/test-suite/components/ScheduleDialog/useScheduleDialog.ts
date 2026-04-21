import { useState } from 'react';

import { useCreateSchedule } from '../../api/useSchedules';
import { useMutationWithDialogClose } from '../../hooks/useMutationWithDialogClose';

const INTERVALS = [
  { label: 'Every 5 minutes', value: 300_000 },
  { label: 'Every 15 minutes', value: 900_000 },
  { label: 'Every 30 minutes', value: 1_800_000 },
  { label: 'Every hour', value: 3_600_000 },
  { label: 'Every 6 hours', value: 21_600_000 },
  { label: 'Every 12 hours', value: 43_200_000 },
  { label: 'Every day', value: 86_400_000 },
] as const;

interface UseScheduleDialogProps {
  scriptId: string;
  projectId: string;
  onOpenChange: (open: boolean) => void;
}

export function useScheduleDialog({ scriptId, projectId, onOpenChange }: UseScheduleDialogProps) {
  const [intervalMs, setIntervalMs] = useState(3_600_000);
  const createSchedule = useCreateSchedule();
  const { handleMutate, isPending } = useMutationWithDialogClose(
    createSchedule,
    () => onOpenChange(false),
  );

  const handleCreate = () => handleMutate({ scriptId, projectId, intervalMs });

  return {
    intervalMs,
    setIntervalMs,
    intervals: INTERVALS,
    creating: isPending,
    handleCreate,
  };
}
