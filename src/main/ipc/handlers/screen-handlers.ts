/**
 * Screen capture IPC handlers
 */

import type { ScreenCaptureService } from '../../services/screen/screen-capture-service';
import type { IpcRouter } from '../router';

export function registerScreenHandlers(router: IpcRouter, service: ScreenCaptureService): void {
  router.handle('screen.listSources', (input) =>
    service.listSources({
      types: input.types,
      thumbnailSize: input.thumbnailSize,
    }),
  );

  router.handle('screen.capture', (input) =>
    service.capture(input.sourceId, input.options),
  );

  router.handle('screen.checkPermission', () =>
    Promise.resolve(service.checkPermission()),
  );
}
