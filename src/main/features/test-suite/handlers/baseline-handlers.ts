/**
 * Baseline & Diff IPC Handlers
 *
 * Registers BASELINE.LIST/SET/DELETE and DIFF.COMPARE/LIST handlers.
 */

import path from 'node:path';

import { eq } from 'drizzle-orm';

import { TEST_SUITE } from '@shared/ipc/test-suite/channels';

import { testSuiteDiffs } from '../schema';

import type { IpcRouter } from '../../../ipc/router';
import type { TestSuiteService } from '../test-suite-handlers';

export function registerBaselineHandlers(
  router: IpcRouter,
  testSuiteService: TestSuiteService,
): void {
  const { db } = testSuiteService;

  router.handle(TEST_SUITE.BASELINE.LIST, ({ scriptId }) =>
    Promise.resolve(testSuiteService.baselineStore.listByScript(scriptId)),
  );

  router.handle(TEST_SUITE.BASELINE.SET, ({ scriptId, screenshotId }) => {
    const screenshot = testSuiteService.screenshotStore.get(screenshotId);
    if (!screenshot) return Promise.reject(new Error('Screenshot not found'));

    const script = testSuiteService.scriptStore.get(scriptId);
    if (!script) return Promise.reject(new Error('Script not found'));

    const projectPath = testSuiteService.getProjectPath(script.projectId);
    if (!projectPath) {
      return Promise.reject(new Error(`Project path not found for projectId: ${script.projectId}`));
    }

    const config = testSuiteService.configStore.getActive(script.projectId);
    const testDir = config?.testDirectory ?? 'tests/e2e';
    const baselineDir = path.join(projectPath, testDir, 'baselines');

    return Promise.resolve(
      testSuiteService.baselineStore.setBaseline({
        scriptId,
        stepIndex: screenshot.stepIndex,
        stepLabel: screenshot.stepLabel,
        sourceFilePath: screenshot.filePath,
        baselineDir,
        width: screenshot.width,
        height: screenshot.height,
      }),
    );
  });

  router.handle(TEST_SUITE.BASELINE.DELETE, ({ scriptId }) => {
    testSuiteService.baselineStore.deleteByScript(scriptId);
    return Promise.resolve({ success: true });
  });

  router.handle(TEST_SUITE.DIFF.COMPARE, async ({ runId, sensitivity }) => {
    const screenshots = testSuiteService.screenshotStore.list(runId);
    return await testSuiteService.baselineStore.compareDiffs({
      runId,
      sensitivity,
      screenshots,
    });
  });

  router.handle(TEST_SUITE.DIFF.LIST, ({ runId }) =>
    Promise.resolve(
      db
        .select()
        .from(testSuiteDiffs)
        .where(eq(testSuiteDiffs.runId, runId))
        .all() as Array<{
          id: string;
          runId: string;
          baselineId: string;
          screenshotId: string;
          diffFilePath: string;
          mismatchPercentage: number;
          mismatchPixels: number;
          threshold: number;
          status: 'match' | 'mismatch' | 'size-mismatch';
          createdAt: string;
        }>,
    ),
  );
}
