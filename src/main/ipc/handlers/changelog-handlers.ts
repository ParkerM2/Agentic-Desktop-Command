/**
 * Changelog IPC handlers
 */

import { CHANGELOG } from '@shared/ipc/misc/changelog.channels';

import type { ChangelogService } from '../../services/changelog/changelog-service';
import type { IpcRouter } from '../router';

export function registerChangelogHandlers(router: IpcRouter, service: ChangelogService): void {
  router.handle(CHANGELOG.LIST.ENTRIES, () => Promise.resolve(service.listEntries()));

  router.handle(CHANGELOG.ADD.ENTRY, (data) => Promise.resolve(service.addEntry(data)));

  router.handle(CHANGELOG.GENERATE.ENTRY, ({ repoPath, version, fromTag }) =>
    service.generateFromGit(repoPath, version, fromTag),
  );
}
