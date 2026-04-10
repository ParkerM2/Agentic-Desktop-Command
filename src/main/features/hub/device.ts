/**
 * Hub — Device sub-module
 *
 * Re-exports device service, heartbeat, and handler. Absorbed from features/device/.
 */

export { createDeviceService } from '../device/device-service';
export { createHeartbeatService } from '../device/heartbeat';
export { registerDeviceHandlers } from '../device/device-handlers';

export type { DeviceService, DeviceRegisterInput, DeviceUpdateInput } from '../device/device-service';
export type { HeartbeatService } from '../device/heartbeat';
