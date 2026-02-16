/**
 * Cross-Device Query — Query other ADC instances via Hub API
 *
 * Handles natural language queries about device status and running tasks
 * on other machines registered with the Hub.
 */

import type { HubApiClient } from '../hub/hub-api-client';

interface DeviceInfo {
  id: string;
  deviceName: string;
  nickname?: string;
  isOnline: boolean;
  lastSeen?: string;
}

interface DeviceTaskInfo {
  id: string;
  title: string;
  status: string;
}

const SLEEPING_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes
const OFFLINE_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

function getDeviceState(device: DeviceInfo): 'online' | 'sleeping' | 'offline' | 'unreachable' {
  if (!device.lastSeen) {
    return 'unreachable';
  }

  const elapsed = Date.now() - new Date(device.lastSeen).getTime();

  if (device.isOnline && elapsed < SLEEPING_THRESHOLD_MS) {
    return 'online';
  }
  if (elapsed < OFFLINE_THRESHOLD_MS) {
    return 'sleeping';
  }
  return 'offline';
}

function formatTimeAgo(isoDate: string): string {
  const elapsed = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(elapsed / 60_000);

  if (minutes < 1) {
    return 'just now';
  }
  if (minutes < 60) {
    return `${String(minutes)}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${String(hours)}h ago`;
  }

  const days = Math.floor(hours / 24);
  return `${String(days)}d ago`;
}

const STATE_INDICATORS: Record<string, string> = {
  online: '[online]',
  sleeping: '[sleeping]',
  offline: '[offline]',
  unreachable: '[unreachable]',
};

function formatDeviceEntry(device: DeviceInfo, tasks: DeviceTaskInfo[]): string {
  const state = getDeviceState(device);
  const indicator = STATE_INDICATORS[state] ?? '[unknown]';
  const displayName = device.nickname ?? device.deviceName;
  const lastSeenText = device.lastSeen ? ` (last seen ${formatTimeAgo(device.lastSeen)})` : '';

  let line = `${indicator} ${displayName}${lastSeenText}`;

  if (state === 'online' && tasks.length > 0) {
    const taskLines = tasks.map((t) => `    - ${t.title} [${t.status}]`);
    line += `\n${taskLines.join('\n')}`;
  }

  return line;
}

export interface CrossDeviceQuery {
  query: (deviceNameFilter: string) => Promise<string>;
}

export function createCrossDeviceQuery(hubApiClient: HubApiClient): CrossDeviceQuery {
  return {
    async query(deviceNameFilter) {
      const devicesResult = await hubApiClient.hubGet<DeviceInfo[]>('/devices');

      if (!devicesResult.ok || !devicesResult.data) {
        return 'Unable to fetch device information from Hub.';
      }

      const devices = devicesResult.data;

      if (devices.length === 0) {
        return 'No devices registered with Hub.';
      }

      // Filter to specific device if name provided
      const filtered =
        deviceNameFilter.length > 0
          ? devices.filter(
              (d) =>
                d.deviceName.toLowerCase().includes(deviceNameFilter.toLowerCase()) ||
                (d.nickname?.toLowerCase().includes(deviceNameFilter.toLowerCase()) ?? false),
            )
          : devices;

      if (filtered.length === 0) {
        return `No device found matching "${deviceNameFilter}".`;
      }

      // Fetch tasks for each device
      const entries = await Promise.all(
        filtered.map(async (device) => {
          const tasks = await (async (): Promise<DeviceTaskInfo[]> => {
            if (getDeviceState(device) !== 'online') {
              return [];
            }
            const tasksResult = await hubApiClient.hubGet<{ tasks: DeviceTaskInfo[] }>(
              `/tasks?assignedDeviceId=${device.id}`,
            );
            if (tasksResult.ok && tasksResult.data) {
              const { tasks: deviceTasks } = tasksResult.data;
              return deviceTasks;
            }
            return [];
          })();
          return formatDeviceEntry(device, tasks);
        }),
      );

      const header =
        deviceNameFilter.length > 0
          ? `Device status for "${deviceNameFilter}":`
          : `All devices (${String(devices.length)}):`;

      return `${header}\n${entries.join('\n')}`;
    },
  };
}
