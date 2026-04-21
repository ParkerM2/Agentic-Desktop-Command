import { useState } from 'react';

import { TEST_SUITE } from '@shared/ipc/test-suite/channels';

import { useLooseParams } from '@renderer/shared/hooks';
import { ipc } from '@renderer/shared/lib/ipc';

import {
  useBaselines,
  useCompareDiffs,
  useRunDiffs,
  useSetBaseline,
} from '../../api/useBaselines';
import { useRuns } from '../../api/useRuns';
import { useTestSuiteScreenshots } from '../../api/useTestSuiteScreenshots';
import { useTestSuiteScripts } from '../../api/useTestSuiteScripts';
import { useTestSuiteStore } from '../../test-suite-store';

type Sensitivity = 'strict' | 'balanced' | 'relaxed';

export function useScreenshotsPanel() {
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

  // Build run options for toolbar
  const runOptions = (runs ?? []).map((r) => ({
    id: r.id,
    status: r.status,
    startedAt: r.startedAt,
    scriptName: scripts?.find((s) => s.id === r.scriptId)?.name,
  }));

  return {
    runsLoading,
    screenshotsLoading,
    selectedRunId,
    screenshots,
    selected,
    hasScreenshots,
    selectedIndex,
    setSelectedIndex,
    sensitivity,
    setSensitivity,
    currentDiff,
    currentBaseline,
    runOptions,
    isComparePending: compareDiffs.isPending,
    isSetBaselinePending: setBaseline.isPending,
    handleOpenFolder,
    handleCopy,
    handleSetBaseline,
    handleCompare,
    handleRunChange,
  };
}
