import type { TestSuiteConfig, TestSuiteStepSchema } from '@shared/ipc/test-suite/schemas';

import { DEFAULT_VIEWPORT_HEIGHT, DEFAULT_VIEWPORT_WIDTH } from './constants';

import type { z } from 'zod';


type TestSuiteStep = z.infer<typeof TestSuiteStepSchema>;

export const DEFAULT_CONFIG_TARGET_URL = 'http://localhost:3000';
export const DEFAULT_CONFIG_SCREENSHOT_MODE: TestSuiteConfig['screenshotMode'] = 'smart';
export const DEFAULT_CONFIG_TEST_DIRECTORY = 'test-suite/';

export function buildDefaultConfig(): TestSuiteConfig {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: 'localhost-default',
    targetUrl: DEFAULT_CONFIG_TARGET_URL,
    viewportWidth: DEFAULT_VIEWPORT_WIDTH,
    viewportHeight: DEFAULT_VIEWPORT_HEIGHT,
    screenshotMode: DEFAULT_CONFIG_SCREENSHOT_MODE,
    testDirectory: DEFAULT_CONFIG_TEST_DIRECTORY,
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
}

export interface StarterTestInput {
  projectId: string;
  targetUrl: string;
}

export interface StarterTest {
  projectId: string;
  name: string;
  description: string;
  steps: TestSuiteStep[];
}

export function buildStarterTest({ projectId, targetUrl }: StarterTestInput): StarterTest {
  return {
    projectId,
    name: 'Starter: Smoke Test',
    description: 'Auto-generated baseline — navigates to the app and verifies it loads.',
    steps: [
      { type: 'navigate', url: targetUrl },
      { type: 'wait', ms: 1000 },
    ],
  };
}
