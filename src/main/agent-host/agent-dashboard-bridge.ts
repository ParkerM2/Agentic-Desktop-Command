/**
 * Agent Dashboard Event Bridge
 *
 * Translates AgentManagerEvent envelopes (from the utility-process agent host)
 * into AGENT_DASHBOARD_EVENTS IPC events on the renderer-facing router.
 *
 * Event.data payloads are aligned by AgentManagerService to match each channel's
 * Zod contract, so this module is a pure type → channel mapping.
 */

import { AGENT_DASHBOARD_EVENTS } from '@shared/ipc/agent-dashboard/channels';
import type { EventChannel, EventPayload } from '@shared/ipc-contract';

import type { AgentManagerEvent } from '../services/agent-manager/agent-manager-service';

type EmitFn = <T extends EventChannel>(channel: T, payload: EventPayload<T>) => void;

interface AgentManagerLike {
  onEvent: (handler: (event: AgentManagerEvent) => void) => () => void;
}

interface RouterLike {
  emit: EmitFn;
}

const CHANNEL_BY_TYPE: Record<AgentManagerEvent['type'], EventChannel> = {
  'session.started': AGENT_DASHBOARD_EVENTS.SESSION.STARTED,
  'session.ended': AGENT_DASHBOARD_EVENTS.SESSION.ENDED,
  'status.changed': AGENT_DASHBOARD_EVENTS.SESSION['STATUS-CHANGED'],
  'message.received': AGENT_DASHBOARD_EVENTS.MESSAGE.RECEIVED,
  'stream.event': AGENT_DASHBOARD_EVENTS.STREAM.EVENT,
};

export function forwardAgentManagerEvent(event: AgentManagerEvent, emit: EmitFn): void {
  const channel = (CHANNEL_BY_TYPE as Partial<Record<string, EventChannel>>)[event.type];
  if (!channel) return;
  emit(channel, event.data as EventPayload<typeof channel>);
}

export function wireAgentDashboardBridge(
  agentManager: AgentManagerLike,
  router: RouterLike,
): () => void {
  return agentManager.onEvent((event) => {
    forwardAgentManagerEvent(event, router.emit.bind(router));
  });
}
