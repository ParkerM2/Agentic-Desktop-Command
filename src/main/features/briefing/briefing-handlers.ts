/**
 * Briefing IPC handlers
 */

import { BRIEFING } from '@shared/ipc/briefing/channels';

import type { BriefingService } from "./briefing-service";
import type { IpcRouter } from '../../ipc/router';

export function registerBriefingHandlers(router: IpcRouter, service: BriefingService): void {
  router.handle(BRIEFING.GET.DAILY, () => Promise.resolve(service.getDailyBriefing()));

  router.handle(BRIEFING.GENERATE.DAILY, async () => await service.generateBriefing());

  router.handle(BRIEFING.GET.CONFIG, () => Promise.resolve(service.getConfig()));

  router.handle(BRIEFING.UPDATE.CONFIG, (updates) =>
    Promise.resolve(service.updateConfig(updates)),
  );

  router.handle(BRIEFING.GET.SUGGESTIONS, async () => await service.getSuggestions());
}
