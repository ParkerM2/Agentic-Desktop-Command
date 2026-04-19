import { useState } from 'react';

import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Stack,
  Text,
} from '@ui';

import { useCreateSchedule } from '../api/useSchedules';

interface ScheduleDialogProps {
  scriptId: string;
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const INTERVALS = [
  { label: 'Every 5 minutes', value: 300_000 },
  { label: 'Every 15 minutes', value: 900_000 },
  { label: 'Every 30 minutes', value: 1_800_000 },
  { label: 'Every hour', value: 3_600_000 },
  { label: 'Every 6 hours', value: 21_600_000 },
  { label: 'Every 12 hours', value: 43_200_000 },
  { label: 'Every day', value: 86_400_000 },
];

export function ScheduleDialog({ scriptId, projectId, open, onOpenChange }: ScheduleDialogProps) {
  const [intervalMs, setIntervalMs] = useState(3_600_000);
  const createSchedule = useCreateSchedule();

  const handleCreate = () => {
    createSchedule.mutate(
      { scriptId, projectId, intervalMs },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Schedule Test Run</DialogTitle>
        </DialogHeader>
        <Stack gap="md">
          <Stack gap="sm">
            <Label>Run Interval</Label>
            <Select
              value={String(intervalMs)}
              onValueChange={(v) => setIntervalMs(Number(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INTERVALS.map((i) => (
                  <SelectItem key={i.value} value={String(i.value)}>
                    {i.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Stack>
          <Text size="sm" variant="muted">
            Test will run automatically at the selected interval. Desktop notifications will alert on failures.
          </Text>
          <Button
            className="w-full"
            disabled={createSchedule.isPending}
            onClick={handleCreate}
          >
            Create Schedule
          </Button>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
