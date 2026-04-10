/**
 * Unified Workflow IPC Handlers
 *
 * Registers all workflow-related IPC channels:
 *   1. Workflow watcher channels (JSONL + legacy markdown progress)
 *   2. Workflow engine channels (state machine: start/stop/get/list)
 *   3. Workflow template channels (CRUD + artifact operations)
 *
 * No business logic here — all logic delegates to services.
 */

import { TASKS_EVENTS } from '@shared/ipc/tasks/channels';
import { WORKFLOW, WORKFLOW_EVENTS } from '@shared/ipc/workflow/channels';
import { WORKFLOW_ENGINE } from '@shared/ipc/workflow-engine/channels';
import { WORKFLOW_TEMPLATES, WORKFLOW_TEMPLATES_EVENTS } from '@shared/ipc/workflow-templates/channels';

import { createJsonlWatcher } from "./jsonl-watcher";
import { createProgressSyncer } from "./progress-syncer";
import { createProgressWatcher } from "./progress-watcher";

import type { WorkflowEngineService } from './engine';
import type { JsonlWatcher } from "./jsonl-watcher";
import type { ProgressWatcher } from "./progress-watcher";
import type { WorkflowTemplateService } from './templates';
import type { IpcRouter } from '../../ipc/router';
import type { HubApiClient } from "../hub/hub-api-client";

interface ActiveWatcher {
  jsonl: JsonlWatcher;
  legacy: ProgressWatcher;
}

/** Active watcher pairs keyed by project path. */
const activeWatchers = new Map<string, ActiveWatcher>();

