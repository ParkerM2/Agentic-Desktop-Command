/**
 * useTimeBlockEditor — logic for TimeBlockEditor
 */

import { useState } from 'react';

import type { TimeBlock } from '@shared/types';

export function useTimeBlockEditor(editingBlock?: TimeBlock) {
  const [startTime, setStartTime] = useState(editingBlock?.startTime ?? '09:00');
  const [endTime, setEndTime] = useState(editingBlock?.endTime ?? '10:00');
  const [label, setLabel] = useState(editingBlock?.label ?? '');
  const [blockType, setBlockType] = useState<TimeBlock['type']>(editingBlock?.type ?? 'focus');

  return {
    startTime,
    endTime,
    label,
    blockType,
    setStartTime,
    setEndTime,
    setLabel,
    setBlockType,
  };
}
