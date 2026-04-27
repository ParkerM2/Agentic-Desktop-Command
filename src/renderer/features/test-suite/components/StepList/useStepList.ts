import { useState } from 'react';

import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';

import type { TestSuiteStep } from '@shared/types/test-suite';

import { useTestSuiteStore } from '../../test-suite-store';

import type { RecordedStep } from '../../test-suite-store';
import type { DragEndEvent } from '@dnd-kit/core';

export function useStepList() {
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

  return {
    steps,
    sensors,
    handleDragEnd,
  };
}

export function useSortableStepItem(step: RecordedStep) {
  const removeStep = useTestSuiteStore((s) => s.removeStep);
  const updateStep = useTestSuiteStore((s) => s.updateStep);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');

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

  const handleRemove = () => {
    removeStep(step.stepIndex);
  };

  return {
    editing,
    editValue,
    setEditValue,
    startEdit,
    saveEdit,
    handleKeyDown,
    handleRemove,
  };
}

// ─── Detail renderers ──────────────────────────────────────────

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

export function renderDetail(step: TestSuiteStep): string {
  return DETAIL_RENDERERS[step.type](step);
}
