/**
 * Tracker IPC handlers
 *
 * Thin wrappers that delegate to TrackerService.
 * Service is synchronous — handlers wrap returns with Promise.resolve().
 */

import type { TrackerService } from '../../services/tracker/tracker-service';
import type { IpcRouter } from '../router';

export function registerTrackerHandlers(router: IpcRouter, trackerService: TrackerService): void {
  router.handle('tracker.list', () => Promise.resolve(trackerService.list()));

  router.handle('tracker.get', ({ key }) => Promise.resolve(trackerService.get(key)));

  router.handle('tracker.update', ({ key, ...patch }) =>
    Promise.resolve(trackerService.update(key, patch)),
  );
}
