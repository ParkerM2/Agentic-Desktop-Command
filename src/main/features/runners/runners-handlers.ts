import { RUNNERS } from '@shared/ipc/runners/channels';

import type { IpcRouter } from '@main/ipc/router';

import type { RunnersService } from './runners-service';

export function registerRunnerHandlers(router: IpcRouter, service: RunnersService): void {
  router.handle(RUNNERS.PROFILE.LIST, ({ projectId }) => service.listProfiles(projectId) as never);

  router.handle(RUNNERS.PROFILE.SAVE, ({ profile }) => service.saveProfile(profile) as never);

  router.handle(RUNNERS.PROFILE.DELETE, ({ profileId }) =>
    service.deleteProfile(profileId) as never,
  );

  router.handle(RUNNERS.INSTANCE.LIST, ({ scope }) => service.listInstances(scope) as never);

  router.handle(RUNNERS.INSTANCE.START, ({ profileId, scope }) =>
    service.startInstance(profileId, scope) as never,
  );

  router.handle(RUNNERS.INSTANCE.STOP, ({ instanceId }) =>
    service.stopInstance(instanceId) as never,
  );

  router.handle(RUNNERS.INSTANCE.RESTART, ({ instanceId }) =>
    service.restartInstance(instanceId) as never,
  );
}
