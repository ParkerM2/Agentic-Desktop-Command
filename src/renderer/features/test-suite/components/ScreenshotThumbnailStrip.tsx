/**
 * ScreenshotThumbnailStrip — Scrollable sidebar of screenshot thumbnails.
 *
 * Renders a vertical list of clickable thumbnails for each screenshot in a run.
 * Highlights the currently selected index with an accent border.
 */

import { Button, ScrollArea, Stack, Text } from '@ui';

import { fileUrl } from '../lib/screenshot-utils';

// ─── Types ────────────────────────────────────────────────────

interface ScreenshotThumbnailStripProps {
  onSelect: (index: number) => void;
  screenshots: Array<{ id: string; filePath: string; stepLabel: string }>;
  selectedIndex: number;
}

// ─── Component ────────────────────────────────────────────────

export function ScreenshotThumbnailStrip({
  onSelect,
  screenshots,
  selectedIndex,
}: ScreenshotThumbnailStripProps) {
  return (
    <ScrollArea className="w-40 shrink-0 rounded-md border border-border bg-surface-raised">
      <Stack className="p-2" gap="sm">
        {screenshots.map((ss, idx) => (
          <Button
            key={ss.id}
            variant="ghost"
            className={`h-auto w-full flex-col overflow-hidden rounded border-2 p-0 transition-colors ${
              idx === selectedIndex
                ? 'border-accent'
                : 'border-transparent hover:border-border-hover'
            }`}
            onClick={() => onSelect(idx)}
          >
            <img
              alt={ss.stepLabel}
              className="h-auto w-full object-cover"
              loading="lazy"
              src={fileUrl(ss.filePath)}
            />
            <Text
              className="w-full truncate px-1 py-0.5 text-center"
              size="sm"
              variant="muted"
            >
              {ss.stepLabel}
            </Text>
          </Button>
        ))}
      </Stack>
    </ScrollArea>
  );
}
