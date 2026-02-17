/**
 * Task IPC handlers — thin re-export from split modules.
 *
 * Hub task channels (`hub.tasks.*`) proxy directly to the Hub API.
 * Legacy channels (`tasks.*`) forward to Hub where possible,
 * falling back to local services for decompose/GitHub import.
 */

export { registerTaskHandlers } from './tasks';
export type { TaskHandlerDeps } from './tasks';
