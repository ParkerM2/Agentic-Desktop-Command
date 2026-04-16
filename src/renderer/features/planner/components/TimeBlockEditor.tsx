/**
 * TimeBlockEditor — Create/edit time blocks
 */

import { useState } from 'react';

import { Plus, X } from 'lucide-react';

import type { TimeBlock } from '@shared/types';

import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ui';

const BLOCK_TYPES: Array<{ value: TimeBlock['type']; label: string }> = [
  { value: 'focus', label: 'Focus' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'break', label: 'Break' },
  { value: 'other', label: 'Other' },
];

interface TimeBlockEditorProps {
  editingBlock?: TimeBlock;
  onSave: (block: Omit<TimeBlock, 'id'>) => void;
  onCancel: () => void;
}

export function TimeBlockEditor({ editingBlock, onSave, onCancel }: TimeBlockEditorProps) {
  const [startTime, setStartTime] = useState(editingBlock?.startTime ?? '09:00');
  const [endTime, setEndTime] = useState(editingBlock?.endTime ?? '10:00');
  const [label, setLabel] = useState(editingBlock?.label ?? '');
  const [blockType, setBlockType] = useState<TimeBlock['type']>(editingBlock?.type ?? 'focus');

  function handleSubmit(event: React.SyntheticEvent) {
    event.preventDefault();
    if (label.trim().length === 0) return;

    onSave({
      startTime,
      endTime,
      label: label.trim(),
      type: blockType,
    });
  }

  return (
    <form className="border-border bg-card space-y-3 rounded-lg border p-4" onSubmit={handleSubmit}>
      <div className="flex items-center justify-between">
        <h4 className="text-foreground text-sm font-medium">
          {editingBlock ? 'Edit Time Block' : 'New Time Block'}
        </h4>
        <Button
          aria-label="Cancel"
          size="icon"
          type="button"
          variant="ghost"
          onClick={onCancel}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-muted-foreground text-xs">Start</Label>
          <Input
            type="time"
            value={startTime}
            onChange={(event) => setStartTime(event.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-muted-foreground text-xs">End</Label>
          <Input
            type="time"
            value={endTime}
            onChange={(event) => setEndTime(event.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-muted-foreground text-xs">Label</Label>
        <Input
          placeholder="What are you working on?"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
        />
      </div>

      <div className="space-y-1">
        <Label className="text-muted-foreground text-xs">Type</Label>
        <Select value={blockType} onValueChange={(v) => setBlockType(v as TimeBlock['type'])}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BLOCK_TYPES.map((bt) => (
              <SelectItem key={bt.value} value={bt.value}>
                {bt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-2">
        <Button size="sm" type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          disabled={label.trim().length === 0}
          size="sm"
          type="submit"
        >
          <Plus className="h-3.5 w-3.5" />
          {editingBlock ? 'Update' : 'Add Block'}
        </Button>
      </div>
    </form>
  );
}
