/**
 * EventBridge — Centralized IPC event-to-React-Query invalidation bridge.
 *
 * Mounted once in RootLayout. Subscribes to every IPC event channel that
 * affects cached data and invalidates the corresponding React Query keys.
 *
 * Replaces the ad-hoc hub-query-sync approach and scattered useIpcEvent
 * calls with a single declarative registry. To add a new event-to-cache
 * mapping, add an entry to EVENT_REGISTRY below.
 *
 * Renders null — purely side-effect.
 */

import { useEffect } from 'react';

import { type QueryClient, useQueryClient } from '@tanstack/react-query';

import type { EventChannel } from '@shared/ipc-contract';
import type { AgentChatMessage, ContentBlock } from '@shared/types/agent-dashboard';

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
  /** React Query key prefixes to invalidate when the event fires. */
  readonly keys: ReadonlyArray<readonly string[]>;
  /**
   * Handler strategy:
   * - 'invalidate' (default): invalidates matching query keys
   * - 'append': writes event payload into the cache directly
   */
  readonly handler?: 'invalidate' | 'append';
}

// ─── Helpers ────────────────────────────────────────────────

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
const TASKS = ['tasks'] as const;
const AGENT_SESSIONS = ['agent-sessions'] as const;
const WORKSPACE_SESSIONS = ['workspace-sessions'] as const;
const WORKFLOW_TEMPLATES = ['workflowTemplates'] as const;
const WORKFLOW_ENGINE = ['workflow-engine'] as const;

// ─── Registry ───────────────────────────────────────────────

const EVENT_REGISTRY: Partial<Record<EventChannel, RegistryEntry>> = {
  // Progress pipeline events
  'event:progress.taskCreated': { keys: [PROGRESS_LIST] },
  'event:progress.taskUpdated': { keys: [PROGRESS_LIST, ['progress', 'detail']] },
  'event:progress.taskArchived': { keys: [PROGRESS_LIST, ['progress', 'archived']] },
  'event:progress.actionStarted': { keys: [PROGRESS_LIST, ['progress', 'sessions']] },
  'event:progress.actionCompleted': { keys: [PROGRESS_LIST, ['progress', 'sessions']] },
  'event:progress.actionFailed': { keys: [PROGRESS_LIST, ['progress', 'sessions']] },
  'event:progress.workflowStep': { keys: [PROGRESS_LIST] },

  // Hub entity events
  'event:hub.tasks.created': { keys: [TASKS] },
  'event:hub.tasks.updated': { keys: [TASKS] },
  'event:hub.tasks.deleted': { keys: [TASKS] },
  'event:hub.tasks.completed': { keys: [TASKS] },
  'event:hub.tasks.progress': { keys: [TASKS] },
  'event:hub.devices.online': { keys: [['devices']] },
  'event:hub.devices.offline': { keys: [['devices']] },
  'event:hub.workspaces.updated': { keys: [['workspaces']] },
  'event:hub.projects.updated': { keys: [['projects']] },
  'event:hub.connectionChanged': { keys: [['hub', 'status']] },

  // Agent dashboard events
  'event:agent-dashboard.sessionStarted': { keys: [AGENT_SESSIONS] },
  'event:agent-dashboard.sessionEnded': { keys: [AGENT_SESSIONS] },
  'event:agent-dashboard.statusChanged': { keys: [AGENT_SESSIONS] },
  'event:agent-dashboard.messageReceived': { keys: [['agent-messages']], handler: 'append' },

  // Workspace events
  'event:workspace.sessionReady': { keys: [WORKSPACE_SESSIONS] },
  'event:workspace.sessionCrashed': { keys: [WORKSPACE_SESSIONS] },
  'event:workspace.sessionRestarted': { keys: [WORKSPACE_SESSIONS] },
  'event:workspace.planHandedOff': { keys: [WORKSPACE_SESSIONS] },

  // Workflow template events
  'event:workflowTemplates.created': { keys: [WORKFLOW_TEMPLATES] },
  'event:workflowTemplates.updated': { keys: [WORKFLOW_TEMPLATES] },
  'event:workflowTemplates.deleted': { keys: [WORKFLOW_TEMPLATES] },

  // Workflow engine events
  'event:workflow-engine.stateChanged': { keys: [WORKFLOW_ENGINE] },
  'event:workflow-engine.completed': { keys: [WORKFLOW_ENGINE] },
  'event:workflow-engine.error': { keys: [WORKFLOW_ENGINE] },

  // Task status events
  'event:task.statusChanged': { keys: [TASKS] },
};

// ─── Append Handlers ────────────────────────────────────────

/**
 * Route an 'append' event to the correct cache-write logic.
 * Each event channel that uses `handler: 'append'` needs a case here.
 */
function handleAppend(queryClient: QueryClient, event: EventChannel, payload: unknown) {
  if (event === 'event:agent-dashboard.messageReceived') {
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
          for (const key of entry.keys) {
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
