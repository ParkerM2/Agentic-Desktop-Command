/**
 * Event Wiring — forwards service events to the renderer via IPC.
 *
 * Handles:
 * - Agent orchestrator session events → IPC events
 * - Planning completion → plan file detection → Hub status update
 * - JSONL progress watcher → granular progress/heartbeat IPC events
 * - Webhook relay → Hub WebSocket → assistant service
 * - Watch evaluator → proactive assistant notifications
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { appLogger } from '../lib/logger';

import type { IpcRouter } from '../ipc/router';
import type { createAgentOrchestrator } from '../services/agent-orchestrator/agent-orchestrator';
import type { createJsonlProgressWatcher } from '../services/agent-orchestrator/jsonl-progress-watcher';
import type { createWatchEvaluator } from '../services/assistant/watch-evaluator';
import type { createHubConnectionManager } from '../services/hub/hub-connection';
import type { createWebhookRelay } from '../services/hub/webhook-relay';
import type { TaskRepository } from '../services/tasks/types';

interface EventWiringDeps {
  router: IpcRouter;
  agentOrchestrator: ReturnType<typeof createAgentOrchestrator>;
  jsonlProgressWatcher: ReturnType<typeof createJsonlProgressWatcher>;
  watchEvaluator: ReturnType<typeof createWatchEvaluator>;
  webhookRelay: ReturnType<typeof createWebhookRelay>;
  hubConnectionManager: ReturnType<typeof createHubConnectionManager>;
  taskRepository: TaskRepository;
}

/**
 * Scans for a plan file produced by the planning agent.
 *
 * Checks two locations in order:
 * 1. The agent's log file for a `PLAN_FILE:<path>` output line
 * 2. The `docs/plans/` directory for recently created `*-plan.md` files
 *
 * Returns `{ filePath, content }` or `null` if no plan file found.
 */
function detectPlanFile(
  projectPath: string,
  logFile: string,
): { filePath: string; content: string } | null {
  // Strategy 1: Scan the agent log for PLAN_FILE: marker
  try {
    if (existsSync(logFile)) {
      const logContent = readFileSync(logFile, 'utf-8');
      const lines = logContent.split('\n');
      for (let i = lines.length - 1; i >= 0; i--) {
        const match = /PLAN_FILE:(.+)/.exec(lines[i]?.trim() ?? '');
        if (match?.[1]) {
          const planPath = join(projectPath, match[1].trim());
          if (existsSync(planPath)) {
            return {
              filePath: match[1].trim(),
              content: readFileSync(planPath, 'utf-8'),
            };
          }
        }
      }
    }
  } catch {
    // Log may be gone if cleanup ran first — continue to fallback
  }

  // Strategy 2: Scan docs/plans/ for *-plan.md files (most recent first)
  const plansDir = join(projectPath, 'docs', 'plans');
  try {
    if (existsSync(plansDir)) {
      const planFiles = readdirSync(plansDir)
        .filter((f) => f.endsWith('-plan.md'))
        .sort()
        .reverse();

      if (planFiles.length > 0) {
        const filePath = `docs/plans/${planFiles[0]}`;
        const fullPath = join(plansDir, planFiles[0]);
        return {
          filePath,
          content: readFileSync(fullPath, 'utf-8'),
        };
      }
    }
  } catch {
    // Directory may not exist — no plan found
  }

  return null;
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
    taskRepository,
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

        // ── Planning completion: detect plan file → update Hub → emit planReady ──
        if (event.session.phase === 'planning') {
          void (async () => {
            try {
              const plan = detectPlanFile(event.session.projectPath, event.session.logFile);
              if (plan) {
                // Update Hub task: status → plan_ready, store plan in metadata
                await taskRepository.updateTaskStatus(event.session.taskId, 'plan_ready');
                await taskRepository.updateTask(event.session.taskId, {
                  metadata: {
                    planContent: plan.content,
                    planFilePath: plan.filePath,
                  },
                });

                router.emit('event:agent.orchestrator.planReady', {
                  taskId: event.session.taskId,
                  planSummary: plan.content.slice(0, 500),
                  planFilePath: plan.filePath,
                });
              }
            } catch (error) {
              const message = error instanceof Error ? error.message : 'Unknown error';
              appLogger.warn('[EventWiring] Planning completion handler error:', message);
            }
          })();
        }
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
