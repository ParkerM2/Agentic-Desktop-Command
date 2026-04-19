/**
 * Data-Run IPC Handlers
 *
 * Registers the 2 DATA-RUN channel handlers (PARSE, EXECUTE).
 * EXECUTE iterates CSV/JSON rows, substitutes {{key}} placeholders,
 * writes a temporary spec file per row, and runs each as a separate test run.
 */

import { TEST_SUITE } from '@shared/ipc/test-suite/channels';
import type { TestSuiteStepSchema } from '@shared/ipc/test-suite/schemas';

import { parseDataFile, substituteDataInSteps } from '../data-runner';
import { writeSpecFile } from '../script-writer';

import type { IpcRouter } from '../../../ipc/router';
import type { TestSuiteService } from '../test-suite-handlers';

type TestSuiteStep = (typeof TestSuiteStepSchema)['_output'];

export function registerDataRunHandlers(
  router: IpcRouter,
  testSuiteService: TestSuiteService,
): void {
  router.handle(TEST_SUITE['DATA-RUN'].PARSE, ({ filePath }) => {
    const rows = parseDataFile(filePath);
    const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
    return Promise.resolve({ rows, headers, rowCount: rows.length });
  });

  router.handle(TEST_SUITE['DATA-RUN'].EXECUTE, async ({ scriptId, dataFilePath }) => {
    const rows = parseDataFile(dataFilePath);
    const script = await testSuiteService.getScript(scriptId);
    if (!script) throw new Error(`Script not found: ${scriptId}`);

    const projectPath = testSuiteService.getProjectPath(script.projectId);
    if (!projectPath) throw new Error(`Project path not found for projectId: ${script.projectId}`);

    const config = testSuiteService.configStore.getActive(script.projectId);
    const testDir = config?.testDirectory ?? 'tests/e2e';
    const runIds: string[] = [];

    for (const [rowIndex, row] of rows.entries()) {
      // Substitute {{key}} placeholders in fill-step values
      const substitutedSteps = substituteDataInSteps(
        script.steps as Array<{ type: string; value?: string } & Record<string, unknown>>,
        row,
      );

      // Write a temporary spec file with the substituted steps
      const tempFilePath = writeSpecFile({
        projectRoot: projectPath,
        testDir,
        name: `${script.name}-data-${rowIndex}`,
        baseUrl: script.targetUrl,
        steps: substitutedSteps as TestSuiteStep[],
        screenshotMode: config?.screenshotMode,
        navigationTimeout: config?.navigationTimeout,
        actionTimeout: config?.actionTimeout,
      });

      // Run the test using the substituted temp spec
      const { runId } = await testSuiteService.runScript({
        scriptId,
        triggeredBy: 'manual',
        filePathOverride: tempFilePath,
      });
      runIds.push(runId);
    }

    return { runIds, totalRows: rows.length };
  });
}
