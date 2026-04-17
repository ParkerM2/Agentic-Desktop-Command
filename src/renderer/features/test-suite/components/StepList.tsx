/**
 * StepList
 *
 * Renders recorder step events live as they stream in from the main
 * process. Subscribes to `TEST_SUITE_EVENTS.RECORDER.STEP` and appends
 * each payload to the test-suite store. Steps can be drag-reordered,
 * removed, and (for `fill` steps) inline-edited.
 */

import { useState } from 'react';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil, Trash2 } from 'lucide-react';

import type { TestSuiteStep } from '@shared/types/test-suite';

import { Button, Input } from '@ui';

import { useTestSuiteStore } from '../test-suite-store';

import type { RecordedStep } from '../test-suite-store';
import type { DragEndEvent } from '@dnd-kit/core';

export function StepList() {
  const steps = useTestSuiteStore((s) => s.recordedSteps);
  const reorderSteps = useTestSuiteStore((s) => s.reorderSteps);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = steps.findIndex((s) => s.stepIndex === active.id);
    const newIndex = steps.findIndex((s) => s.stepIndex === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      reorderSteps(oldIndex, newIndex);
    }
  };

  return (
    <div className="flex flex-col gap-1 overflow-y-auto p-3 text-sm">
      <DndContext
        collisionDetection={closestCenter}
        sensors={sensors}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={steps.map((s) => s.stepIndex)}
          strategy={verticalListSortingStrategy}
        >
          {steps.map((evt) => (
            <SortableStepItem key={evt.stepIndex} step={evt} />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
}

function SortableStepItem({ step }: { step: RecordedStep }) {
  const removeStep = useTestSuiteStore((s) => s.removeStep);
  const updateStep = useTestSuiteStore((s) => s.updateStep);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');

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

  const startEdit = () => {
    if (step.step.type === 'fill') {
      setEditValue(step.step.value);
      setEditing(true);
    }
  };

  const saveEdit = () => {
    if (step.step.type === 'fill') {
      updateStep(step.stepIndex, { ...step.step, value: editValue });
    }
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      saveEdit();
      return;
    }
    if (e.key === 'Escape') {
      setEditing(false);
    }
  };

  return (
    <div
      ref={setNodeRef}
      className="flex items-start gap-1 rounded border border-border bg-bg-surface px-2 py-1"
      style={style}
    >
      <span
        className="mt-0.5 cursor-grab text-text-dim"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3 w-3" />
      </span>
      <span className="w-6 text-xs text-text-dim">{step.stepIndex + 1}</span>
      <span className="font-mono text-xs uppercase text-accent">{step.step.type}</span>
      <span className="flex-1 truncate text-xs text-text-muted">
        {editing ? (
          <span className="flex items-center gap-1">
            <Input
              className="h-5 text-xs"
              value={editValue}
              onKeyDown={handleKeyDown}
              onChange={(e) => {
                setEditValue(e.target.value);
              }}
            />
            <Button size="icon-xs" variant="ghost" onClick={saveEdit}>
              <Pencil className="h-3 w-3" />
            </Button>
          </span>
        ) : (
          renderDetail(step.step)
        )}
      </span>
      <span className="flex shrink-0 items-center gap-0.5">
        {step.step.type === 'fill' && !editing && (
          <Button size="icon-xs" variant="ghost" onClick={startEdit}>
            <Pencil className="h-3 w-3" />
          </Button>
        )}
        <Button
          size="icon-xs"
          variant="ghost"
          onClick={() => {
            removeStep(step.stepIndex);
          }}
        >
          <Trash2 className="h-3 w-3 text-destructive" />
        </Button>
      </span>
    </div>
  );
}

type DetailRenderer = (step: TestSuiteStep) => string;

const DETAIL_RENDERERS: Record<TestSuiteStep['type'], DetailRenderer> = {
  navigate: (step) => (step.type === 'navigate' ? step.url : ''),
  click: (step) => {
    if (step.type !== 'click') return '';
    if (step.context?.tagName) {
      const label = step.context.label ?? step.context.text ?? '';
      return label ? `${step.context.tagName} "${label.slice(0, 30)}"` : step.context.tagName;
    }
    // Fallback: extract last segment of selector
    const parts = step.selector.split(' > ');
    return parts.at(-1) ?? step.selector;
  },
  fill: (step) => {
    if (step.type !== 'fill') return '';
    const label = step.context?.label ?? step.context?.placeholder ?? '';
    const target = label ? `"${label.slice(0, 20)}"` : step.selector.split(' > ').pop() ?? step.selector;
    return `${target} → "${step.value.slice(0, 30)}"`;
  },
  select: (step) => {
    if (step.type !== 'select') return '';
    const label = step.context?.label ?? '';
    const target = label ? `"${label.slice(0, 20)}"` : step.selector.split(' > ').pop() ?? step.selector;
    return `${target} → ${step.value}`;
  },
  press: (step) => (step.type === 'press' ? step.key : ''),
  wait: (step) => (step.type === 'wait' ? `${String(step.ms)}ms` : ''),
  assert: (step) =>
    step.type === 'assert' ? `${step.selector} = ${step.expected}` : '',
};

function renderDetail(step: TestSuiteStep): string {
  return DETAIL_RENDERERS[step.type](step);
}
