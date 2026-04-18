/**
 * Setup IPC Handlers
 *
 * Registers SETUP.ENSURE-DEPS handler — installs Playwright into the project.
 */

import { TEST_SUITE } from '@shared/ipc/test-suite/channels';

import type { IpcRouter } from '../../../ipc/router';
import type { TestSuiteService } from '../recorder-handlers';

export function registerSetupHandlers(
  router: IpcRouter,
  testSuiteService: TestSuiteService,
): void {
  router.handle(TEST_SUITE.SETUP['ENSURE-DEPS'], async ({ projectId }) => {
    const projectPath = testSuiteService.getProjectPath(projectId);
    if (!projectPath) {
      return { installed: false, alreadyInstalled: false, error: 'Project path not found' };
    }

    const { existsSync } = await import('node:fs');
    const { join } = await import('node:path');
    const { execSync } = await import('node:child_process');

    const pwPath = join(projectPath, 'node_modules', '@playwright', 'test');
    const alreadyInstalled = existsSync(pwPath);

    if (alreadyInstalled) {
      return { installed: true, alreadyInstalled: true };
    }

    try {
      execSync('npm install -D @playwright/test', {
        cwd: projectPath,
        timeout: 120_000,
        stdio: 'pipe',
      });
      execSync('npx playwright install chromium', {
        cwd: projectPath,
        timeout: 180_000,
        stdio: 'pipe',
      });
      return { installed: true, alreadyInstalled: false };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { installed: false, alreadyInstalled: false, error: msg };
    }
  });
}
