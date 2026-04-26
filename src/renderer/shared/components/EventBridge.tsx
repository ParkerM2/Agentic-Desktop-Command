/**
 * EventBridge — Centralized IPC event-to-React-Query invalidation bridge.
 *
 * Mounted once in RootLayout. Subscribes to every IPC event channel that
 * affects cached data and invalidates the corresponding React Query keys.
 *
 * Provides a single declarative registry replacing scattered useIpcEvent
 * calls. To add a new event-to-cache mapping, add an entry to
 * EVENT_REGISTRY below.
 *
 * Renders null — purely side-effect.
 */

import { useEffect } from 'react';

import { type QueryClient, useQueryClient } from '@tanstack/react-query';

import { AGENT_DASHBOARD_EVENTS } from '@shared/ipc/agent-dashboard/channels';
import { BUS_EVENTS } from '@shared/ipc/bus/channels';
import type { sessionRecordSchema } from '@shared/ipc/bus/schemas';
// peerKeys lives in @shared/ipc/peers so EventBridge can use it without
// crossing the renderer's shared->features boundary (audit 05/T13).
import { peerKeys, PEERS_EVENTS } from '@shared/ipc/peers';
import type { DiscoveredPeer } from '@shared/ipc/peers';
import { PROGRESS_EVENTS } from '@shared/ipc/progress/channels';
import type { AgentTeamsDataSchema } from '@shared/ipc/visualization/schemas';
import { WORKFLOW_ENGINE_EVENTS } from '@shared/ipc/workflow-engine/channels';
import { WORKFLOW_TEMPLATES_EVENTS } from '@shared/ipc/workflow-templates/channels';
import type { EventChannel } from '@shared/ipc-contract';
import type { AgentChatMessage, ContentBlock } from '@shared/types/agent-dashboard';

import type { z } from 'zod';

type AgentTeamsData = z.infer<typeof AgentTeamsDataSchema>;
type SessionRecord = z.infer<typeof sessionRecordSchema>;

// ─── Exported Types ─────────────────────────────────────────

/** Lightweight message preview stored in the React Query cache. */
export interface AgentMessagePreview {
  id: string;
  role: string;
  preview: string;
  timestamp: string;
}

// ─── Types ──────────────────────────────────────────────────

interface RegistryEntry {
  /** React Query key prefixes to invalidate when the event fires. Not used by 'append' handlers. */
  readonly keys?: ReadonlyArray<readonly string[]>;
  /**
   * Handler strategy:
   * - 'invalidate' (default): invalidates matching query keys
   * - 'append': writes event payload into the cache directly
   */
  readonly handler?: 'invalidate' | 'append';
}

// ─── Helpers ────────────────────────────────────────────────

/** Map bus SessionRecord.status to visualization AgentStatus */
function sessionStatusToAgentStatus(
  status: string,
): 'pending' | 'active' | 'idle' | 'completed' | 'error' | 'killed' {
  switch (status) {
    case 'spawned': return 'pending';
    case 'active': return 'active';
    case 'completed': return 'completed';
    case 'error': return 'error';
    case 'killed': return 'killed';
    default: return 'idle';
  }
}

const BUS_SESSION_EVENTS = new Set<string>([
  BUS_EVENTS.SESSION.SPAWNED,
  BUS_EVENTS.SESSION.ACTIVE,
  BUS_EVENTS.SESSION.COMPLETED,
  BUS_EVENTS.SESSION.ERROR,
  BUS_EVENTS.SESSION.KILLED,
]);

/** Extract a text preview from content blocks (max 200 chars). */
function extractTextPreview(content: ContentBlock[]): string {
  for (const block of content) {
    if (block.type === 'text' && block.text.length > 0) {
      return block.text.length > 200 ? `${block.text.slice(0, 200)}\u2026` : block.text;
    }
  }
  return '';
}

// ─── Shared Key Constants ───────────────────────────────────

const PROGRESS_LIST = ['progress', 'list'] as const;
const AGENT_SESSIONS = ['agent-dashboard', 'sessions'] as const;
const WORKFLOW_TEMPLATES = ['workflowTemplates'] as const;
const WORKFLOW_ENGINE = ['workflow-engine'] as const;

// ─── Registry ───────────────────────────────────────────────

