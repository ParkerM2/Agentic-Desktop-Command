import { useState } from 'react';

type ViewMode = 'side-by-side' | 'slider' | 'diff-only';

function getStatusColor(status: string): string {
  if (status === 'match') return 'bg-green-600';
  if (status === 'mismatch') return 'bg-destructive';
  return 'bg-yellow-600';
}

interface UseDiffViewerProps {
  status: string;
}

export function useDiffViewer({ status }: UseDiffViewerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('side-by-side');
  const [sliderPosition, setSliderPosition] = useState<number[]>([50]);

  const statusColor = getStatusColor(status);
  const sliderValue = sliderPosition[0] ?? 50;

  return {
    viewMode,
    setViewMode,
    sliderPosition,
    setSliderPosition,
    statusColor,
    sliderValue,
  };
}
