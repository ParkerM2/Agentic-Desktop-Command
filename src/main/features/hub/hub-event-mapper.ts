/**
 * Hub Event Mapper
 *
 * Maps WebSocket event payloads to typed IPC events.
 * Converts persisted config to HubConnection view objects.
 */


import { HUB_EVENTS } from '@shared/ipc/hub/channels';
import { HUB_TASKS_EVENTS } from '@shared/ipc/hub-tasks/channels';
import { PROJECTS_EVENTS } from '@shared/ipc/projects/channels';
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
    emitter.emit(HUB_TASKS_EVENTS.TASK.CREATED, taskPayload);
  } else if (eventData.action === 'deleted') {
    emitter.emit(HUB_TASKS_EVENTS.TASK.DELETED, taskPayload);
  } else if (eventData.action === 'completed') {
    const rawResult = eventData.data?.result;
    emitter.emit(HUB_TASKS_EVENTS.TASK_RUN.COMPLETED, {
      ...taskPayload,
      result: rawResult === 'failure' ? 'failure' : 'success',
    });
  } else if (eventData.action === 'progress') {
    emitter.emit(HUB_TASKS_EVENTS.PROGRESS.UPDATED, {
      taskId: eventData.id,
      progress: typeof eventData.data?.progress === 'number' ? eventData.data.progress : 0,
      phase: typeof eventData.data?.phase === 'string' ? eventData.data.phase : '',
    });
  } else {
    // Default: updated (covers status changes, field edits, etc.)
    emitter.emit(HUB_TASKS_EVENTS.TASK.UPDATED, taskPayload);
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
      emitter.emit(HUB_EVENTS.PROJECT.UPDATED, { projectId: eventData.id });
      break;

    case 'workspaces':
      emitter.emit(HUB_EVENTS.WORKSPACE.UPDATED, { workspaceId: eventData.id });
      break;

    case 'devices':
      if (eventData.action === 'online') {
        emitter.emit(HUB_EVENTS.DEVICE.ONLINE, {
          deviceId: eventData.id,
          name: typeof eventData.data?.name === 'string' ? eventData.data.name : '',
        });
      } else if (eventData.action === 'offline') {
        emitter.emit(HUB_EVENTS.DEVICE.OFFLINE, { deviceId: eventData.id });
      }
      break;

    default:
      // Fallback for unknown entities
      emitter.emit(PROJECTS_EVENTS.PROJECT.UPDATED, { projectId: eventData.id });
      break;
  }
}
