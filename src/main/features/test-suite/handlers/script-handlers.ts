/**
 * Script IPC Handlers
 *
 * Registers the 4 script channel handlers (LIST.SCRIPTS, GET.SCRIPT,
 * SAVE.SCRIPT, DELETE.SCRIPT). SAVE.SCRIPT writes spec + config files to disk
 * when a project path and active config are available.
 */

import { TEST_SUITE } from '@shared/ipc/test-suite/channels';

import { writePlaywrightConfig } from '../playwright-config-writer';
import { writeTestSuiteGitignore, writeTestSuiteReadme } from '../readme-writer';
import { writeSpecFile } from '../script-writer';

import type { IpcRouter } from '../../../ipc/router';
import type { ProjectService } from '../../projects/project-service';
import type { TestSuiteService } from '../recorder-handlers';

export function registerScriptHandlers(
  router: IpcRouter,
  testSuiteService: TestSuiteService,
  projectService: ProjectService,
): void {
  router.handle(TEST_SUITE.LIST.SCRIPTS, ({ projectId }) =>
    testSuiteService.listScriptsByProject(projectId) as never,
  );

  router.handle(TEST_SUITE.GET.SCRIPT, ({ id }) =>
    testSuiteService.getScript(id) as never,
  );

  router.handle(TEST_SUITE.SAVE.SCRIPT, (input) => {
    const { projectId, steps } = input;
    const projectPath = projectService.getProjectPath(projectId);
    const config = testSuiteService.configStore.getActive(projectId);

    // If we have both a project path and an active config, write files to disk
    let filePath = '';
    if (projectPath && config) {
      const testDir = config.testDirectory || 'tests/e2e';
      const baseUrl = config.targetUrl;

      filePath = writeSpecFile({
        projectRoot: projectPath,
        testDir,
        name: input.name,
        baseUrl,
        steps,
        screenshotMode: config.screenshotMode,
        navigationTimeout: config.navigationTimeout,
        actionTimeout: config.actionTimeout,
      });

      writePlaywrightConfig({
        projectRoot: projectPath,
        testDir,
        baseUrl,
        navigationTimeout: config.navigationTimeout,
        actionTimeout: config.actionTimeout,
        browsers: config.browsers,
        workers: config.workers,
        storageStatePath: config.storageStatePath,
      });
      writeTestSuiteReadme({ projectRoot: projectPath, testDir });
      writeTestSuiteGitignore({ projectRoot: projectPath, testDir });
    }

    return testSuiteService.saveScript({ ...input, filePath }) as never;
  });

  router.handle(TEST_SUITE.DELETE.SCRIPT, ({ id }) =>
    testSuiteService.deleteScript(id),
  );
}
