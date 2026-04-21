import { ListPlus } from 'lucide-react';

import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Stack,
  Textarea,
} from '@ui';

import { useCreateTaskFromRunDialog } from './useCreateTaskFromRunDialog';

import type { RunRecord } from '../../lib/types';

interface CreateTaskFromRunDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  runRecord: RunRecord;
  scriptName: string;
  projectId: string;
  runId: string;
}

export function CreateTaskFromRunDialog({
  open,
  onOpenChange,
  runRecord,
  scriptName,
  projectId,
  runId,
}: CreateTaskFromRunDialogProps) {
  const vm = useCreateTaskFromRunDialog({ open, onOpenChange, runRecord, scriptName, projectId, runId });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListPlus className="h-5 w-5" />
            Create Task from Test Run
          </DialogTitle>
        </DialogHeader>

        <Stack className="overflow-y-auto flex-1 py-2" gap="md">
          <Stack gap="sm">
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              value={vm.title}
              onChange={(e) => vm.setTitle(e.target.value)}
            />
          </Stack>

          <Stack gap="sm">
            <Label htmlFor="task-priority">Priority</Label>
            <Select value={vm.priority} onValueChange={(v) => vm.setPriority(v as typeof vm.priority)}>
              <SelectTrigger className="w-40" id="task-priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {vm.priorities.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Stack>

          <Stack className="flex-1" gap="sm">
            <Label htmlFor="task-description">Description</Label>
            <Textarea
              className="min-h-[300px] flex-1 font-mono text-xs"
              id="task-description"
              value={vm.description}
              onChange={(e) => vm.setDescription(e.target.value)}
            />
          </Stack>
        </Stack>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!vm.canCreate || vm.creating}
            onClick={vm.handleCreate}
          >
            {vm.creating ? 'Creating...' : 'Create Task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
