/**
 * Screen capture IPC handlers
 */

import { SCREEN } from '@shared/ipc/misc/screen.channels';

import type { ScreenCaptureService } from "./screen-capture-service";
import type { IpcRouter } from '../../../ipc/router';

export function registerScreenHandlers(router: IpcRouter, service: ScreenCaptureService): void {
  router.handle(SCREEN.LIST.SOURCES, (input) =>
    service.listSources({
      types: input.types,
      thumbnailSize: input.thumbnailSize,
    }),
  );

  router.handle(SCREEN.CAPTURE.SCREEN, (input) => service.capture(input.sourceId, input.options));

  router.handle(SCREEN.CHECK.PERMISSION, () => Promise.resolve(service.checkPermission()));
}
