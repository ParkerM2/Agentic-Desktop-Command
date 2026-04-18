import { useState } from 'react';

import type { TestSuiteConfig } from '@shared/ipc/test-suite';
import { TEST_SUITE } from '@shared/ipc/test-suite/channels';

import { ipc } from '@renderer/shared/lib/ipc';

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  PageContent,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Text,
} from '@ui';

import { useSaveTestSuiteConfig } from '../api/useSaveTestSuiteConfig';
import { SCREENSHOT_MODES } from '../lib/constants';
import {
  DEFAULT_CONFIG_SCREENSHOT_MODE,
  DEFAULT_CONFIG_TARGET_URL,
  DEFAULT_CONFIG_TEST_DIRECTORY,
  DEFAULT_CONFIG_VIEWPORT_HEIGHT,
  DEFAULT_CONFIG_VIEWPORT_WIDTH,
} from '../lib/starter-test';

function buttonLabel(settingUp: boolean, saving: boolean): string {
  if (settingUp) return 'Setting up...';
  if (saving) return 'Saving...';
  return 'Save & Start Recording';
}

interface SetupCardProps {
  projectId: string;
}

type ScreenshotMode = TestSuiteConfig['screenshotMode'];

export function SetupCard({ projectId }: SetupCardProps) {
  const save = useSaveTestSuiteConfig(projectId);

  const [targetUrl, setTargetUrl] = useState(DEFAULT_CONFIG_TARGET_URL);
  const [width, setWidth] = useState(DEFAULT_CONFIG_VIEWPORT_WIDTH);
  const [height, setHeight] = useState(DEFAULT_CONFIG_VIEWPORT_HEIGHT);
  const [mode, setMode] = useState<ScreenshotMode>(DEFAULT_CONFIG_SCREENSHOT_MODE);
  const [testDirectory, setTestDirectory] = useState(DEFAULT_CONFIG_TEST_DIRECTORY);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [setupStatus, setSetupStatus] = useState<string | null>(null);
  const [isSettingUp, setIsSettingUp] = useState(false);

  const handleSubmit = (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();

    let parsedHostname: string;
    try {
      ({ hostname: parsedHostname } = new URL(targetUrl));
    } catch {
      setUrlError('Enter a valid URL (e.g. http://localhost:3000)');
      return;
    }
    setUrlError(null);
    setIsSettingUp(true);
    setSetupStatus('Installing Playwright dependencies...');

    void (async () => {
      try {
        const result = await ipc(TEST_SUITE.SETUP['ENSURE-DEPS'], { projectId });
        if (!result.installed) {
          setSetupStatus(`Failed to install Playwright: ${result.error ?? 'Unknown error'}`);
          setIsSettingUp(false);
          return;
        }
        setSetupStatus(result.alreadyInstalled ? 'Playwright already installed. Saving config...' : 'Playwright installed. Saving config...');
      } catch (err) {
        setSetupStatus(`Setup error: ${err instanceof Error ? err.message : String(err)}`);
        setIsSettingUp(false);
        return;
      }

      const now = new Date().toISOString();
      const config: TestSuiteConfig = {
        id: crypto.randomUUID(),
        name: `${parsedHostname}-default`,
        targetUrl,
        viewportWidth: width,
        viewportHeight: height,
        screenshotMode: mode,
        testDirectory,
        saveScreenshotsToTemp: false,
        navigationTimeout: 30000,
        actionTimeout: 10000,
        browsers: ['chromium'],
        workers: 1,
        retries: 1,
        environments: [],
        activeEnvironment: undefined,
        storageStatePath: undefined,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      };

      save.mutate(config, {
        onSettled: () => {
          setIsSettingUp(false);
          setSetupStatus(null);
        },
      });
    })();
  };

  return (
    <PageContent>
      <Card className="mx-auto w-full max-w-[560px]">
        <CardHeader>
          <CardTitle>Set up your test suite</CardTitle>
          <CardDescription>
            Configure the target app and viewport for recording tests.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-2">
              <Label htmlFor="setup-target-url">Target URL</Label>
              <Input
                required
                id="setup-target-url"
                placeholder="http://localhost:3000"
                type="url"
                value={targetUrl}
                onChange={(event) => setTargetUrl(event.target.value)}
              />
              {urlError ? (
                <Text size="sm" variant="error">{urlError}</Text>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="setup-viewport-width">Width</Label>
                <Input
                  required
                  id="setup-viewport-width"
                  min={320}
                  type="number"
                  value={width}
                  onChange={(event) => setWidth(Number(event.target.value))}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="setup-viewport-height">Height</Label>
                <Input
                  required
                  id="setup-viewport-height"
                  min={240}
                  type="number"
                  value={height}
                  onChange={(event) => setHeight(Number(event.target.value))}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="setup-screenshot-mode">Screenshot Mode</Label>
              <Select
                value={mode}
                onValueChange={(value) => setMode(value as ScreenshotMode)}
              >
                <SelectTrigger aria-label="Screenshot mode" id="setup-screenshot-mode">
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
              <Label htmlFor="setup-test-directory">Test Directory</Label>
              <Input
                required
                id="setup-test-directory"
                type="text"
                value={testDirectory}
                onChange={(event) => setTestDirectory(event.target.value)}
              />
            </div>

            {setupStatus ? (
              <Text variant="muted">{setupStatus}</Text>
            ) : null}

            <div className="flex justify-end">
              <Button disabled={isSettingUp || save.isPending} type="submit">
                {buttonLabel(isSettingUp, save.isPending)}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </PageContent>
  );
}
