/**
 * StepList
 *
 * Renders recorder step events live as they stream in from the main
 * process. Subscribes to `TEST_SUITE_EVENTS.RECORDER.STEP` and appends
 * each payload to the test-suite store. Steps can be drag-reordered,
 * removed, and (for `fill` steps) inline-edited.
 */

import {
  DndContext,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil, Trash2 } from 'lucide-react';

import { Button, Flex, Input, Stack, Text } from '@ui';

import { renderDetail, useSortableStepItem, useStepList } from './useStepList';

import type { RecordedStep } from '../../test-suite-store';

export function StepList() {
  const vm = useStepList();

  return (
    <Stack className="overflow-y-auto p-3 text-sm" gap="sm">
      <DndContext
        collisionDetection={closestCenter}
        sensors={vm.sensors}
        onDragEnd={vm.handleDragEnd}
      >
        <SortableContext
          items={vm.steps.map((s) => s.stepIndex)}
          strategy={verticalListSortingStrategy}
        >
          {vm.steps.map((evt) => (
            <SortableStepItem key={evt.stepIndex} step={evt} />
          ))}
        </SortableContext>
      </DndContext>
    </Stack>
  );
}

function SortableStepItem({ step }: { step: RecordedStep }) {
  const vm = useSortableStepItem(step);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.stepIndex });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      className="flex items-start gap-1 rounded border border-border bg-bg-surface px-2 py-1"
      style={style}
    >
      <div
        className="mt-0.5 cursor-grab text-text-dim"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3 w-3" />
      </div>
      <Text className="w-6 text-text-dim" size="sm">{step.stepIndex + 1}</Text>
      <Text className="font-mono uppercase text-accent" size="sm">{step.step.type}</Text>
      <Text className="flex-1 truncate" size="sm" variant="muted">
        {vm.editing ? (
          <Flex align="center" gap="sm">
            <Input
              className="h-5 text-xs"
              value={vm.editValue}
              onKeyDown={vm.handleKeyDown}
              onChange={(e) => {
                vm.setEditValue(e.target.value);
              }}
            />
            <Button size="icon-xs" variant="ghost" onClick={vm.saveEdit}>
              <Pencil className="h-3 w-3" />
            </Button>
          </Flex>
        ) : (
          renderDetail(step.step)
        )}
      </Text>
      <Flex align="center" className="shrink-0" gap="none">
        {step.step.type === 'fill' && !vm.editing && (
          <Button size="icon-xs" variant="ghost" onClick={vm.startEdit}>
            <Pencil className="h-3 w-3" />
          </Button>
        )}
        <Button
          size="icon-xs"
          variant="ghost"
          onClick={vm.handleRemove}
        >
          <Trash2 className="h-3 w-3 text-destructive" />
        </Button>
      </Flex>
    </div>
  );
}
