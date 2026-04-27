/**
 * BulkActionBar — Appears when one or more progress tasks are selected.
 * Provides Archive, Delete, Change Status, and Change Priority bulk actions.
 * Destructive actions (Archive, Delete) require AlertDialog confirmation.
 */

import { Trash2, Archive, X } from 'lucide-react';

import type { ProgressPriority, ProgressStatus } from '@shared/types/progress';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Badge,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
  Text,
} from '@ui';

import { useBulkActionBar } from './useBulkActionBar';

const BULK_STATUSES: ProgressStatus[] = [
  'backlog',
  'researching',
  'research_done',
  'planning',
  'plan_ready',
  'executing',
  'review',
  'done',
];

const STATUS_LABELS: Record<ProgressStatus, string> = {
  backlog: 'Backlog',
  researching: 'Researching',
  research_done: 'Research Done',
  planning: 'Planning',
  plan_ready: 'Plan Ready',
  executing: 'Executing',
  review: 'Review',
  done: 'Done',
  archived: 'Archived',
  error: 'Error',
};

const PRIORITY_LABELS: Record<ProgressPriority, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
};

const ALL_PRIORITIES: ProgressPriority[] = ['low', 'normal', 'high', 'urgent'];

interface BulkActionBarProps {
  selected: Set<string>;
  isLoading: boolean;
  onClear: () => void;
  onArchive: () => Promise<void>;
  onDelete: () => Promise<void>;
  onChangeStatus: (status: ProgressStatus) => Promise<void>;
  onChangePriority: (priority: ProgressPriority) => Promise<void>;
}

export function BulkActionBar({
  selected,
  isLoading,
  onClear,
  onArchive,
  onDelete,
  onChangeStatus,
  onChangePriority,
}: BulkActionBarProps) {
  const {
    archiveOpen,
    setArchiveOpen,
    deleteOpen,
    setDeleteOpen,
    handleArchiveConfirm,
    handleDeleteConfirm,
    handleStatusChange,
    handlePriorityChange,
  } = useBulkActionBar({ onArchive, onDelete, onChangeStatus, onChangePriority });

  const count = selected.size;
  const hasSelection = count > 0;

  if (!hasSelection) {
    return null;
  }

  return (
    <div className="border-border bg-card flex items-center gap-3 border-t px-4 py-2">
      {/* Selection count */}
      <div className="flex items-center gap-2">
        <Badge variant="secondary">
          {count} selected
        </Badge>
        <Button
          aria-label="Clear selection"
          size="sm"
          variant="ghost"
          onClick={onClear}
        >
          <X className="h-3.5 w-3.5" />
          Clear
        </Button>
      </div>

      <div className="bg-border h-5 w-px" />

      {/* Change Status */}
      <Select onValueChange={handleStatusChange}>
        <SelectTrigger
          aria-label="Set status for selected tasks"
          className="h-8 w-40"
          disabled={isLoading}
        >
          <SelectValue placeholder="Set status…" />
        </SelectTrigger>
        <SelectContent>
          {BULK_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {STATUS_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Change Priority */}
      <Select onValueChange={handlePriorityChange}>
        <SelectTrigger
          aria-label="Set priority for selected tasks"
          className="h-8 w-36"
          disabled={isLoading}
        >
          <SelectValue placeholder="Set priority…" />
        </SelectTrigger>
        <SelectContent>
          {ALL_PRIORITIES.map((p) => (
            <SelectItem key={p} value={p}>
              {PRIORITY_LABELS[p]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex-1" />

      {/* Archive */}
      <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <AlertDialogTrigger asChild>
          <Button
            aria-label={`Archive ${String(count)} selected task${count === 1 ? '' : 's'}`}
            disabled={isLoading}
            size="sm"
            variant="outline"
          >
            {isLoading ? <Spinner className="mr-1.5" size="sm" /> : <Archive className="mr-1.5 h-3.5 w-3.5" />}
            Archive
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive {count} task{count === 1 ? '' : 's'}?</AlertDialogTitle>
            <AlertDialogDescription>
              <Text className="text-muted-foreground text-sm">
                This will archive {count === 1 ? 'the selected task' : `all ${String(count)} selected tasks`}. Archived tasks can be restored later.
              </Text>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void handleArchiveConfirm()}
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogTrigger asChild>
          <Button
            aria-label={`Delete ${String(count)} selected task${count === 1 ? '' : 's'}`}
            disabled={isLoading}
            size="sm"
            variant="destructive"
          >
            {isLoading ? <Spinner className="mr-1.5" size="sm" /> : <Trash2 className="mr-1.5 h-3.5 w-3.5" />}
            Delete
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {count} task{count === 1 ? '' : 's'}?</AlertDialogTitle>
            <AlertDialogDescription>
              <Text className="text-muted-foreground text-sm">
                This will permanently delete {count === 1 ? 'the selected task' : `all ${String(count)} selected tasks`}. This action cannot be undone.
              </Text>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void handleDeleteConfirm()}
            >
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
