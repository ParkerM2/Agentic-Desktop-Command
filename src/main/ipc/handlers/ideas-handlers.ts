/**
 * Ideas IPC handlers
 */

import { IDEAS } from '@shared/ipc/misc/ideas.channels';

import type { IdeasService } from '../../services/ideas/ideas-service';
import type { IpcRouter } from '../router';

export function registerIdeasHandlers(router: IpcRouter, service: IdeasService): void {
  router.handle(IDEAS.LIST.ALL, (filters) => Promise.resolve(service.listIdeas(filters)));

  router.handle(IDEAS.CREATE.IDEA, (data) => Promise.resolve(service.createIdea(data)));

  router.handle(IDEAS.UPDATE.IDEA, ({ id, ...updates }) =>
    Promise.resolve(service.updateIdea(id, updates)),
  );

  router.handle(IDEAS.DELETE.IDEA, ({ id }) => Promise.resolve(service.deleteIdea(id)));

  router.handle(IDEAS.VOTE.IDEA, ({ id, delta }) => Promise.resolve(service.voteIdea(id, delta)));
}
