/**
 * Cross-Device Query — Query other ADC instances via local op_log + peer-store
 *
 * Handles natural language queries about device status and tasks
 * originated by other paired peers. Reads entirely from the local
 * SQLite replica — no Hub round-trips.
 */

import { and, eq, inArray } from 'drizzle-orm';

import type { AdcDatabase } from '@main/db';
import { createPeerStore } from '@main/features/peers/peer-store';
import type { PairedPeer } from '@main/features/peers/peer-store';
import { opLog } from '@main/features/peers/schema';
import { progressTasks } from '@main/features/progress/schema';

interface DeviceInfo {
  id: string;
  deviceName: string;
  nickname?: string;
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
  if (device.lastSeen === undefined) {
    return 'unreachable';
  }

  const elapsed = Date.now() - new Date(device.lastSeen).getTime();

  if (elapsed < SLEEPING_THRESHOLD_MS) {
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

function peerToDevice(peer: PairedPeer): DeviceInfo {
  return {
    id: peer.peerId,
    deviceName: peer.displayName ?? peer.peerId,
    nickname: peer.displayName ?? undefined,
    lastSeen:
      peer.lastConnectedAt === null ? undefined : new Date(peer.lastConnectedAt).toISOString(),
  };
}

export interface CrossDeviceQueryDeps {
  db: AdcDatabase;
}

export interface CrossDeviceQuery {
  query: (deviceNameFilter: string) => Promise<string>;
}

export function createCrossDeviceQuery(deps: CrossDeviceQueryDeps): CrossDeviceQuery {
  const { db } = deps;
  const peerStore = createPeerStore(db);

  function tasksForPeer(peerId: string): DeviceTaskInfo[] {
    const pkRows = db
      .selectDistinct({ pk: opLog.pk })
      .from(opLog)
      .where(and(eq(opLog.tableName, 'progress_tasks'), eq(opLog.originPeerId, peerId)))
      .all();

    if (pkRows.length === 0) {
      return [];
    }

    const slugs = pkRows.map((r) => r.pk);
    const taskRows = db
      .select({
        slug: progressTasks.slug,
        id: progressTasks.id,
        title: progressTasks.title,
        status: progressTasks.status,
        archivedAt: progressTasks.archivedAt,
      })
      .from(progressTasks)
      .where(inArray(progressTasks.slug, slugs))
      .all();

    return taskRows
      .filter((t) => t.archivedAt === null)
      .map((t) => ({
        id: t.id ?? t.slug,
        title: t.title,
        status: t.status,
      }));
  }

  return {
    query(deviceNameFilter) {
      const peers = peerStore.listActive();

      if (peers.length === 0) {
        return Promise.resolve('No devices paired.');
      }

      const devices = peers.map(peerToDevice);

      const filtered =
        deviceNameFilter.length > 0
          ? devices.filter(
              (d) =>
                d.deviceName.toLowerCase().includes(deviceNameFilter.toLowerCase()) ||
                (d.nickname?.toLowerCase().includes(deviceNameFilter.toLowerCase()) ?? false),
            )
          : devices;

      if (filtered.length === 0) {
        return Promise.resolve(`No device found matching "${deviceNameFilter}".`);
      }

      const entries = filtered.map((device) => {
        const tasks = getDeviceState(device) === 'online' ? tasksForPeer(device.id) : [];
        return formatDeviceEntry(device, tasks);
      });

      const header =
        deviceNameFilter.length > 0
          ? `Device status for "${deviceNameFilter}":`
          : `All devices (${String(devices.length)}):`;

      return Promise.resolve(`${header}\n${entries.join('\n')}`);
    },
  };
}
