/**
 * ConfigEditDialog — create / edit a TestSuiteConfig in a modal.
 *
 * Mirrors the 5 form fields from SetupCard plus a name field, and persists
 * via useSaveTestSuiteConfig. Used by TestingSettingsTab's Saved Configurations
 * section.
 */

import { useEffect, useState } from 'react';

import type { TestSuiteConfig } from '@shared/ipc/test-suite';

import { useSaveTestSuiteConfig } from '@renderer/features/test-suite/api/useSaveTestSuiteConfig';

import {
  Button,
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
} from '@ui';

type ScreenshotMode = TestSuiteConfig['screenshotMode'];

const SCREENSHOT_MODES: Array<{ value: ScreenshotMode; label: string }> = [
  { value: 'smart', label: 'Smart (recommended)' },
  { value: 'per-click', label: 'Per click' },
  { value: 'per-nav', label: 'Per navigation' },
  { value: 'per-form', label: 'Per form' },
  { value: 'per-assertion', label: 'Per assertion' },
  { value: 'manual', label: 'Manual' },
];

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
    };
  }
  return {
    name: 'new-config',
    targetUrl: 'http://localhost:3000',
    viewportWidth: 1280,
    viewportHeight: 720,
    screenshotMode: 'smart',
    testDirectory: 'test-suite/',
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
              <p className="text-destructive text-xs">{urlError}</p>
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
