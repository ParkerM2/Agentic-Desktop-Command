/**
 * ScreenshotsPanel — Thumbnail strip + large preview + Copy/Export actions
 *
 * Shows screenshots captured during a test run. Select a run from the dropdown,
 * browse thumbnails in the left strip, and view a large preview on the right.
 * Copy and Open Folder actions available in the toolbar.
 */

import { useState } from 'react';

import { Copy, FolderOpen, ImageIcon } from 'lucide-react';

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

import { useRuns } from '../api/useRuns';
import { useTestSuiteScreenshots } from '../api/useTestSuiteScreenshots';
import { useTestSuiteStore } from '../test-suite-store';

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

  const selected = screenshots?.[selectedIndex] ?? null;
  const hasScreenshots = Array.isArray(screenshots) && screenshots.length > 0;

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
          <div className="flex-1 overflow-auto">
            <img
              alt={selected.stepLabel}
              className="mx-auto max-h-full max-w-full rounded object-contain"
              src={fileUrl(selected.filePath)}
            />
          </div>

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
