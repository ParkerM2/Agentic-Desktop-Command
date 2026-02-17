/**
 * Hub Event Mapper
 *
 * Maps WebSocket event payloads to typed IPC events.
 * Converts persisted config to HubConnection view objects.
 */

import type { HubConnection, HubConnectionStatus } from '@shared/types';

import { decryptApiKey } from './hub-config-store';

import type { PersistedHubConfig } from './hub-config-store';
import type { IpcRouter } from '../../ipc/router';

export interface WsEventData {
  type: string;
  entity: string;
  action: string;
  id: string;
  data?: Record<string, unknown>;
}

export function configToConnection(
  config: PersistedHubConfig,
  status: HubConnectionStatus,
): HubConnection {
  return {
    hubUrl: config.hubUrl,
    apiKey: decryptApiKey(config.encryptedApiKey),
    enabled: config.enabled,
    lastConnected: config.lastConnected,
    status,
  };
}

function emitTaskEvent(
  emitter: IpcRouter,
  eventData: WsEventData,
): void {
  const projectId =
    (eventData.data?.projectId as string | undefined) ??
    (eventData.data?.project_id as string | undefined) ??
    '';
  const taskPayload = { taskId: eventData.id, projectId };

  if (eventData.action === 'created') {
    emitter.emit('event:hub.tasks.created', taskPayload);
  } else if (eventData.action === 'deleted') {
    emitter.emit('event:hub.tasks.deleted', taskPayload);
  } else if (eventData.action === 'completed') {
    const rawResult = eventData.data?.result;
    emitter.emit('event:hub.tasks.completed', {
      ...taskPayload,
      result: rawResult === 'failure' ? 'failure' : 'success',
    });
  } else if (eventData.action === 'progress') {
    emitter.emit('event:hub.tasks.progress', {
      taskId: eventData.id,
      progress: typeof eventData.data?.progress === 'number' ? eventData.data.progress : 0,
      phase: typeof eventData.data?.phase === 'string' ? eventData.data.phase : '',
    });
  } else {
    // Default: updated (covers status changes, field edits, etc.)
    emitter.emit('event:hub.tasks.updated', taskPayload);
  }
}

export function routeWebSocketEvent(
  emitter: IpcRouter,
  eventData: WsEventData,
): void {
  switch (eventData.entity) {
    case 'tasks':
      emitTaskEvent(emitter, eventData);
      break;

    case 'projects':
      emitter.emit('event:hub.projects.updated', { projectId: eventData.id });
      break;

    case 'workspaces':
      emitter.emit('event:hub.workspaces.updated', { workspaceId: eventData.id });
      break;

    case 'devices':
      if (eventData.action === 'online') {
        emitter.emit('event:hub.devices.online', {
          deviceId: eventData.id,
          name: typeof eventData.data?.name === 'string' ? eventData.data.name : '',
        });
      } else if (eventData.action === 'offline') {
        emitter.emit('event:hub.devices.offline', { deviceId: eventData.id });
      }
      break;

    default:
      // Fallback for unknown entities
      emitter.emit('event:project.updated', { projectId: eventData.id });
      break;
  }
}
