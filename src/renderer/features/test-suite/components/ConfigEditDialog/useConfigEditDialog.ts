import { useEffect, useState } from 'react';

import type { TestSuiteConfig } from '@shared/ipc/test-suite';
import { TEST_SUITE } from '@shared/ipc/test-suite/channels';

import { ipc } from '@renderer/shared/lib/ipc';

import { useSaveTestSuiteConfig } from '../../api/useSaveTestSuiteConfig';
import {
  DEFAULT_ACTION_TIMEOUT,
  DEFAULT_NAVIGATION_TIMEOUT,
  DEFAULT_VIEWPORT_HEIGHT,
  DEFAULT_VIEWPORT_WIDTH,
} from '../../lib/constants';

type ScreenshotMode = TestSuiteConfig['screenshotMode'];

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
    viewportWidth: DEFAULT_VIEWPORT_WIDTH,
    viewportHeight: DEFAULT_VIEWPORT_HEIGHT,
    screenshotMode: 'smart',
    testDirectory: 'test-suite/',
    browsers: ['chromium'],
    workers: 1,
    retries: 1,
    environments: [],
  };
}

interface UseConfigEditDialogProps {
  projectId: string;
  config: TestSuiteConfig | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function useConfigEditDialog({
  projectId,
  config,
  open,
  onOpenChange,
}: UseConfigEditDialogProps) {
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
      navigationTimeout: config?.navigationTimeout ?? DEFAULT_NAVIGATION_TIMEOUT,
      actionTimeout: config?.actionTimeout ?? DEFAULT_ACTION_TIMEOUT,
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

  const handleBrowserToggle = (browser: 'chromium' | 'firefox' | 'webkit', checked: boolean | 'indeterminate') => {
    if (checked === true) update('browsers', [...state.browsers, browser]);
    else update('browsers', state.browsers.filter((x) => x !== browser));
  };

  const handleEnvironmentNameChange = (index: number, value: string) => {
    const envs = [...state.environments];
    envs[index] = { ...envs[index], name: value };
    update('environments', envs);
  };

  const handleEnvironmentUrlChange = (index: number, value: string) => {
    const envs = [...state.environments];
    envs[index] = { ...envs[index], url: value };
    update('environments', envs);
  };

  const handleRemoveEnvironment = (index: number) => {
    update('environments', state.environments.filter((_, j) => j !== index));
  };

  const handleAddEnvironment = () => {
    update('environments', [...state.environments, { name: '', url: '' }]);
  };

  const handleClearAuth = () => {
    void ipc(TEST_SUITE.AUTH.CLEAR, { projectId });
  };

  const handleCaptureAuth = () => {
    void ipc(TEST_SUITE.AUTH.SAVE, { projectId });
  };

  const title = config ? 'Edit Configuration' : 'New Configuration';

  return {
    state,
    urlError,
    saving: save.isPending,
    title,
    storageStatePath: config?.storageStatePath,
    update,
    handleSubmit,
    handleBrowserToggle,
    handleEnvironmentNameChange,
    handleEnvironmentUrlChange,
    handleRemoveEnvironment,
    handleAddEnvironment,
    handleClearAuth,
    handleCaptureAuth,
  };
}
