/**
 * Milestones IPC handlers
 */

import { MILESTONES } from '@shared/ipc/misc/milestones.channels';

import type { MilestonesService } from "./milestones-service";
import type { IpcRouter } from '../../ipc/router';

export function registerMilestonesHandlers(router: IpcRouter, service: MilestonesService): void {
  router.handle(MILESTONES.LIST.ALL, (filters) => Promise.resolve(service.listMilestones(filters)));

  router.handle(MILESTONES.CREATE.MILESTONE, (data) => Promise.resolve(service.createMilestone(data)));

  router.handle(MILESTONES.UPDATE.MILESTONE, ({ id, ...updates }) =>
    Promise.resolve(service.updateMilestone(id, updates)),
  );

  router.handle(MILESTONES.DELETE.MILESTONE, ({ id }) => Promise.resolve(service.deleteMilestone(id)));

  router.handle(MILESTONES.ADD.TASK, ({ milestoneId, title }) =>
    Promise.resolve(service.addTask(milestoneId, title)),
  );

  router.handle(MILESTONES.TOGGLE.TASK, ({ milestoneId, taskId }) =>
    Promise.resolve(service.toggleTask(milestoneId, taskId)),
  );
}
