/**
 * ScreenshotsPanel — Thumbnail strip + large preview + Copy/Export actions
 *
 * Shows screenshots captured during a test run. Select a run from the dropdown,
 * browse thumbnails in the left strip, and view a large preview on the right.
 * Copy and Open Folder actions available in the toolbar.
 */

import { useState } from 'react';

import { Copy, FolderOpen, GitCompare, ImageIcon, Target } from 'lucide-react';

import { TEST_SUITE } from '@shared/ipc/test-suite/channels';

import { ipc } from '@renderer/shared/lib/ipc';

import {
  Button,
  EmptyState,
  PageContent,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
  Text,
} from '@ui';

import {
  useBaselines,
  useCompareDiffs,
  useRunDiffs,
  useSetBaseline,
} from '../api/useBaselines';
import { useRuns } from '../api/useRuns';
import { useTestSuiteScreenshots } from '../api/useTestSuiteScreenshots';
import { useTestSuiteStore } from '../test-suite-store';

import { DiffViewer } from './DiffViewer';

type Sensitivity = 'strict' | 'balanced' | 'relaxed';

// ─── Helpers ──────────────────────────────────────────────────

/** Convert a local file path to a file:// URL that works in Electron img tags */
function fileUrl(fp: string): string {
  return `file://${fp.replaceAll('\\', '/')}`;
}

// ─── Sub-components ───────────────────────────────────────────

function LoadingSpinner() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <Spinner size="md" />
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────

export function ScreenshotsPanel() {
  const selectedRunId = useTestSuiteStore((s) => s.selectedRunId);
  const setSelectedRunId = useTestSuiteStore((s) => s.setSelectedRunId);

  const { data: runs, isLoading: runsLoading } = useRuns();
  const { data: screenshots, isLoading: screenshotsLoading } = useTestSuiteScreenshots(selectedRunId);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [sensitivity, setSensitivity] = useState<Sensitivity>('balanced');

  const selected = screenshots?.[selectedIndex] ?? null;
  const hasScreenshots = Array.isArray(screenshots) && screenshots.length > 0;

  const { data: baselines } = useBaselines(selected?.scriptId);
  const { data: diffs } = useRunDiffs(selectedRunId ?? undefined);
  const setBaseline = useSetBaseline();
  const compareDiffs = useCompareDiffs();

  const currentDiff = selected
    ? diffs?.find((d) => d.screenshotId === selected.id) ?? null
    : null;
  const currentBaseline = selected
    ? baselines?.find((b) => b.stepIndex === selected.stepIndex) ?? null
    : null;

  // ── Actions ───────────────────────────────────────────────────

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

  // ── Loading state ─────────────────────────────────────────────

  if (runsLoading) {
    return (
      <PageContent>
        <div className="flex items-center justify-center p-12">
          <Spinner size="md" />
        </div>
      </PageContent>
    );
  }

  // ── Content resolver ──────────────────────────────────────────

  function renderContent() {
    if (!selectedRunId) {
      return (
        <EmptyState
          description="Select a test run from the dropdown to view its screenshots."
          icon={ImageIcon}
          title="No run selected"
        />
      );
    }

    if (screenshotsLoading) {
      return <LoadingSpinner />;
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
      <div className="flex flex-1 gap-3 overflow-hidden">
        {/* Thumbnail strip */}
        <ScrollArea className="w-40 shrink-0 rounded-md border border-border bg-surface-raised">
          <div className="flex flex-col gap-1.5 p-2">
            {screenshots.map((ss, idx) => (
              <Button
                key={ss.id}
                variant="ghost"
                className={`h-auto w-full flex-col overflow-hidden rounded border-2 p-0 transition-colors ${
                  idx === selectedIndex
                    ? 'border-accent'
                    : 'border-transparent hover:border-border-hover'
                }`}
                onClick={() => setSelectedIndex(idx)}
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
          </div>
        </ScrollArea>

        {/* Large preview */}
        <div className="flex flex-1 flex-col gap-2 overflow-hidden rounded-md border border-border bg-surface-raised p-3">
          <ScrollArea className="flex-1">
            <div className="flex flex-col gap-3">
              <img
                alt={selected.stepLabel}
                className="mx-auto max-w-full rounded object-contain"
                src={fileUrl(selected.filePath)}
              />

              {/* Diff viewer — visible when a diff record + baseline exist for this screenshot */}
              {currentDiff && currentBaseline ? (
                <DiffViewer
                  actualPath={selected.filePath}
                  baselinePath={currentBaseline.filePath}
                  diffPath={currentDiff.diffFilePath}
                  mismatchPercentage={currentDiff.mismatchPercentage}
                  status={currentDiff.status}
                />
              ) : null}
            </div>
          </ScrollArea>

          {/* Metadata overlay */}
          <div className="flex items-center gap-4 rounded bg-surface px-3 py-2">
            <Text size="sm" variant="muted">
              Step {selected.stepIndex}
            </Text>
            <Text size="sm" variant="muted">
              {selected.trigger}
            </Text>
            <Text size="sm" variant="muted">
              {selected.stepLabel}
            </Text>
            <Text className="ml-auto" size="sm" variant="muted">
              {new Date(selected.capturedAt).toLocaleTimeString()}
            </Text>
          </div>
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────

  return (
    <PageContent>
      <div className="flex h-full flex-col gap-3 p-4">
        {/* Toolbar */}
        <div className="flex items-center gap-3">
          <Select
            value={selectedRunId ?? ''}
            onValueChange={(val) => {
              setSelectedRunId(val || null);
              setSelectedIndex(0);
            }}
          >
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select a run..." />
            </SelectTrigger>
            <SelectContent>
              {(runs ?? []).map((run) => (
                <SelectItem key={run.id} value={run.id}>
                  {run.id.slice(0, 8)} — {run.status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="ml-auto flex items-center gap-2">
            <Button
              disabled={selected === null || setBaseline.isPending}
              size="sm"
              variant="outline"
              onClick={handleSetBaseline}
            >
              <Target className="mr-1.5 h-4 w-4" />
              Set as Baseline
            </Button>
            <Button
              disabled={!selectedRunId || !hasScreenshots || compareDiffs.isPending}
              size="sm"
              variant="outline"
              onClick={handleCompare}
            >
              <GitCompare className="mr-1.5 h-4 w-4" />
              Compare to Baseline
            </Button>
            <Select
              value={sensitivity}
              onValueChange={(val) => setSensitivity(val as Sensitivity)}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="strict">Strict</SelectItem>
                <SelectItem value="balanced">Balanced</SelectItem>
                <SelectItem value="relaxed">Relaxed</SelectItem>
              </SelectContent>
            </Select>
            <Button
              disabled={selected === null}
              size="sm"
              variant="outline"
              onClick={() => void handleCopy()}
            >
              <Copy className="mr-1.5 h-4 w-4" />
              Copy
            </Button>
            <Button
              disabled={!selectedRunId || !hasScreenshots}
              size="sm"
              variant="outline"
              onClick={() => void handleOpenFolder()}
            >
              <FolderOpen className="mr-1.5 h-4 w-4" />
              Open Folder
            </Button>
          </div>
        </div>

        {/* Content area */}
        {renderContent()}
      </div>
    </PageContent>
  );
}
