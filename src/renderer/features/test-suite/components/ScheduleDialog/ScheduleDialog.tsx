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

import { useScheduleDialog } from './useScheduleDialog';

interface ScheduleDialogProps {
  scriptId: string;
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ScheduleDialog({ scriptId, projectId, open, onOpenChange }: ScheduleDialogProps) {
  const vm = useScheduleDialog({ scriptId, projectId, onOpenChange });

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
              value={String(vm.intervalMs)}
              onValueChange={(v) => vm.setIntervalMs(Number(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {vm.intervals.map((i) => (
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
            disabled={vm.creating}
            onClick={vm.handleCreate}
          >
            Create Schedule
          </Button>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
