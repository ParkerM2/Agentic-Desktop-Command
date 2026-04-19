/**
 * Export IPC Handlers
 *
 * Registers the 4 EXPORT channel handlers: FILE, GITHUB, CI-PREVIEW, CI-COMMIT.
 * CI handlers also require projectService to resolve the project root path.
 */

import { TEST_SUITE } from '@shared/ipc/test-suite/channels';

import { commitWorkflow, previewWorkflow } from '../workflow-exporter';

import type { IpcRouter } from '../../../ipc/router';
import type { ProjectService } from '../../projects/project-service';
import type { TestSuiteService } from '../recorder-handlers';

export function registerExportHandlers(
  router: IpcRouter,
  testSuiteService: TestSuiteService,
  projectService: ProjectService,
): void {
  router.handle(TEST_SUITE.EXPORT.FILE, (input) =>
    testSuiteService.exportFile(input),
  );

  router.handle(TEST_SUITE.EXPORT.GITHUB, (input) =>
    testSuiteService.exportGithub(input),
  );

  router.handle(TEST_SUITE.EXPORT['CI-PREVIEW'], ({ projectId }) => {
    const projectPath = projectService.getProjectPath(projectId);
    if (!projectPath) return Promise.resolve({ yaml: '', filePath: '', exists: false });

    const config = testSuiteService.configStore.getActive(projectId);
    const testDir = config?.testDirectory ?? 'tests/e2e';

    const scripts = testSuiteService.listScriptsByProject(projectId) as Promise<Array<{ name: string }>>;
    return scripts.then((list) => {
      const specNames = list.map((s) => s.name);
      return previewWorkflow(projectPath, testDir, specNames);
    });
  });

  router.handle(TEST_SUITE.EXPORT['CI-COMMIT'], ({ projectId }) => {
    const projectPath = projectService.getProjectPath(projectId);
    if (!projectPath) return Promise.resolve({ filePath: '', committed: false });

    const config = testSuiteService.configStore.getActive(projectId);
    const testDir = config?.testDirectory ?? 'tests/e2e';

    const scripts = testSuiteService.listScriptsByProject(projectId) as Promise<Array<{ name: string }>>;
    return scripts.then((list) => {
      const specNames = list.map((s) => s.name);
      return commitWorkflow(projectPath, testDir, specNames);
    });
  });
}
