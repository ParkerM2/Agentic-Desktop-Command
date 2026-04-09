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

import { AGENT_DASHBOARD_EVENTS } from '@shared/ipc/agent-dashboard/channels';
import { HUB_EVENTS } from '@shared/ipc/hub/channels';
import { PROGRESS_EVENTS } from '@shared/ipc/progress/channels';
import { HUB_TASKS_EVENTS, TASKS_EVENTS } from '@shared/ipc/tasks/channels';
import { WORKFLOW_ENGINE_EVENTS } from '@shared/ipc/workflow-engine/channels';
import { WORKFLOW_TEMPLATES_EVENTS } from '@shared/ipc/workflow-templates/channels';
import { WORKSPACE_EVENTS } from '@shared/ipc/workspace/channels';
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
  [PROGRESS_EVENTS.TASK.CREATED]: { keys: [PROGRESS_LIST] },
  [PROGRESS_EVENTS.TASK.UPDATED]: { keys: [PROGRESS_LIST, ['progress', 'detail']] },
  [PROGRESS_EVENTS.TASK.ARCHIVED]: { keys: [PROGRESS_LIST, ['progress', 'archived']] },
  [PROGRESS_EVENTS.ACTION.STARTED]: { keys: [PROGRESS_LIST, ['progress', 'sessions']] },
  [PROGRESS_EVENTS.ACTION.COMPLETED]: { keys: [PROGRESS_LIST, ['progress', 'sessions']] },
  [PROGRESS_EVENTS.ACTION.FAILED]: { keys: [PROGRESS_LIST, ['progress', 'sessions']] },
  [PROGRESS_EVENTS.WORKFLOW.STEP]: { keys: [PROGRESS_LIST] },

  // Hub entity events
  [HUB_TASKS_EVENTS.TASK.CREATED]: { keys: [TASKS] },
  [HUB_TASKS_EVENTS.TASK.UPDATED]: { keys: [TASKS] },
  [HUB_TASKS_EVENTS.TASK.DELETED]: { keys: [TASKS] },
  [HUB_TASKS_EVENTS.TASK_RUN.COMPLETED]: { keys: [TASKS] },
  [HUB_TASKS_EVENTS.PROGRESS.UPDATED]: { keys: [TASKS] },
  [HUB_EVENTS.DEVICE.ONLINE]: { keys: [['devices']] },
  [HUB_EVENTS.DEVICE.OFFLINE]: { keys: [['devices']] },
  [HUB_EVENTS.WORKSPACE.UPDATED]: { keys: [['workspaces']] },
  [HUB_EVENTS.PROJECT.UPDATED]: { keys: [['projects']] },
  [HUB_EVENTS.CONNECTION.CHANGED]: { keys: [['hub', 'status']] },

  // Agent dashboard events
  [AGENT_DASHBOARD_EVENTS.SESSION.STARTED]: { keys: [AGENT_SESSIONS] },
  [AGENT_DASHBOARD_EVENTS.SESSION.ENDED]: { keys: [AGENT_SESSIONS] },
  [AGENT_DASHBOARD_EVENTS.SESSION['STATUS-CHANGED']]: { keys: [AGENT_SESSIONS] },
  [AGENT_DASHBOARD_EVENTS.MESSAGE.RECEIVED]: { keys: [['agent-messages']], handler: 'append' },

  // Workspace events
  [WORKSPACE_EVENTS.SESSION.READY]: { keys: [WORKSPACE_SESSIONS] },
  [WORKSPACE_EVENTS.SESSION.CRASHED]: { keys: [WORKSPACE_SESSIONS] },
  [WORKSPACE_EVENTS.SESSION.RESTARTED]: { keys: [WORKSPACE_SESSIONS] },
  [WORKSPACE_EVENTS.PLAN['HANDED-OFF']]: { keys: [WORKSPACE_SESSIONS] },

  // Workflow template events
  [WORKFLOW_TEMPLATES_EVENTS.TEMPLATE.CREATED]: { keys: [WORKFLOW_TEMPLATES] },
  [WORKFLOW_TEMPLATES_EVENTS.TEMPLATE.UPDATED]: { keys: [WORKFLOW_TEMPLATES] },
  [WORKFLOW_TEMPLATES_EVENTS.TEMPLATE.DELETED]: { keys: [WORKFLOW_TEMPLATES] },

  // Workflow engine events
  [WORKFLOW_ENGINE_EVENTS.STATE.CHANGED]: { keys: [WORKFLOW_ENGINE] },
  [WORKFLOW_ENGINE_EVENTS.RUN.COMPLETED]: { keys: [WORKFLOW_ENGINE] },
  [WORKFLOW_ENGINE_EVENTS.RUN.ERROR]: { keys: [WORKFLOW_ENGINE] },

  // Task status events
  [TASKS_EVENTS.STATUS.CHANGED]: { keys: [TASKS] },
};

// ─── Append Handlers ────────────────────────────────────────

/**
 * Route an 'append' event to the correct cache-write logic.
 * Each event channel that uses `handler: 'append'` needs a case here.
 */
function handleAppend(queryClient: QueryClient, event: EventChannel, payload: unknown) {
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
