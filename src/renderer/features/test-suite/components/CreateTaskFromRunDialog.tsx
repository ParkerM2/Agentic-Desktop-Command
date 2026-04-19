import { useEffect, useState } from 'react';

import { ListPlus } from 'lucide-react';

import {
  useCreateProgressTask,
} from '@renderer/features/tasks/api/useProgressMutations';

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

import { useAttachRunToTask } from '../api/useAttachRunToTask';
import { buildDefaultDescription } from '../lib/run-description';
import type { RunRecord } from '../lib/types';

interface CreateTaskFromRunDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  runRecord: RunRecord;
  scriptName: string;
  projectId: string;
  runId: string;
}

const PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;

export function CreateTaskFromRunDialog({
  open,
  onOpenChange,
  runRecord,
  scriptName,
  projectId,
  runId,
}: CreateTaskFromRunDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<(typeof PRIORITIES)[number]>('high');

  const createTask = useCreateProgressTask();
  const attachRunToTask = useAttachRunToTask();

  useEffect(() => {
    if (open) {
      setTitle(`Fix: ${scriptName} test failure`);
      setDescription(buildDefaultDescription(scriptName, runRecord));
      setPriority('high');
    }
  }, [open, scriptName, runRecord]);

  const handleCreate = () => {
    createTask.mutate(
      { title, description, priority, projectId },
      {
        onSuccess: (task) => {
          attachRunToTask.mutate({ runId, taskId: task.slug });
          onOpenChange(false);
        },
      },
    );
  };

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
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </Stack>

          <Stack gap="sm">
            <Label htmlFor="task-priority">Priority</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
              <SelectTrigger className="w-40" id="task-priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((p) => (
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
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Stack>
        </Stack>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!title.trim() || createTask.isPending}
            onClick={handleCreate}
          >
            {createTask.isPending ? 'Creating...' : 'Create Task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
