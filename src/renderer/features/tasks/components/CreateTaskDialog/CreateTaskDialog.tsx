/**
 * CreateTaskDialog — Modal dialog for creating a new task
 */

import { AlertTriangle, ListPlus } from 'lucide-react';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
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
  Textarea,
} from '@ui';

import { useCreateTaskDialog } from './useCreateTaskDialog';

type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';

const PRIORITY_OPTIONS: readonly TaskPriority[] = ['low', 'normal', 'high', 'urgent'];

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateTaskDialog({ open, onOpenChange }: CreateTaskDialogProps) {
  const {
    title,
    setTitle,
    description,
    setDescription,
    priority,
    setPriority,
    error,
    activeProjectId,
    createTask,
    isFormValid,
    handleClose,
    handleSubmit,
  } = useCreateTaskDialog(open, onOpenChange);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListPlus className="h-5 w-5" />
            Create Task
          </DialogTitle>
          <DialogDescription>
            Create a new task for the active project.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {activeProjectId === null ? (
            <div className="bg-info/10 text-info rounded-md p-3 text-sm">
              Select a project first to create a task.
            </div>
          ) : null}

          {/* Title field */}
          <div className="space-y-1.5">
            <Label htmlFor="create-task-title" variant="required">
              Title
            </Label>
            <Input
              aria-required="true"
              disabled={activeProjectId === null}
              id="create-task-title"
              placeholder="Task title..."
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && isFormValid && !createTask.isPending) {
                  handleSubmit();
                }
              }}
            />
          </div>

          {/* Description field */}
          <div className="space-y-1.5">
            <Label htmlFor="create-task-description">
              Description
            </Label>
            <Textarea
              disabled={activeProjectId === null}
              id="create-task-description"
              placeholder="Describe the task..."
              resize="none"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Priority field */}
          <div className="space-y-1.5">
            <Label htmlFor="create-task-priority">
              Priority
            </Label>
            <Select
              disabled={activeProjectId === null}
              value={priority}
              onValueChange={(value) => setPriority(value as TaskPriority)}
            >
              <SelectTrigger id="create-task-priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt.charAt(0).toUpperCase() + opt.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Error message */}
          {error === null ? null : (
            <div className="rounded-md bg-red-500/10 p-3">
              <div className="flex items-center gap-2 text-sm text-red-400">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            disabled={!isFormValid || createTask.isPending}
            variant="primary"
            onClick={handleSubmit}
          >
            {createTask.isPending ? (
              <>
                <Spinner size="sm" />
                Creating...
              </>
            ) : (
              <>
                <ListPlus className="h-4 w-4" />
                Create Task
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
