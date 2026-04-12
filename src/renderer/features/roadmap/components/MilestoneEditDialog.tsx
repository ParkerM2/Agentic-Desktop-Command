/**
 * MilestoneEditDialog — Edit a milestone's title, description, targetDate, status,
 * and task items (rename, delete, toggle).
 */

import { useEffect, useState } from 'react';

import { Pencil } from 'lucide-react';

import type { Milestone, MilestoneStatus, MilestoneTask } from '@shared/types';

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
  Spinner,
  Text,
  Textarea,
} from '@ui';

import { useUpdateMilestone } from '../api/useMilestones';

import { MilestoneTaskListEditor } from './MilestoneTaskListEditor';

interface MilestoneEditDialogProps {
  milestone: Milestone | null;
  onClose: () => void;
}

export function MilestoneEditDialog({ milestone, onClose }: MilestoneEditDialogProps) {
  // 1. Hooks
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [status, setStatus] = useState<MilestoneStatus>('planned');
  const [tasks, setTasks] = useState<MilestoneTask[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const updateMilestone = useUpdateMilestone();

  // 2. Effects — initialize form from milestone prop
  useEffect(() => {
    if (milestone !== null) {
      setTitle(milestone.title);
      setDescription(milestone.description);
      setTargetDate(milestone.targetDate.substring(0, 10));
      setStatus(milestone.status);
      setTasks([...milestone.tasks]);
      setErrorMessage(null);
    }
  }, [milestone]);

  // 3. Derived state
  const titleIsEmpty = title.trim().length === 0;
  const targetDateIsEmpty = targetDate.trim().length === 0;
  const isFormValid = !titleIsEmpty && !targetDateIsEmpty;

  // 4. Submit handler
  function handleSave(): void {
    if (milestone === null || !isFormValid) return;

    setErrorMessage(null);

    updateMilestone.mutate(
      {
        id: milestone.id,
        title: title.trim(),
        description: description.trim(),
        targetDate: new Date(targetDate).toISOString(),
        status,
        tasks,
      },
      {
        onSuccess: () => {
          onClose();
        },
        onError: (err) => {
          setErrorMessage(err instanceof Error ? err.message : 'Failed to update milestone');
        },
      },
    );
  }

  return (
    <Dialog open={milestone !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Pencil className="text-primary h-5 w-5" />
            Edit Milestone
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Title */}
          <div>
            <Label htmlFor="edit-milestone-title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              aria-required="true"
              className="mt-1"
              id="edit-milestone-title"
              placeholder="Milestone title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="edit-milestone-description">Description</Label>
            <Textarea
              className="mt-1 resize-none"
              id="edit-milestone-description"
              placeholder="Optional description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Target Date */}
          <div>
            <Label htmlFor="edit-milestone-date">
              Target Date <span className="text-destructive">*</span>
            </Label>
            <Input
              aria-required="true"
              className="mt-1"
              id="edit-milestone-date"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          </div>

          {/* Status */}
          <div>
            <Label htmlFor="edit-milestone-status">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as MilestoneStatus)}>
              <SelectTrigger className="mt-1" id="edit-milestone-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planned">Planned</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tasks */}
          <MilestoneTaskListEditor tasks={tasks} onChange={setTasks} />
        </div>

        {/* Error message */}
        {errorMessage === null ? null : (
          <div className="rounded-md bg-destructive/10 p-3">
            <Text size="md" variant="error">{errorMessage}</Text>
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            disabled={!isFormValid || updateMilestone.isPending}
            type="button"
            onClick={handleSave}
          >
            {updateMilestone.isPending ? (
              <>
                <Spinner size="sm" />
                Saving...
              </>
            ) : (
              'Save'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
