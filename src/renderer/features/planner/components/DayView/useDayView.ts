/**
 * useDayView — logic for DayView
 */

import { useState } from 'react';

import type { TimeBlock } from '@shared/types';

import { usePlannerUI } from '../../store';

export function useDayView(
  timeBlocks: TimeBlock[],
  onAdd: (block: Omit<TimeBlock, 'id'>) => void,
  onUpdate: (blockId: string, updates: Partial<Omit<TimeBlock, 'id'>>) => void,
) {
  const [showEditor, setShowEditor] = useState(false);
  const [editingBlock, setEditingBlock] = useState<TimeBlock | undefined>();
  const { showCalendarOverlay, setShowCalendarOverlay } = usePlannerUI();

  const sorted = [...timeBlocks].sort((a, b) => a.startTime.localeCompare(b.startTime));

  function handleSave(block: Omit<TimeBlock, 'id'>) {
    if (editingBlock) {
      onUpdate(editingBlock.id, block);
    } else {
      onAdd(block);
    }
    setShowEditor(false);
    setEditingBlock(undefined);
  }

  function handleEdit(block: TimeBlock) {
    setEditingBlock(block);
    setShowEditor(true);
  }

  function handleCancel() {
    setShowEditor(false);
    setEditingBlock(undefined);
  }

  function handleToggleCalendar() {
    setShowCalendarOverlay(!showCalendarOverlay);
  }

  return {
    showEditor,
    setShowEditor,
    editingBlock,
    showCalendarOverlay,
    sorted,
    handleSave,
    handleEdit,
    handleCancel,
    handleToggleCalendar,
  };
}
