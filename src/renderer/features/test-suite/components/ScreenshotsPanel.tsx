/**
 * ScreenshotsPanel — Thumbnail strip + large preview + Copy/Export actions.
 *
 * Shows screenshots captured during a test run. Select a run from the dropdown,
 * browse thumbnails in the left strip, and view a large preview on the right.
 * Copy and Open Folder actions available in the toolbar.
 */

import { useState } from 'react';

import { ImageIcon } from 'lucide-react';

import { TEST_SUITE } from '@shared/ipc/test-suite/channels';

import { useLooseParams } from '@renderer/shared/hooks';
import { ipc } from '@renderer/shared/lib/ipc';

import { EmptyState, Flex, PageContent, Spinner, Stack } from '@ui';

import {
  useBaselines,
  useCompareDiffs,
  useRunDiffs,
  useSetBaseline,
} from '../api/useBaselines';
import { useRuns } from '../api/useRuns';
import { useTestSuiteScreenshots } from '../api/useTestSuiteScreenshots';
import { useTestSuiteScripts } from '../api/useTestSuiteScripts';
import { useTestSuiteStore } from '../test-suite-store';

import { ScreenshotPreview } from './ScreenshotPreview';
import { ScreenshotsToolbar } from './ScreenshotsToolbar';
import { ScreenshotThumbnailStrip } from './ScreenshotThumbnailStrip';

// ─── Types ────────────────────────────────────────────────────

type Sensitivity = 'strict' | 'balanced' | 'relaxed';

// ─── Component ────────────────────────────────────────────────

export function ScreenshotsPanel() {
  const { projectId } = useLooseParams();
  const selectedRunId = useTestSuiteStore((s) => s.selectedRunId);
  const setSelectedRunId = useTestSuiteStore((s) => s.setSelectedRunId);

  const { data: runs, isLoading: runsLoading } = useRuns();
  const { data: scripts } = useTestSuiteScripts(projectId);
  const { data: screenshots, isLoading: screenshotsLoading } = useTestSuiteScreenshots(selectedRunId);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [sensitivity, setSensitivity] = useState<Sensitivity>('balanced');

  const selected = screenshots?.[selectedIndex] ?? null;
  const hasScreenshots = Array.isArray(screenshots) && screenshots.length > 0;

  const { data: baselines } = useBaselines(selected?.scriptId);
  const { data: diffs } = useRunDiffs(selectedRunId ?? undefined);
  const setBaseline = useSetBaseline();
  const compareDiffs = useCompareDiffs();

  const currentDiff = selected ? (diffs?.find((d) => d.screenshotId === selected.id) ?? null) : null;
  const currentBaseline = selected ? (baselines?.find((b) => b.stepIndex === selected.stepIndex) ?? null) : null;

  // ── Actions ──────────────────────────────────────────────────

  async function handleOpenFolder() {
    if (!selectedRunId) return;
    await ipc(TEST_SUITE.SCREENSHOT['EXPORT-ZIP'], { runId: selectedRunId });
  }

  async function handleCopy() {
    if (!selected) return;
    const tempDest = `${selected.filePath}.clipboard.png`;
    await ipc(TEST_SUITE.SCREENSHOT.COPY, { id: selected.id, destPath: tempDest });
  }

  function handleSetBaseline() {
    if (!selected) return;
    setBaseline.mutate({ scriptId: selected.scriptId, screenshotId: selected.id });
  }

  function handleCompare() {
    if (!selectedRunId) return;
    compareDiffs.mutate({ runId: selectedRunId, sensitivity });
  }

  function handleRunChange(runId: string | null) {
    setSelectedRunId(runId);
    setSelectedIndex(0);
  }

  // ── Loading state ─────────────────────────────────────────────

  if (runsLoading) {
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
    if (selectedRunId === null) {
      return (
        <EmptyState
          description="Select a test run from the dropdown to view its screenshots."
          icon={ImageIcon}
          title="No run selected"
        />
      );
    }

    if (screenshotsLoading) {
      return (
        <Flex align="center" className="flex-1" justify="center">
          <Spinner size="md" />
        </Flex>
      );
    }

    if (!hasScreenshots || selected === null) {
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
          screenshots={screenshots}
          selectedIndex={selectedIndex}
          onSelect={setSelectedIndex}
        />
        <ScreenshotPreview
          baseline={currentBaseline}
          diff={currentDiff}
          screenshot={selected}
        />
      </Flex>
    );
  }

  // ── Render ────────────────────────────────────────────────────

  return (
    <PageContent>
      <Stack className="h-full p-4" gap="md">
        <ScreenshotsToolbar
          compareDisabled={!selectedRunId || !hasScreenshots}
          copyDisabled={selected === null}
          isComparePending={compareDiffs.isPending}
          isSetBaselinePending={setBaseline.isPending}
          openFolderDisabled={!selectedRunId || !hasScreenshots}
          selectedRunId={selectedRunId}
          sensitivity={sensitivity}
          setBaselineDisabled={selected === null}
          runs={(runs ?? []).map((r) => ({
            id: r.id,
            status: r.status,
            startedAt: r.startedAt,
            scriptName: scripts?.find((s) => s.id === r.scriptId)?.name,
          }))}
          onCompare={handleCompare}
          onCopy={() => void handleCopy()}
          onOpenFolder={() => void handleOpenFolder()}
          onRunChange={handleRunChange}
          onSensitivityChange={setSensitivity}
          onSetBaseline={handleSetBaseline}
        />
        {renderContent()}
      </Stack>
    </PageContent>
  );
}
