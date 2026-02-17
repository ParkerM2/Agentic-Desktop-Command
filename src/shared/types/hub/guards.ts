/**
 * Hub Protocol — Type Guard Functions
 */

import type {
  WsCancelCommandEvent,
  WsDeviceOfflineEvent,
  WsDeviceOnlineEvent,
  WsEvent,
  WsExecuteCommandEvent,
  WsExecutionAckEvent,
  WsExecutionStartedEvent,
  WsProjectCreatedEvent,
  WsProjectDeletedEvent,
  WsProjectUpdatedEvent,
  WsTaskCompletedEvent,
  WsTaskCreatedEvent,
  WsTaskDeletedEvent,
  WsTaskProgressEvent,
  WsTaskUpdatedEvent,
  WsWorkspaceCreatedEvent,
  WsWorkspaceDeletedEvent,
  WsWorkspaceUpdatedEvent,
} from './events';

export function isWsTaskEvent(
  event: WsEvent,
): event is
  | WsTaskCreatedEvent
  | WsTaskUpdatedEvent
  | WsTaskDeletedEvent
  | WsTaskProgressEvent
  | WsTaskCompletedEvent {
  return event.type.startsWith('task:');
}

export function isWsDeviceEvent(
  event: WsEvent,
): event is WsDeviceOnlineEvent | WsDeviceOfflineEvent {
  return event.type.startsWith('device:');
}

export function isWsWorkspaceEvent(
  event: WsEvent,
): event is WsWorkspaceCreatedEvent | WsWorkspaceUpdatedEvent | WsWorkspaceDeletedEvent {
  return event.type.startsWith('workspace:');
}

export function isWsProjectEvent(
  event: WsEvent,
): event is WsProjectCreatedEvent | WsProjectUpdatedEvent | WsProjectDeletedEvent {
  return event.type.startsWith('project:');
}

export function isWsCommandEvent(
  event: WsEvent,
): event is WsExecuteCommandEvent | WsCancelCommandEvent {
  return event.type.startsWith('command:');
}

export function isWsExecutionEvent(
  event: WsEvent,
): event is WsExecutionStartedEvent | WsExecutionAckEvent {
  return event.type.startsWith('execution:');
}