const EVENT_REGISTRY: Partial<Record<EventChannel, RegistryEntry>> = {
  // Progress pipeline events
  [PROGRESS_EVENTS.TASK.CREATED]: { keys: [PROGRESS_LIST] },
  [PROGRESS_EVENTS.TASK.UPDATED]: { keys: [PROGRESS_LIST, ['progress', 'detail']] },
  [PROGRESS_EVENTS.TASK.ARCHIVED]: { keys: [PROGRESS_LIST, ['progress', 'archived']] },
  [PROGRESS_EVENTS.ACTION.STARTED]: { keys: [PROGRESS_LIST, ['progress', 'sessions']] },
  [PROGRESS_EVENTS.ACTION.COMPLETED]: { keys: [PROGRESS_LIST, ['progress', 'sessions']] },
  [PROGRESS_EVENTS.ACTION.FAILED]: { keys: [PROGRESS_LIST, ['progress', 'sessions']] },
  [PROGRESS_EVENTS.WORKFLOW.STEP]: { keys: [PROGRESS_LIST] },

  // Agent dashboard events
  [AGENT_DASHBOARD_EVENTS.SESSION.STARTED]: { keys: [AGENT_SESSIONS] },
  [AGENT_DASHBOARD_EVENTS.SESSION.ENDED]: { keys: [AGENT_SESSIONS] },
  [AGENT_DASHBOARD_EVENTS.SESSION['STATUS-CHANGED']]: { keys: [AGENT_SESSIONS] },
  [AGENT_DASHBOARD_EVENTS.MESSAGE.RECEIVED]: { keys: [['agent-messages']], handler: 'append' },

  // Workflow template events
  [WORKFLOW_TEMPLATES_EVENTS.TEMPLATE.CREATED]: { keys: [WORKFLOW_TEMPLATES] },
  [WORKFLOW_TEMPLATES_EVENTS.TEMPLATE.UPDATED]: { keys: [WORKFLOW_TEMPLATES] },
  [WORKFLOW_TEMPLATES_EVENTS.TEMPLATE.DELETED]: { keys: [WORKFLOW_TEMPLATES] },

  // Workflow engine events
  [WORKFLOW_ENGINE_EVENTS.STATE.CHANGED]: { keys: [WORKFLOW_ENGINE] },
  [WORKFLOW_ENGINE_EVENTS.RUN.COMPLETED]: { keys: [WORKFLOW_ENGINE] },
  [WORKFLOW_ENGINE_EVENTS.RUN.ERROR]: { keys: [WORKFLOW_ENGINE] },

  // Bus session events — update visualization agent nodes in-place
  [BUS_EVENTS.SESSION.SPAWNED]: { handler: 'append' as const },
  [BUS_EVENTS.SESSION.ACTIVE]: { handler: 'append' as const },
  [BUS_EVENTS.SESSION.COMPLETED]: { handler: 'append' as const },
  [BUS_EVENTS.SESSION.ERROR]: { handler: 'append' as const },
  [BUS_EVENTS.SESSION.KILLED]: { handler: 'append' as const },

  // Peer discovery + trust events
  [PEERS_EVENTS.DISCOVERY.CHANGED]: { handler: 'append' as const },
  [PEERS_EVENTS.TRUST.CHANGED]: { keys: [peerKeys.paired()] },
};

// ─── Append Handlers ────────────────────────────────────────

/**
 * Route an 'append' event to the correct cache-write logic.
 * Each event channel that uses `handler: 'append'` needs a case here.
 */
function handleAppend(queryClient: QueryClient, event: EventChannel, payload: unknown) {
  if (event === PEERS_EVENTS.DISCOVERY.CHANGED) {
    const { peers } = payload as { peers: DiscoveredPeer[] };
    queryClient.setQueryData<DiscoveredPeer[]>(peerKeys.discovered(), peers);
    return;
  }

  if (event === AGENT_DASHBOARD_EVENTS.MESSAGE.RECEIVED) {
    const message = payload as AgentChatMessage;

    // Only extract previews from assistant messages
    if (message.role !== 'assistant') return;
    const preview = extractTextPreview(message.content);
    if (preview.length === 0) return;

    queryClient.setQueryData<AgentMessagePreview[]>(
      ['agent-messages', message.agentId],
      (old) => {
        const existing = old ?? [];
        // Deduplicate by message ID
        if (existing.some((m) => m.id === message.id)) return existing;
        return [
          ...existing,
          { id: message.id, role: message.role, preview, timestamp: message.timestamp },
        ].slice(-50);
      },
    );
  }

  if (BUS_SESSION_EVENTS.has(event)) {
    const { sessionId, session } = payload as { sessionId: string; session: SessionRecord };
    if (!session.projectId) return;

    const agentStatus = sessionStatusToAgentStatus(session.status);

    queryClient.setQueryData<AgentTeamsData>(
      ['visualization', 'agents', session.projectId],
      (old) => {
        if (!old) return old;
        return {
          ...old,
          features: old.features.map((f) => ({
            ...f,
            tasks: f.tasks.map((t) =>
              t.lastSid === sessionId || (session.taskSlug !== null && t.taskSlug === session.taskSlug)
                ? { ...t, status: agentStatus, lastSid: sessionId }
                : t,
            ),
          })),
        };
      },
    );
  }
}

// ─── Component ──────────────────────────────────────────────

export function EventBridge() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Guard: window.api only exists in Electron (preload bridge)
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/strict-boolean-expressions
    if (typeof window === 'undefined' || !window.api) {
      return;
    }

    const cleanups: Array<() => void> = [];

    for (const [event, entry] of Object.entries(EVENT_REGISTRY)) {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/strict-boolean-expressions -- Partial<Record> values can be undefined at runtime
      if (!entry) continue;

      const typedEvent = event as EventChannel;

      if (entry.handler === 'append') {
        // Append handler: write event payload directly into cache.
        // We use the same typed callback signature as invalidate entries
        // but route the payload through handleAppend for cache writes.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- payload routed to type-narrowing handleAppend
        const cleanup = (window.api.on as (ch: EventChannel, fn: (p: any) => void) => () => void)(
          typedEvent,
          (payload: unknown) => { handleAppend(queryClient, typedEvent, payload); },
        );
        cleanups.push(cleanup);
      } else {
        // Default: invalidate matching query keys
        const cleanup = window.api.on(typedEvent, () => {
          for (const key of (entry.keys ?? [])) {
            void queryClient.invalidateQueries({ queryKey: [...key] });
          }
        });
        cleanups.push(cleanup);
      }
    }

    return () => {
      for (const cleanup of cleanups) {
        cleanup();
      }
    };
  }, [queryClient]);

  return null;
}
