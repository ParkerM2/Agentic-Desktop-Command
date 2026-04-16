/**
 * TestingSettingsTab — Test Suite configuration surface.
 *
 * Three stacked sections bound to the active project's TestSuiteConfig:
 *   1. Test Environment — target URL + test directory
 *   2. BrowserView Dimensions — viewport width/height
 *   3. Screenshot Capture — capture mode + temp-folder toggle
 *
 * Writes echo the FULL config object (contract requires a complete shape)
 * and are debounced 300ms via the renderer-local useDebounce hook.
 */

import { useEffect, useState } from 'react';

import { Trash2 } from 'lucide-react';

import type { TestSuiteConfig } from '@shared/ipc/test-suite';

import { useDeleteTestSuiteConfig } from '@renderer/features/test-suite/api/useDeleteTestSuiteConfig';
import { useSaveTestSuiteConfig } from '@renderer/features/test-suite/api/useSaveTestSuiteConfig';
import { useSetActiveTestSuiteConfig } from '@renderer/features/test-suite/api/useSetActiveTestSuiteConfig';
import { useTestSuiteConfig } from '@renderer/features/test-suite/api/useTestSuiteConfig';
import { useTestSuiteConfigs } from '@renderer/features/test-suite/api/useTestSuiteConfigs';
import { ConfigEditDialog } from '@renderer/features/test-suite/components/ConfigEditDialog';
import { useDebounce } from '@renderer/shared/hooks/useDebounce';
import { cn } from '@renderer/shared/lib/utils';
import { useLayoutStore } from '@renderer/shared/stores';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  Input,
  Label,
  PageContent,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from '@ui';

type ScreenshotMode = TestSuiteConfig['screenshotMode'];

const SCREENSHOT_MODE_OPTIONS: Array<{ value: ScreenshotMode; label: string }> = [
  { value: 'smart', label: 'Smart (nav + forms + assertions)' },
  { value: 'per-click', label: 'Every click' },
  { value: 'per-nav', label: 'Every navigation' },
  { value: 'per-form', label: 'Every form submit' },
  { value: 'per-assertion', label: 'Every assertion' },
  { value: 'manual', label: 'Manual only' },
];

interface EditableFields {
  targetUrl: string;
  testDirectory: string;
  viewportWidth: number;
  viewportHeight: number;
  screenshotMode: ScreenshotMode;
  saveScreenshotsToTemp: boolean;
}

function toBuffer(config: TestSuiteConfig): EditableFields {
  return {
    targetUrl: config.targetUrl,
    testDirectory: config.testDirectory,
    viewportWidth: config.viewportWidth,
    viewportHeight: config.viewportHeight,
    screenshotMode: config.screenshotMode,
    saveScreenshotsToTemp: config.saveScreenshotsToTemp,
  };
}

function bufferMatchesConfig(buffer: EditableFields, config: TestSuiteConfig): boolean {
  return (
    buffer.targetUrl === config.targetUrl &&
    buffer.testDirectory === config.testDirectory &&
    buffer.viewportWidth === config.viewportWidth &&
    buffer.viewportHeight === config.viewportHeight &&
    buffer.screenshotMode === config.screenshotMode &&
    buffer.saveScreenshotsToTemp === config.saveScreenshotsToTemp
  );
}

