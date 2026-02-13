/**
 * Time Parser IPC handlers
 */

import type { TimeParserService } from '../../services/time-parser/time-parser-service';
import type { IpcRouter } from '../router';

export function registerTimeHandlers(router: IpcRouter, service: TimeParserService): void {
  router.handle('time.parse', ({ text, referenceDate }) => {
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
