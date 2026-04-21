import { useState } from 'react';

interface ScreenshotItem {
  id: string;
  stepIndex: number;
  stepLabel: string;
  trigger: string;
  filePath: string;
  capturedAt: string;
}

export function useScreenshotGallery(screenshots: ScreenshotItem[]) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = screenshots.find((s) => s.id === selectedId) ?? null;

  const clearSelection = () => setSelectedId(null);

  return {
    selectedId,
    setSelectedId,
    selected,
    clearSelection,
  };
}
