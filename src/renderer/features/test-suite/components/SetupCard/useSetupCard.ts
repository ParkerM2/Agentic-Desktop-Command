import { useState } from 'react';

import type { TestSuiteConfig } from '@shared/ipc/test-suite';
import { TEST_SUITE } from '@shared/ipc/test-suite/channels';

import { ipc } from '@renderer/shared/lib/ipc';

import { useSaveTestSuiteConfig } from '../../api/useSaveTestSuiteConfig';
import { useUrlValidation } from '../../hooks/useUrlValidation';
import {
  DEFAULT_ACTION_TIMEOUT,
  DEFAULT_NAVIGATION_TIMEOUT,
  DEFAULT_VIEWPORT_HEIGHT,
  DEFAULT_VIEWPORT_WIDTH,
} from '../../lib/constants';
import {
  DEFAULT_CONFIG_SCREENSHOT_MODE,
  DEFAULT_CONFIG_TARGET_URL,
  DEFAULT_CONFIG_TEST_DIRECTORY,
} from '../../lib/starter-test';

type ScreenshotMode = TestSuiteConfig['screenshotMode'];

function buttonLabel(settingUp: boolean, saving: boolean): string {
  if (settingUp) return 'Setting up...';
  if (saving) return 'Saving...';
  return 'Save & Start Recording';
}

export function useSetupCard(projectId: string) {
  const save = useSaveTestSuiteConfig(projectId);

  const [targetUrl, setTargetUrl] = useState(DEFAULT_CONFIG_TARGET_URL);
  const [width, setWidth] = useState(DEFAULT_VIEWPORT_WIDTH);
  const [height, setHeight] = useState(DEFAULT_VIEWPORT_HEIGHT);
  const [mode, setMode] = useState<ScreenshotMode>(DEFAULT_CONFIG_SCREENSHOT_MODE);
  const [testDirectory, setTestDirectory] = useState(DEFAULT_CONFIG_TEST_DIRECTORY);
  const { urlError, validate: validateUrl } = useUrlValidation();
  const [setupStatus, setSetupStatus] = useState<string | null>(null);
  const [isSettingUp, setIsSettingUp] = useState(false);

  const handleSubmit = (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validateUrl(targetUrl)) return;
    const { hostname: parsedHostname } = new URL(targetUrl);
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
        navigationTimeout: DEFAULT_NAVIGATION_TIMEOUT,
        actionTimeout: DEFAULT_ACTION_TIMEOUT,
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

  return {
    targetUrl,
    setTargetUrl,
    width,
    setWidth,
    height,
    setHeight,
    mode,
    setMode,
    testDirectory,
    setTestDirectory,
    urlError,
    setupStatus,
    isSettingUp,
    saving: save.isPending,
    buttonLabel: buttonLabel(isSettingUp, save.isPending),
    handleSubmit,
  };
}
