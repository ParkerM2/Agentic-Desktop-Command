/**
 * ScreenshotPreview — Large preview pane for a selected screenshot.
 *
 * Renders the full-size screenshot image, an optional diff viewer when a
 * baseline comparison exists, and a metadata bar at the bottom.
 */

import { Flex, ScrollArea, Stack, Text } from '@ui';

import { DiffViewer } from './DiffViewer';
import { fileUrl } from '../lib/screenshot-utils';

// ─── Types ────────────────────────────────────────────────────

interface ScreenshotPreviewProps {
  baseline: { filePath: string; stepIndex: number } | null;
  diff: {
    diffFilePath: string;
    mismatchPercentage: number;
    screenshotId: string;
    status: string;
  } | null;
  screenshot: {
    capturedAt: string;
    filePath: string;
    id: string;
    scriptId: string;
    stepIndex: number;
    stepLabel: string;
    trigger: string;
  };
}

// ─── Component ────────────────────────────────────────────────

export function ScreenshotPreview({ baseline, diff, screenshot }: ScreenshotPreviewProps) {
  return (
    <Stack
      className="flex-1 overflow-hidden rounded-md border border-border bg-surface-raised p-3"
      gap="sm"
    >
      <ScrollArea className="flex-1">
        <Stack gap="md">
          <img
            alt={screenshot.stepLabel}
            className="mx-auto max-w-full rounded object-contain"
            src={fileUrl(screenshot.filePath)}
          />

          {diff && baseline ? (
            <DiffViewer
              actualPath={screenshot.filePath}
              baselinePath={baseline.filePath}
              diffPath={diff.diffFilePath}
              mismatchPercentage={diff.mismatchPercentage}
              status={diff.status}
            />
          ) : null}
        </Stack>
      </ScrollArea>

      {/* Metadata bar */}
      <Flex
        align="center"
        className="rounded bg-surface px-3 py-2"
        gap="lg"
        wrap="nowrap"
      >
        <Text size="sm" variant="muted">
          Step {screenshot.stepIndex}
        </Text>
        <Text size="sm" variant="muted">
          {screenshot.trigger}
        </Text>
        <Text size="sm" variant="muted">
          {screenshot.stepLabel}
        </Text>
        <Text className="ml-auto" size="sm" variant="muted">
          {new Date(screenshot.capturedAt).toLocaleTimeString()}
        </Text>
      </Flex>
    </Stack>
  );
}
