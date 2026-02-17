/**
 * Event Wiring — forwards service events to the renderer via IPC.
 *
 * Handles:
 * - Agent orchestrator session events → IPC events
 * - JSONL progress watcher → granular progress/heartbeat IPC events
 * - Webhook relay → Hub WebSocket → assistant service
 * - Watch evaluator → proactive assistant notifications
 */

import type { IpcRouter } from '../ipc/router';
import type { createAgentOrchestrator } from '../services/agent-orchestrator/agent-orchestrator';
import type { createJsonlProgressWatcher } from '../services/agent-orchestrator/jsonl-progress-watcher';
import type { createWatchEvaluator } from '../services/assistant/watch-evaluator';
import type { createHubConnectionManager } from '../services/hub/hub-connection';
import type { createWebhookRelay } from '../services/hub/webhook-relay';

interface EventWiringDeps {
  router: IpcRouter;
  agentOrchestrator: ReturnType<typeof createAgentOrchestrator>;
  jsonlProgressWatcher: ReturnType<typeof createJsonlProgressWatcher>;
  watchEvaluator: ReturnType<typeof createWatchEvaluator>;
  webhookRelay: ReturnType<typeof createWebhookRelay>;
  hubConnectionManager: ReturnType<typeof createHubConnectionManager>;
}

/** Wires all service events to IPC for renderer consumption. */
export function wireEventForwarding(deps: EventWiringDeps): void {
  const {
    router,
    agentOrchestrator,
    jsonlProgressWatcher,
    watchEvaluator,
    webhookRelay,
    hubConnectionManager,
  } = deps;

  // ─── Orchestrator session events → IPC ───────────────────────
  const HEARTBEAT_EVENT = 'event:agent.orchestrator.heartbeat' as const;

  agentOrchestrator.onSessionEvent((event) => {
    switch (event.type) {
      case 'spawned':
      case 'active':
        router.emit(HEARTBEAT_EVENT, {
          taskId: event.session.taskId,
          timestamp: event.timestamp,
        });
        break;
      case 'completed':
        router.emit('event:agent.orchestrator.stopped', {
          taskId: event.session.taskId,
          reason: 'completed',
          exitCode: event.exitCode ?? 0,
        });
        break;
      case 'error':
        router.emit('event:agent.orchestrator.error', {
          taskId: event.session.taskId,
          error: event.error ?? `Agent exited with code ${String(event.exitCode ?? -1)}`,
        });
        break;
      case 'killed':
        router.emit('event:agent.orchestrator.stopped', {
          taskId: event.session.taskId,
          reason: 'killed',
          exitCode: event.exitCode ?? -1,
        });
        break;
      case 'heartbeat':
        router.emit(HEARTBEAT_EVENT, {
          taskId: event.session.taskId,
          timestamp: event.timestamp,
        });
        break;
    }
  });

  // ─── JSONL progress watcher → IPC ────────────────────────────
  jsonlProgressWatcher.onProgress(({ taskId, entries }) => {
    for (const entry of entries) {
      switch (entry.type) {
        case 'tool_use':
          router.emit('event:agent.orchestrator.progress', {
            taskId,
            type: 'tool_use',
            data: { tool: entry.tool },
            timestamp: entry.timestamp,
          });
          router.emit(HEARTBEAT_EVENT, {
            taskId,
            timestamp: entry.timestamp,
          });
          break;
        case 'phase_change':
          router.emit('event:agent.orchestrator.progress', {
            taskId,
            type: 'phase_change',
            data: {
              phase: entry.phase,
              phaseIndex: String(entry.phaseIndex),
              totalPhases: String(entry.totalPhases),
            },
            timestamp: entry.timestamp,
          });
          break;
        case 'plan_ready':
          router.emit('event:agent.orchestrator.planReady', {
            taskId,
            planSummary: entry.planSummary,
            planFilePath: entry.planFilePath,
          });
          break;
        case 'agent_stopped':
          router.emit('event:agent.orchestrator.stopped', {
            taskId,
            reason: entry.reason,
            exitCode: 0,
          });
          break;
        case 'error':
          router.emit('event:agent.orchestrator.error', {
            taskId,
            error: entry.error,
          });
          break;
        case 'heartbeat':
          router.emit(HEARTBEAT_EVENT, {
            taskId,
            timestamp: entry.timestamp,
          });
          break;
      }
    }
  });

  jsonlProgressWatcher.start();

  // ─── Watch evaluator → proactive assistant notifications ─────
  watchEvaluator.onTrigger((watch) => {
    const description = watch.followUp ?? `${watch.type} watch on ${watch.targetId}`;
    router.emit('event:assistant.proactive', {
      content: `Watch triggered: ${description}`,
      source: 'watch',
      taskId: watch.targetId === '*' ? undefined : watch.targetId,
      followUp: watch.followUp,
    });
  });
  watchEvaluator.start();

  // ─── Webhook relay — Hub WebSocket → assistant service ───────
  hubConnectionManager.onWebSocketMessage((data) => {
    webhookRelay.handleHubMessage(data);
  });
}
