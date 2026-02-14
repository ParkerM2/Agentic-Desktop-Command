/**
 * Briefing IPC handlers
 */

import type { BriefingService } from '../../services/briefing/briefing-service';
import type { IpcRouter } from '../router';

export function registerBriefingHandlers(router: IpcRouter, service: BriefingService): void {
  router.handle('briefing.getDaily', () => Promise.resolve(service.getDailyBriefing()));

  router.handle('briefing.generate', async () => await service.generateBriefing());

  router.handle('briefing.getConfig', () => Promise.resolve(service.getConfig()));

  router.handle('briefing.updateConfig', (updates) =>
    Promise.resolve(service.updateConfig(updates)),
  );

  router.handle('briefing.getSuggestions', () => Promise.resolve(service.getSuggestions()));
}
