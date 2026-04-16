import type { TestSuiteStepSchema } from '@shared/ipc/test-suite/schemas';

import type { z } from 'zod';


type TestSuiteStep = z.infer<typeof TestSuiteStepSchema>;

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