export function TestingSettingsTab() {
  const activeProjectId = useLayoutStore((s) => s.activeProjectId);
  const { data: config } = useTestSuiteConfig(activeProjectId);
  const save = useSaveTestSuiteConfig(activeProjectId ?? '');
  const { data: configs } = useTestSuiteConfigs(activeProjectId ?? '');
  const setActive = useSetActiveTestSuiteConfig(activeProjectId ?? '');
  const del = useDeleteTestSuiteConfig(activeProjectId ?? '');
  const [editingId, setEditingId] = useState<string | null>(null);

  const [buffer, setBuffer] = useState<EditableFields | null>(
    config ? toBuffer(config) : null,
  );

  // Pull fresh server values into buffer when upstream config identity changes
  // (first load, external edit). Keyed off `updatedAt` so local edits don't stomp.
  useEffect(() => {
    if (!config) return;
    setBuffer(toBuffer(config));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config?.id, config?.updatedAt]);

  const debouncedBuffer = useDebounce(buffer, 300);

  useEffect(() => {
    if (!debouncedBuffer || !config || !activeProjectId) return;
    if (bufferMatchesConfig(debouncedBuffer, config)) return;

    const merged: TestSuiteConfig = {
      ...config,
      ...debouncedBuffer,
      updatedAt: new Date().toISOString(),
    };
    save.mutate(merged);
    // `save` is a stable mutation object; only buffer/config identity drive the write.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedBuffer, config?.id, config?.updatedAt, activeProjectId]);

  if (!activeProjectId) {
    return (
      <PageContent>
        <div className="p-6 text-text-muted">No project selected.</div>
      </PageContent>
    );
  }

  if (!config || !buffer) {
    return (
      <PageContent>
        <div className="p-6 text-text-muted">
          No test suite configuration yet. Run setup first in Test Suite.
        </div>
      </PageContent>
    );
  }

  const update = <K extends keyof EditableFields>(key: K, value: EditableFields[K]) => {
    setBuffer((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  return (
    <PageContent>
      <div className="mx-auto max-w-[720px] space-y-6 p-6">
        {/* ── Section 1: Test Environment ───────────────────────────── */}
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold uppercase text-text-muted">
              Test Environment
            </h2>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="testing-target-url">Default Target URL</Label>
              <Input
                id="testing-target-url"
                placeholder="http://localhost:3000"
                type="url"
                value={buffer.targetUrl}
                onChange={(event) => update('targetUrl', event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="testing-test-directory">Test Directory</Label>
              <Input
                id="testing-test-directory"
                type="text"
                value={buffer.testDirectory}
                onChange={(event) => update('testDirectory', event.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Section 2: BrowserView Dimensions ─────────────────────── */}
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold uppercase text-text-muted">
              BrowserView Dimensions
            </h2>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="testing-viewport-width">Width</Label>
                <Input
                  id="testing-viewport-width"
                  min={320}
                  type="number"
                  value={buffer.viewportWidth}
                  onChange={(event) =>
                    update('viewportWidth', Number(event.target.value))
                  }
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="testing-viewport-height">Height</Label>
                <Input
                  id="testing-viewport-height"
                  min={240}
                  type="number"
                  value={buffer.viewportHeight}
                  onChange={(event) =>
                    update('viewportHeight', Number(event.target.value))
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Section 3: Screenshot Capture ─────────────────────────── */}
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold uppercase text-text-muted">
              Screenshot Capture
            </h2>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="testing-screenshot-mode">Default Mode</Label>
              <Select
                value={buffer.screenshotMode}
                onValueChange={(value) =>
                  update('screenshotMode', value as ScreenshotMode)
                }
              >
                <SelectTrigger aria-label="Screenshot mode" id="testing-screenshot-mode">
                  <SelectValue placeholder="Select a mode" />
                </SelectTrigger>
                <SelectContent>
                  {SCREENSHOT_MODE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="testing-save-temp">Save to temp folder</Label>
              <Switch
                checked={buffer.saveScreenshotsToTemp}
                id="testing-save-temp"
                onCheckedChange={(checked) => update('saveScreenshotsToTemp', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Section 4: Saved Configurations ───────────────────────── */}
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold uppercase text-text-muted">
              Saved Configurations
            </h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(configs ?? []).map((c) => (
                  <Card
                    key={c.id}
                    className={cn(
                      'flex items-center gap-3 p-3',
                      c.isActive && 'border-accent',
                    )}
                  >
                    <div className="flex flex-1 flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{c.name}</span>
                        {c.isActive ? <Badge>Active</Badge> : null}
                      </div>
                      <span className="text-text-muted text-xs">
                        {c.targetUrl} · {c.viewportWidth}×{c.viewportHeight} ·{' '}
                        {c.screenshotMode}
                      </span>
                    </div>
                    {c.isActive ? null : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setActive.mutate(c.id)}
                      >
                        Use
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingId(c.id)}
                    >
                      Edit
                    </Button>
                    <Button
                      aria-label="Delete"
                      disabled={c.isActive}
                      size="sm"
                      variant="ghost"
                      onClick={() => del.mutate(c.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </Card>
              ))}
              <Button variant="ghost" onClick={() => setEditingId('new')}>
                + Add Configuration
              </Button>
            </div>
          </CardContent>
        </Card>

        <ConfigEditDialog
          open={editingId !== null}
          projectId={activeProjectId}
          config={
            editingId && editingId !== 'new'
              ? (configs ?? []).find((c) => c.id === editingId) ?? null
              : null
          }
          onOpenChange={(o) => {
            if (!o) setEditingId(null);
          }}
        />
      </div>
    </PageContent>
  );
}
