/**
 * Time Parser IPC handlers
 */

import { TIME } from '@shared/ipc/misc/time.channels';

import type { TimeParserService } from "./time-parser-service";
import type { IpcRouter } from '../../ipc/router';

export function registerTimeHandlers(router: IpcRouter, service: TimeParserService): void {
  router.handle(TIME.PARSE.EXPRESSION, ({ text, referenceDate }) => {
    const ref = referenceDate ? new Date(referenceDate) : undefined;
    const result = service.parseTime(text, ref);

    if (!result) {
      return Promise.resolve(null);
    }

    return Promise.resolve({
      iso: result.date.toISOString(),
      text: result.text,
      isRelative: result.isRelative,
    });
  });
}
