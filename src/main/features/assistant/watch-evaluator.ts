/**
 * Watch Evaluator — Checks incoming IPC events against active watches
 *
 * Subscribes to Hub WebSocket-forwarded events (task updates, device heartbeats)
 * and evaluates them against all active watches. When a match is found, the watch
 * is marked triggered and a callback is fired.
 */

import { ipcMain } from 'electron';

import type { AssistantWatch } from '@shared/types';

import type { WatchStore } from './watch-store';

type TriggerHandler = (watch: AssistantWatch, eventData: unknown) => void;

export interface WatchEvaluator {
  start: () => void;
  stop: () => void;
  onTrigger: (handler: TriggerHandler) => void;
}

interface EventInfo {
  channel: string;
  getTargetId: (payload: Record<string, unknown>) => string | undefined;
  getField: (payload: Record<string, unknown>) => string | undefined;
}

/** Map watch types to the IPC event channels they monitor. */
const WATCH_EVENT_MAP: EventInfo[] = [
  {
    channel: 'event:hub.tasks.updated',
    getTargetId: (p) => p.taskId as string | undefined,
    getField: () => 'updated', // generic update — use 'changes' operator
  },
  {
    channel: 'event:hub.tasks.completed',
    getTargetId: (p) => p.taskId as string | undefined,
    getField: (p) => p.result as string | undefined,
  },
  {
    channel: 'event:task.statusChanged',
    getTargetId: (p) => p.taskId as string | undefined,
    getField: (p) => p.status as string | undefined,
  },
  {
    channel: 'event:hub.devices.online',
    getTargetId: (p) => p.deviceId as string | undefined,
    getField: (_p) => 'online',
  },
  {
    channel: 'event:hub.devices.offline',
    getTargetId: (p) => p.deviceId as string | undefined,
    getField: (_p) => 'offline',
  },
  {
    channel: 'event:agent.orchestrator.error',
    getTargetId: (p) => p.taskId as string | undefined,
    getField: (_p) => 'error',
  },
  {
    channel: 'event:agent.orchestrator.stopped',
    getTargetId: (p) => p.taskId as string | undefined,
    getField: (p) => p.reason as string | undefined,
  },
];

function matchesWatch(
  watch: AssistantWatch,
  targetId: string | undefined,
  fieldValue: string | undefined,
): boolean {
  // Target must match (or watch targets '*' for any)
  if (watch.targetId !== '*' && watch.targetId !== targetId) {
    return false;
  }

  const { operator, value } = watch.condition;

  switch (operator) {
    case 'equals':
      return fieldValue === value;
    case 'changes':
      return fieldValue !== undefined;
    case 'any':
      return true;
    default:
      return false;
  }
}

export function createWatchEvaluator(watchStore: WatchStore): WatchEvaluator {
  const handlers: TriggerHandler[] = [];
  const listeners: Array<() => void> = [];

  function handleEvent(eventInfo: EventInfo, payload: Record<string, unknown>): void {
    const targetId = eventInfo.getTargetId(payload);
    const fieldValue = eventInfo.getField(payload);

    const activeWatches = watchStore.getActive();

    for (const watch of activeWatches) {
      if (matchesWatch(watch, targetId, fieldValue)) {
        watchStore.markTriggered(watch.id);
        for (const handler of handlers) {
          handler(watch, payload);
        }
      }
    }
  }

  return {
    start() {
      for (const eventInfo of WATCH_EVENT_MAP) {
        const listener = (_event: unknown, payload: unknown): void => {
          handleEvent(eventInfo, payload as Record<string, unknown>);
        };
        ipcMain.on(eventInfo.channel, listener);
        listeners.push(() => {
          ipcMain.removeListener(eventInfo.channel, listener);
        });
      }
    },

    stop() {
      for (const remove of listeners) {
        remove();
      }
      listeners.length = 0;
    },

    onTrigger(handler) {
      handlers.push(handler);
    },
  };
}
