/**
 * useHubEvent — Subscribe to Hub WebSocket events via IPC.
 *
 * Thin wrapper around useIpcEvent that restricts channels to hub entity events.
 */

import type { EventChannel, EventPayload } from '@shared/ipc-contract';

import { useIpcEvent } from './useIpcEvent';

/** Extract only hub-prefixed event channels (includes hub-tasks) */
type HubEventChannel = Extract<EventChannel, `event:hub.${string}` | `event:hub-tasks.${string}`>;

/** Subscribe to a Hub event with typed payload */
export function useHubEvent<T extends HubEventChannel>(
  channel: T,
  handler: (payload: EventPayload<T>) => void,
): void {
  useIpcEvent(channel, handler);
}
