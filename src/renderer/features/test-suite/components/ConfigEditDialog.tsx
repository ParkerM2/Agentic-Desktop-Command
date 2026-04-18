/**
 * ConfigEditDialog — create / edit a TestSuiteConfig in a modal.
 *
 * Mirrors the 5 form fields from SetupCard plus a name field, and persists
 * via useSaveTestSuiteConfig. Used by TestingSettingsTab's Saved Configurations
 * section.
 */

import { useEffect, useState } from 'react';

import { Plus, Trash2 } from 'lucide-react';

import type { TestSuiteConfig } from '@shared/ipc/test-suite';
import { TEST_SUITE } from '@shared/ipc/test-suite/channels';

import { useSaveTestSuiteConfig } from '@renderer/features/test-suite/api/useSaveTestSuiteConfig';
import { ipc } from '@renderer/shared/lib/ipc';

import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Text,
} from '@ui';

import { SCREENSHOT_MODES } from '../lib/constants';

type ScreenshotMode = TestSuiteConfig['screenshotMode'];

interface ConfigEditDialogProps {
  projectId: string;
  config: TestSuiteConfig | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FormState {
  name: string;
  targetUrl: string;
  viewportWidth: number;
  viewportHeight: number;
  screenshotMode: ScreenshotMode;
  testDirectory: string;
  browsers: Array<'chromium' | 'firefox' | 'webkit'>;
  workers: number;
  retries: number;
  environments: Array<{ name: string; url: string }>;
}

function defaultsFor(config: TestSuiteConfig | null): FormState {
  if (config) {
    return {
      name: config.name,
      targetUrl: config.targetUrl,
      viewportWidth: config.viewportWidth,
      viewportHeight: config.viewportHeight,
      screenshotMode: config.screenshotMode,
      testDirectory: config.testDirectory,
      browsers: config.browsers,
      workers: config.workers,
      retries: config.retries,
      environments: config.environments,
    };
  }
  return {
    name: 'new-config',
    targetUrl: 'http://localhost:3000',
    viewportWidth: 1280,
    viewportHeight: 720,
    screenshotMode: 'smart',
    testDirectory: 'test-suite/',
    browsers: ['chromium'],
    workers: 1,
    retries: 1,
    environments: [],
  };
}

export function ConfigEditDialog({
  projectId,
  config,
  open,
  onOpenChange,
}: ConfigEditDialogProps) {
  const save = useSaveTestSuiteConfig(projectId);
  const [state, setState] = useState<FormState>(() => defaultsFor(config));
  const [urlError, setUrlError] = useState<string | null>(null);

  // Reset form when opening, or when switching between configs.
  useEffect(() => {
    if (open) {
      setState(defaultsFor(config));
      setUrlError(null);
    }
  }, [open, config]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setState((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      new URL(state.targetUrl);
    } catch {
      setUrlError('Enter a valid URL (e.g. http://localhost:3000)');
      return;
    }
    setUrlError(null);

    const now = new Date().toISOString();
    const merged: TestSuiteConfig = {
      id: config?.id ?? crypto.randomUUID(),
      name: state.name,
      targetUrl: state.targetUrl,
      viewportWidth: state.viewportWidth,
      viewportHeight: state.viewportHeight,
      screenshotMode: state.screenshotMode,
      testDirectory: state.testDirectory,
      saveScreenshotsToTemp: config?.saveScreenshotsToTemp ?? false,
      navigationTimeout: config?.navigationTimeout ?? 30000,
      actionTimeout: config?.actionTimeout ?? 10000,
      browsers: state.browsers,
      workers: state.workers,
      retries: state.retries,
      environments: state.environments,
      activeEnvironment: config?.activeEnvironment,
      storageStatePath: config?.storageStatePath,
      isActive: config?.isActive ?? false,
      createdAt: config?.createdAt ?? now,
      updatedAt: now,
    };

    save.mutate(merged, {
      onSuccess: () => {
        onOpenChange(false);
      },
    });
  };

  const title = config ? 'Edit Configuration' : 'New Configuration';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="config-edit-name">Name</Label>
            <Input
              required
              id="config-edit-name"
              type="text"
              value={state.name}
              onChange={(event) => update('name', event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="config-edit-target-url">Target URL</Label>
            <Input
              required
              id="config-edit-target-url"
              placeholder="http://localhost:3000"
              type="url"
              value={state.targetUrl}
              onChange={(event) => update('targetUrl', event.target.value)}
            />
            {urlError ? (
              <Text size="sm" variant="error">{urlError}</Text>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="config-edit-width">Width</Label>
              <Input
                required
                id="config-edit-width"
                min={320}
                type="number"
                value={state.viewportWidth}
                onChange={(event) =>
                  update('viewportWidth', Number(event.target.value))
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="config-edit-height">Height</Label>
              <Input
                required
                id="config-edit-height"
                min={240}
                type="number"
                value={state.viewportHeight}
                onChange={(event) =>
                  update('viewportHeight', Number(event.target.value))
                }
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="config-edit-mode">Screenshot Mode</Label>
            <Select
              value={state.screenshotMode}
              onValueChange={(value) =>
                update('screenshotMode', value as ScreenshotMode)
              }
            >
              <SelectTrigger aria-label="Screenshot mode" id="config-edit-mode">
                <SelectValue placeholder="Select a mode" />
              </SelectTrigger>
              <SelectContent>
                {SCREENSHOT_MODES.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Browsers</Label>
            <div className="flex gap-3">
              {(['chromium', 'firefox', 'webkit'] as const).map((b) => (
                <label key={b} className="flex items-center gap-1.5 text-sm">
                  <Checkbox
                    checked={state.browsers.includes(b)}
                    onCheckedChange={(checked) => {
                      if (checked === true) update('browsers', [...state.browsers, b]);
                      else update('browsers', state.browsers.filter((x) => x !== b));
                    }}
                  />
                  {b.charAt(0).toUpperCase() + b.slice(1)}
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="config-edit-workers">Parallel Workers</Label>
            <Input
              id="config-edit-workers"
              max={16}
              min={1}
              type="number"
              value={state.workers}
              onChange={(e) => update('workers', Number(e.target.value))}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="config-edit-retries">Retries on Failure</Label>
            <Input
              id="config-edit-retries"
              max={5}
              min={0}
              type="number"
              value={state.retries}
              onChange={(e) => update('retries', Number(e.target.value))}
            />
            <Text size="sm" variant="muted">Number of times to retry a failed test (0 = no retries)</Text>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Environments</Label>
            {state.environments.map((env, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <div key={`env-${i}`} className="flex gap-2">
                <Input
                  placeholder="Name (e.g. staging)"
                  value={env.name}
                  onChange={(e) => {
                    const envs = [...state.environments];
                    envs[i] = { ...envs[i], name: e.target.value };
                    update('environments', envs);
                  }}
                />
                <Input
                  placeholder="https://staging.example.com"
                  value={env.url}
                  onChange={(e) => {
                    const envs = [...state.environments];
                    envs[i] = { ...envs[i], url: e.target.value };
                    update('environments', envs);
                  }}
                />
                <Button
                  size="sm"
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    update('environments', state.environments.filter((_, j) => j !== i));
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
            <Button
              size="sm"
              type="button"
              variant="outline"
              onClick={() => {
                update('environments', [...state.environments, { name: '', url: '' }]);
              }}
            >
              <Plus className="h-3 w-3 mr-1" /> Add Environment
            </Button>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Auth State (storageState)</Label>
            {config?.storageStatePath ? (
              <div className="flex items-center gap-2">
                <Text className="flex-1 truncate rounded-md border border-border bg-bg-surface px-3 py-1.5" size="sm">
                  {config.storageStatePath}
                </Text>
                <Button
                  size="sm"
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    void ipc(TEST_SUITE.AUTH.CLEAR, { projectId });
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                type="button"
                variant="outline"
                onClick={() => {
                  void ipc(TEST_SUITE.AUTH.SAVE, { projectId });
                }}
              >
                Capture Auth State
              </Button>
            )}
            <Text size="sm" variant="muted">
              Saves browser cookies and localStorage for authenticated test runs.
            </Text>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="config-edit-directory">Test Directory</Label>
            <Input
              required
              id="config-edit-directory"
              type="text"
              value={state.testDirectory}
              onChange={(event) => update('testDirectory', event.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button disabled={save.isPending} type="submit">
              {save.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
