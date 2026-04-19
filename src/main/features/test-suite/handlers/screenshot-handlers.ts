/**
 * Screenshot IPC Handlers
 *
 * Registers the 3 SCREENSHOT channel handlers (LIST, EXPORT-ZIP, COPY).
 * EXPORT-ZIP opens the screenshot directory in the file manager.
 * COPY ensures the destination directory exists before copying.
 */

import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

import { shell } from 'electron';

import { TEST_SUITE } from '@shared/ipc/test-suite/channels';

import type { IpcRouter } from '../../../ipc/router';
import type { TestSuiteService } from '../recorder-handlers';

export function registerScreenshotHandlers(
  router: IpcRouter,
  testSuiteService: TestSuiteService,
): void {
  router.handle(TEST_SUITE.SCREENSHOT.LIST, ({ runId, scriptId }) => {
    if (runId) return Promise.resolve(testSuiteService.screenshotStore.list(runId));
    if (scriptId) return Promise.resolve(testSuiteService.screenshotStore.listByScript(scriptId));
    return Promise.resolve([]);
  });

  router.handle(TEST_SUITE.SCREENSHOT['EXPORT-ZIP'], async ({ runId }) => {
    const screenshots = testSuiteService.screenshotStore.list(runId);
    if (screenshots.length === 0) return { filePath: '' };

    // Return the parent directory of the screenshots and open it in the file manager
    const dir = path.dirname(screenshots[0].filePath);
    await shell.openPath(dir);
    return { filePath: dir };
  });

  router.handle(TEST_SUITE.SCREENSHOT.COPY, async ({ id, destPath }) => {
    const screenshot = testSuiteService.screenshotStore.get(id);
    if (!screenshot) return { filePath: '' };

    // Ensure destination directory exists
    await mkdir(path.dirname(destPath), { recursive: true });
    await copyFile(screenshot.filePath, destPath);
    return { filePath: destPath };
  });
}
