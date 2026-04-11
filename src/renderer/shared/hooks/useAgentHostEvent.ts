/**
 * useAgentHostEvent — Subscribe to agent host events via direct MessagePort.
 *
 * Events bypass the main process entirely for low-latency streaming.
 * Uses the `window.agentHost.onEvent()` bridge set up in the preload.
 *
 * @example
 * useAgentHostEvent('message.received', (event) => {
 *   console.log(event.sessionId, event.data);
 * });
 *
 * @example
 * useAgentHostEvent(['session.started', 'session.ended'], (event) => {
 *   // handle multiple event types
 * });
 */

import { useEffect, useRef } from 'react';

export type AgentHostEventType =
  | 'session.started'
  | 'session.ended'
  | 'message.received'
  | 'status.changed'
  | 'stream.event';

export interface AgentHostEvent {
  type: AgentHostEventType;
  sessionId: string;
  data: unknown;
}

export function useAgentHostEvent(
  eventType: AgentHostEventType | AgentHostEventType[],
  callback: (event: AgentHostEvent) => void,
): void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const types = Array.isArray(eventType) ? eventType : [eventType];
    return window.agentHost.onEvent((raw) => {
      const event = raw as AgentHostEvent;
      if (types.includes(event.type)) {
        callbackRef.current(event);
      }
    });
  }, [eventType]);
}
