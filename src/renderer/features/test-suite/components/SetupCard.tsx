import { useState } from 'react';

import type { TestSuiteConfig } from '@shared/ipc/test-suite';

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
} from '@ui';

import { useSaveTestSuiteConfig } from '../api/useSaveTestSuiteConfig';
import {
  DEFAULT_CONFIG_SCREENSHOT_MODE,
  DEFAULT_CONFIG_TARGET_URL,
  DEFAULT_CONFIG_TEST_DIRECTORY,
  DEFAULT_CONFIG_VIEWPORT_HEIGHT,
  DEFAULT_CONFIG_VIEWPORT_WIDTH,
} from '../lib/starter-test';

interface SetupCardProps {
  projectId: string;
}

type ScreenshotMode = TestSuiteConfig['screenshotMode'];

const SCREENSHOT_MODES: Array<{ value: ScreenshotMode; label: string }> = [
  { value: 'smart', label: 'Smart (recommended)' },
  { value: 'per-click', label: 'Per click' },
  { value: 'per-nav', label: 'Per navigation' },
  { value: 'per-form', label: 'Per form' },
  { value: 'per-assertion', label: 'Per assertion' },
  { value: 'manual', label: 'Manual' },
];

export function SetupCard({ projectId }: SetupCardProps) {
  const save = useSaveTestSuiteConfig(projectId);

  const [targetUrl, setTargetUrl] = useState(DEFAULT_CONFIG_TARGET_URL);
  const [width, setWidth] = useState(DEFAULT_CONFIG_VIEWPORT_WIDTH);
  const [height, setHeight] = useState(DEFAULT_CONFIG_VIEWPORT_HEIGHT);
  const [mode, setMode] = useState<ScreenshotMode>(DEFAULT_CONFIG_SCREENSHOT_MODE);
  const [testDirectory, setTestDirectory] = useState(DEFAULT_CONFIG_TEST_DIRECTORY);
  const [urlError, setUrlError] = useState<string | null>(null);

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
      environments: [],
      activeEnvironment: undefined,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    save.mutate(config);
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
                <p className="text-destructive text-xs">{urlError}</p>
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

            <div className="flex justify-end">
              <Button disabled={save.isPending} type="submit">
                {save.isPending ? 'Saving...' : 'Save & Start Recording'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </PageContent>
  );
}
