/**
 * Device IPC handlers — Proxies to Hub API via DeviceService
 */

import type { DeviceService } from '../../services/device/device-service';
import type { IpcRouter } from '../router';

export function registerDeviceHandlers(router: IpcRouter, deviceService: DeviceService): void {
  router.handle('devices.list', async () => {
    return await deviceService.getDevices();
  });

  router.handle('devices.register', async (input) => {
    return await deviceService.registerDevice(input);
  });

  router.handle('devices.heartbeat', async ({ deviceId }) => {
    return await deviceService.sendHeartbeat(deviceId);
  });

  router.handle('devices.update', async ({ deviceId, ...updates }) => {
    return await deviceService.updateDevice(deviceId, updates);
  });
}
