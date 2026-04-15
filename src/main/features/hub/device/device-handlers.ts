/**
 * Device IPC handlers — Proxies to Hub API via DeviceService
 */

import { DEVICES } from '@shared/ipc/devices';

import type { DeviceService } from "./device-service";
import type { IpcRouter } from '../../../ipc/router';

export function registerDeviceHandlers(router: IpcRouter, deviceService: DeviceService): void {
  router.handle(DEVICES.LIST.ALL, async () => {
    return await deviceService.getDevices();
  });

  router.handle(DEVICES.REGISTER.DEVICE, async (input) => {
    return await deviceService.registerDevice(input);
  });

  router.handle(DEVICES.HEARTBEAT.DEVICE, async ({ deviceId }) => {
    return await deviceService.sendHeartbeat(deviceId);
  });

  router.handle(DEVICES.UPDATE.DEVICE, async ({ deviceId, ...updates }) => {
    return await deviceService.updateDevice(deviceId, updates);
  });
}
