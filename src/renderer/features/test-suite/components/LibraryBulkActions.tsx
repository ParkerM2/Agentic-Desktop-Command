import { Play, Trash2 } from 'lucide-react';

import { Button, Flex, Text } from '@ui';

interface LibraryBulkActionsProps {
  batchRunPending: boolean;
  selectedCount: number;
  onDeleteSelected: () => void;
  onRunSelected: () => void;
}

export function LibraryBulkActions({
  batchRunPending,
  selectedCount,
  onDeleteSelected,
  onRunSelected,
}: LibraryBulkActionsProps) {
  if (selectedCount === 0) return null;

  return (
    <Flex
      align="center"
      className="border-t border-border bg-bg-surface px-4 py-2"
      gap="md"
      wrap="nowrap"
    >
      <Text variant="muted">{selectedCount} selected</Text>
      <Button
        disabled={batchRunPending}
        size="sm"
        variant="ghost"
        onClick={onRunSelected}
      >
        <Play className="h-3 w-3" /> Run Selected
      </Button>
      <Button
        className="text-destructive"
        size="sm"
        variant="ghost"
        onClick={onDeleteSelected}
      >
        <Trash2 className="h-3 w-3" /> Delete
      </Button>
    </Flex>
  );
}
