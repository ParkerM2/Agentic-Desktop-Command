/**
 * Tracker IPC handlers
 *
 * Thin wrappers that delegate to TrackerService.
 * Service is synchronous — handlers wrap returns with Promise.resolve().
 */

import { TRACKER } from '@shared/ipc/tracker/channels';

import type { TrackerService } from '../../services/tracker/tracker-service';
import type { IpcRouter } from '../router';

export function registerTrackerHandlers(router: IpcRouter, trackerService: TrackerService): void {
  router.handle(TRACKER.LIST.ALL, () => Promise.resolve(trackerService.list()));

  router.handle(TRACKER.GET.PLAN, ({ key }) => Promise.resolve(trackerService.get(key)));

  router.handle(TRACKER.UPDATE.PLAN, ({ key, ...patch }) =>
    Promise.resolve(trackerService.update(key, patch)),
  );
}
