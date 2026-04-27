/**
 * ScreenshotsPanel — Thumbnail strip + large preview + Copy/Export actions.
 *
 * Shows screenshots captured during a test run. Select a run from the dropdown,
 * browse thumbnails in the left strip, and view a large preview on the right.
 * Copy and Open Folder actions available in the toolbar.
 */

import { ImageIcon } from 'lucide-react';

import { EmptyState, Flex, PageContent, Spinner, Stack } from '@ui';

import { ScreenshotPreview } from '../ScreenshotPreview';
import { ScreenshotsToolbar } from '../ScreenshotsToolbar';
import { ScreenshotThumbnailStrip } from '../ScreenshotThumbnailStrip';

import { useScreenshotsPanel } from './useScreenshotsPanel';

export function ScreenshotsPanel() {
  const vm = useScreenshotsPanel();

  // ── Loading state ─────────────────────────────────────────────

  if (vm.runsLoading) {
    return (
      <PageContent>
        <Flex align="center" className="p-12" justify="center">
          <Spinner size="md" />
        </Flex>
      </PageContent>
    );
  }

  // ── Content area (extracted to avoid nested ternaries) ────────

  function renderContent() {
    if (vm.selectedRunId === null) {
      return (
        <EmptyState
          description="Select a test run from the dropdown to view its screenshots."
          icon={ImageIcon}
          title="No run selected"
        />
      );
    }

    if (vm.screenshotsLoading) {
      return (
        <Flex align="center" className="flex-1" justify="center">
          <Spinner size="md" />
        </Flex>
      );
    }

    if (!vm.hasScreenshots || vm.selected === null) {
      return (
        <EmptyState
          description="This run has no screenshots captured."
          icon={ImageIcon}
          title="No screenshots"
        />
      );
    }

    return (
      <Flex className="flex-1 overflow-hidden" gap="md" wrap="nowrap">
        <ScreenshotThumbnailStrip
          screenshots={vm.screenshots ?? []}
          selectedIndex={vm.selectedIndex}
          onSelect={vm.setSelectedIndex}
        />
        <ScreenshotPreview
          baseline={vm.currentBaseline}
          diff={vm.currentDiff}
          screenshot={vm.selected}
        />
      </Flex>
    );
  }

  // ── Render ────────────────────────────────────────────────────

  return (
    <PageContent>
      <Stack className="h-full p-4" gap="md">
        <ScreenshotsToolbar
          compareDisabled={!vm.selectedRunId || !vm.hasScreenshots}
          copyDisabled={vm.selected === null}
          isComparePending={vm.isComparePending}
          isSetBaselinePending={vm.isSetBaselinePending}
          openFolderDisabled={!vm.selectedRunId || !vm.hasScreenshots}
          runs={vm.runOptions}
          selectedRunId={vm.selectedRunId}
          sensitivity={vm.sensitivity}
          setBaselineDisabled={vm.selected === null}
          onCompare={vm.handleCompare}
          onCopy={() => void vm.handleCopy()}
          onOpenFolder={() => void vm.handleOpenFolder()}
          onRunChange={vm.handleRunChange}
          onSensitivityChange={vm.setSensitivity}
          onSetBaseline={vm.handleSetBaseline}
        />
        {renderContent()}
      </Stack>
    </PageContent>
  );
}
