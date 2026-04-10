/**
 * Settings — Screen capture sub-module
 *
 * Re-exports screen capture service and handler. Absorbed from features/screen/.
 */

export { createScreenCaptureService } from '../screen/screen-capture-service';
export { registerScreenHandlers } from '../screen/screen-handlers';

export type { ScreenCaptureService } from '../screen/screen-capture-service';
