/**
 * Changelog IPC handlers
 */

import type { ChangelogService } from '../../services/changelog/changelog-service';
import type { IpcRouter } from '../router';

export function registerChangelogHandlers(router: IpcRouter, service: ChangelogService): void {
  router.handle('changelog.list', () => Promise.resolve(service.listEntries()));

  router.handle('changelog.addEntry', (data) => Promise.resolve(service.addEntry(data)));

  router.handle('changelog.generate', ({ repoPath, version, fromTag }) =>
    service.generateFromGit(repoPath, version, fromTag),
  );
}
