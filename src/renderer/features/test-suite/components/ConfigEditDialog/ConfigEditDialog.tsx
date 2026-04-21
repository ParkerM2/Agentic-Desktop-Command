/**
 * ConfigEditDialog — create / edit a TestSuiteConfig in a modal.
 *
 * Mirrors the 5 form fields from SetupCard plus a name field, and persists
 * via useSaveTestSuiteConfig. Used by TestingSettingsTab's Saved Configurations
 * section.
 */

import { Plus, Trash2 } from 'lucide-react';

import type { TestSuiteConfig } from '@shared/ipc/test-suite';

import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Flex,
  Grid,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Stack,
  Text,
} from '@ui';

import {
  MAX_RETRIES,
  MAX_WORKERS,
  MIN_VIEWPORT_HEIGHT,
  MIN_VIEWPORT_WIDTH,
  SCREENSHOT_MODES,
} from '../../lib/constants';

import { useConfigEditDialog } from './useConfigEditDialog';

type ScreenshotMode = TestSuiteConfig['screenshotMode'];

interface ConfigEditDialogProps {
  projectId: string;
  config: TestSuiteConfig | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConfigEditDialog({
  projectId,
  config,
  open,
  onOpenChange,
}: ConfigEditDialogProps) {
  const vm = useConfigEditDialog({ projectId, config, open, onOpenChange });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{vm.title}</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={vm.handleSubmit}>
          <Stack gap="sm">
            <Label htmlFor="config-edit-name">Name</Label>
            <Input
              required
              id="config-edit-name"
              type="text"
              value={vm.state.name}
              onChange={(event) => vm.update('name', event.target.value)}
            />
          </Stack>

          <Stack gap="sm">
            <Label htmlFor="config-edit-target-url">Target URL</Label>
            <Input
              required
              id="config-edit-target-url"
              placeholder="http://localhost:3000"
              type="url"
              value={vm.state.targetUrl}
              onChange={(event) => vm.update('targetUrl', event.target.value)}
            />
            {vm.urlError ? (
              <Text size="sm" variant="error">{vm.urlError}</Text>
            ) : null}
          </Stack>

          <Grid cols={2} gap="md">
            <Stack gap="sm">
              <Label htmlFor="config-edit-width">Width</Label>
              <Input
                required
                id="config-edit-width"
                min={MIN_VIEWPORT_WIDTH}
                type="number"
                value={vm.state.viewportWidth}
                onChange={(event) =>
                  vm.update('viewportWidth', Number(event.target.value))
                }
              />
            </Stack>
            <Stack gap="sm">
              <Label htmlFor="config-edit-height">Height</Label>
              <Input
                required
                id="config-edit-height"
                min={MIN_VIEWPORT_HEIGHT}
                type="number"
                value={vm.state.viewportHeight}
                onChange={(event) =>
                  vm.update('viewportHeight', Number(event.target.value))
                }
              />
            </Stack>
          </Grid>

          <Stack gap="sm">
            <Label htmlFor="config-edit-mode">Screenshot Mode</Label>
            <Select
              value={vm.state.screenshotMode}
              onValueChange={(value) =>
                vm.update('screenshotMode', value as ScreenshotMode)
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
          </Stack>

          <Stack gap="sm">
            <Label>Browsers</Label>
            <Flex gap="md">
              {(['chromium', 'firefox', 'webkit'] as const).map((b) => (
                <Label key={b} className="flex items-center gap-1.5 text-sm">
                  <Checkbox
                    checked={vm.state.browsers.includes(b)}
                    onCheckedChange={(checked) => vm.handleBrowserToggle(b, checked)}
                  />
                  {b.charAt(0).toUpperCase() + b.slice(1)}
                </Label>
              ))}
            </Flex>
          </Stack>

          <Stack gap="sm">
            <Label htmlFor="config-edit-workers">Parallel Workers</Label>
            <Input
              id="config-edit-workers"
              max={MAX_WORKERS}
              min={1}
              type="number"
              value={vm.state.workers}
              onChange={(e) => vm.update('workers', Number(e.target.value))}
            />
          </Stack>

          <Stack gap="sm">
            <Label htmlFor="config-edit-retries">Retries on Failure</Label>
            <Input
              id="config-edit-retries"
              max={MAX_RETRIES}
              min={0}
              type="number"
              value={vm.state.retries}
              onChange={(e) => vm.update('retries', Number(e.target.value))}
            />
            <Text size="sm" variant="muted">Number of times to retry a failed test (0 = no retries)</Text>
          </Stack>

          <Stack gap="sm">
            <Label>Environments</Label>
            {vm.state.environments.map((env, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <Flex key={`env-${i}`} gap="sm">
                <Input
                  placeholder="Name (e.g. staging)"
                  value={env.name}
                  onChange={(e) => vm.handleEnvironmentNameChange(i, e.target.value)}
                />
                <Input
                  placeholder="https://staging.example.com"
                  value={env.url}
                  onChange={(e) => vm.handleEnvironmentUrlChange(i, e.target.value)}
                />
                <Button
                  size="sm"
                  type="button"
                  variant="ghost"
                  onClick={() => vm.handleRemoveEnvironment(i)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </Flex>
            ))}
            <Button
              size="sm"
              type="button"
              variant="outline"
              onClick={vm.handleAddEnvironment}
            >
              <Plus className="h-3 w-3 mr-1" /> Add Environment
            </Button>
          </Stack>

          <Stack gap="sm">
            <Label>Auth State (storageState)</Label>
            {vm.storageStatePath ? (
              <Flex align="center" gap="sm">
                <Text className="flex-1 truncate rounded-md border border-border bg-bg-surface px-3 py-1.5" size="sm">
                  {vm.storageStatePath}
                </Text>
                <Button
                  size="sm"
                  type="button"
                  variant="ghost"
                  onClick={vm.handleClearAuth}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </Flex>
            ) : (
              <Button
                size="sm"
                type="button"
                variant="outline"
                onClick={vm.handleCaptureAuth}
              >
                Capture Auth State
              </Button>
            )}
            <Text size="sm" variant="muted">
              Saves browser cookies and localStorage for authenticated test runs.
            </Text>
          </Stack>

          <Stack gap="sm">
            <Label htmlFor="config-edit-directory">Test Directory</Label>
            <Input
              required
              id="config-edit-directory"
              type="text"
              value={vm.state.testDirectory}
              onChange={(event) => vm.update('testDirectory', event.target.value)}
            />
          </Stack>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button disabled={vm.saving} type="submit">
              {vm.saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
