/**
 * Voice IPC handlers
 */

import { VOICE } from '@shared/ipc/voice';

import type { VoiceService } from "./voice-service";
import type { IpcRouter } from '../../../ipc/router';

export function registerVoiceHandlers(router: IpcRouter, service: VoiceService): void {
  router.handle(VOICE.GET.CONFIG, () => Promise.resolve(service.getConfig()));

  router.handle(VOICE.UPDATE.CONFIG, (updates) => Promise.resolve(service.updateConfig(updates)));

  router.handle(VOICE.CHECK.PERMISSION, () => Promise.resolve(service.checkPermission()));
}
