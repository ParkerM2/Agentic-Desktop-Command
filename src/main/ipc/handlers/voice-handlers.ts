/**
 * Voice IPC handlers
 */

import type { VoiceService } from '../../services/voice/voice-service';
import type { IpcRouter } from '../router';

export function registerVoiceHandlers(router: IpcRouter, service: VoiceService): void {
  router.handle('voice.getConfig', () => Promise.resolve(service.getConfig()));

  router.handle('voice.updateConfig', (updates) => Promise.resolve(service.updateConfig(updates)));

  router.handle('voice.checkPermission', () => Promise.resolve(service.checkPermission()));
}