export function registerWorkflowHandlers(
  router: IpcRouter,
  hubApiClient: HubApiClient,
  workflowEngineService: WorkflowEngineService,
  workflowTemplateService: WorkflowTemplateService,
): void {
  // ── Watcher channels ──────────────────────────────────────────

  router.handle(WORKFLOW.WATCH.PROGRESS, ({ projectPath }) => {
    // Stop existing watchers for this path if any
    const existing = activeWatchers.get(projectPath);
    if (existing) {
      existing.jsonl.stop();
      existing.legacy.stop();
      activeWatchers.delete(projectPath);
    }

    // ── Legacy markdown watcher for Hub progress sync ──
    const legacyWatcher = createProgressWatcher(projectPath);
    const syncer = createProgressSyncer(hubApiClient);
    legacyWatcher.onProgress((data) => {
      void syncer.syncProgress(data.taskId, data);
    });
    legacyWatcher.onProgress((data) => {
      router.emit(TASKS_EVENTS.PROGRESS.UPDATED, {
        taskId: data.taskId,
        progress: {
          phase: data.phase as 'idle' | 'planning' | 'coding' | 'testing' | 'reviewing' | 'complete' | 'error',
          phaseProgress: data.totalPhases > 0 ? Math.round((data.phaseIndex / data.totalPhases) * 100) : 0,
          overallProgress: data.totalPhases > 0 ? Math.round((data.phaseIndex / data.totalPhases) * 100) : 0,
          message: `Phase: ${data.phase}`,
        },
      });
    });
    legacyWatcher.start();

    // ── New JSONL watcher for milestone/context/permission events ──
    const jsonlWatcher = createJsonlWatcher(projectPath);

    jsonlWatcher.onMilestone((event) => {
      router.emit(WORKFLOW_EVENTS.WORKFLOW.MILESTONE, {
        ticket: event.ticket,
        run: event.run,
        event: event.event,
        agent: event.agent,
        ts: event.ts,
        data: event.data,
      });
    });

    jsonlWatcher.onContext((ctx) => {
      router.emit(WORKFLOW_EVENTS.WORKFLOW.CONTEXT, {
        ticket: ctx?.ticket ?? null,
        phase: ctx?.phase ?? null,
        runSlug: ctx?.runSlug ?? null,
      });
    });

    jsonlWatcher.onPermission((ticket, agent, message) => {
      router.emit(WORKFLOW_EVENTS.WORKFLOW.PERMISSION, { ticket, agent, message });
    });

    jsonlWatcher.start();
    activeWatchers.set(projectPath, { jsonl: jsonlWatcher, legacy: legacyWatcher });

    return Promise.resolve({ success: true });
  });

  router.handle(WORKFLOW.STOP.WATCHING, ({ projectPath }) => {
    const watcher = activeWatchers.get(projectPath);
    if (watcher) {
      watcher.jsonl.stop();
      watcher.legacy.stop();
      activeWatchers.delete(projectPath);
    }
    return Promise.resolve({ success: true });
  });

  // ── Task Launcher (deprecated — use command bus sessions) ──

  router.handle(WORKFLOW.LAUNCH.WORKFLOW, () => {
    throw new Error('Task launcher has been removed. Use command bus sessions instead.');
  });

  router.handle(WORKFLOW.CHECK.RUNNING, () =>
    Promise.resolve({ running: false }),
  );

  router.handle(WORKFLOW.STOP.RUNNING, () =>
    Promise.resolve({ stopped: false }),
  );

  // ── Engine channels ───────────────────────────────────────────

  router.handle(WORKFLOW_ENGINE.APPLY.TEMPLATE, ({ templateId, featureName, projectPath, overrides }) => {
    const runId = workflowEngineService.applyTemplate(templateId, featureName, projectPath, overrides);
    return Promise.resolve({ runId });
  });

  router.handle(WORKFLOW_ENGINE.START.RUN, (config) => {
    const runId = workflowEngineService.start(config);
    return Promise.resolve({ runId });
  });

  router.handle(WORKFLOW_ENGINE.STOP.RUN, ({ runId }) =>
    Promise.resolve(workflowEngineService.stop(runId)),
  );

  router.handle(WORKFLOW_ENGINE.GET.RUN, ({ runId }) =>
    Promise.resolve(workflowEngineService.get(runId) ?? null),
  );

  router.handle(WORKFLOW_ENGINE.LIST.RUNS, () =>
    Promise.resolve(workflowEngineService.list()),
  );

  router.handle(WORKFLOW_ENGINE.LIST.ARCHIVED, () =>
    Promise.resolve(workflowEngineService.listArchived()),
  );

  router.handle(WORKFLOW_ENGINE.LIST['AGENT-DEFS'], () =>
    workflowEngineService.listAgentDefinitions(),
  );

  // ── Template channels ─────────────────────────────────────────

  router.handle(WORKFLOW_TEMPLATES.LIST.ALL, () =>
    Promise.resolve({ templates: workflowTemplateService.list() }),
  );

  router.handle(WORKFLOW_TEMPLATES.GET.TEMPLATE, ({ id }) =>
    Promise.resolve({ template: workflowTemplateService.get(id) }),
  );

  router.handle(WORKFLOW_TEMPLATES.CREATE.TEMPLATE, (data) => {
    const template = workflowTemplateService.create(data);
    router.emit(WORKFLOW_TEMPLATES_EVENTS.TEMPLATE.CREATED, { id: template.id, name: template.name });
    return Promise.resolve({ template });
  });

  router.handle(WORKFLOW_TEMPLATES.UPDATE.TEMPLATE, ({ id, updates }) => {
    const template = workflowTemplateService.update(id, updates);
    router.emit(WORKFLOW_TEMPLATES_EVENTS.TEMPLATE.UPDATED, { id: template.id, name: template.name });
    return Promise.resolve({ template });
  });

  router.handle(WORKFLOW_TEMPLATES.DELETE.TEMPLATE, ({ id }) => {
    const result = workflowTemplateService.delete(id);
    router.emit(WORKFLOW_TEMPLATES_EVENTS.TEMPLATE.DELETED, { id });
    return Promise.resolve(result);
  });

  router.handle(WORKFLOW_TEMPLATES.DUPLICATE.TEMPLATE, ({ id, name }) =>
    Promise.resolve({ template: workflowTemplateService.duplicate(id, name) }),
  );

  router.handle(WORKFLOW_TEMPLATES.SCAN.ARTIFACTS, ({ projectPath }) =>
    Promise.resolve({ artifacts: workflowTemplateService.scanArtifacts(projectPath) }),
  );

  router.handle(WORKFLOW_TEMPLATES.WRITE.ARTIFACT, ({ projectPath, type, name, content }) =>
    Promise.resolve(workflowTemplateService.writeArtifact(projectPath, type, name, content)),
  );
}
