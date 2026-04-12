import { domain, events } from '../channel-builder';

export const WORKFLOW = domain('workflow', {
  WATCH: ['progress'],
  STOP: ['watching', 'running'],
  LAUNCH: ['workflow'],
  CHECK: ['running'],
});

export const WORKFLOW_EVENTS = events('workflow', {
  WORKFLOW: ['milestone', 'context', 'permission'],
});

// ─── Engine Channels (absorbed from workflow-engine) ─────────

export const WORKFLOW_ENGINE_CHANNELS = {
  APPLY: { TEMPLATE: 'workflow-engine.apply.template' },
  START: { RUN: 'workflow-engine.start.run' },
  STOP: { RUN: 'workflow-engine.stop.run' },
  GET: { RUN: 'workflow-engine.get.run' },
  LIST: {
    RUNS: 'workflow-engine.list.runs',
    ARCHIVED: 'workflow-engine.list.archived',
    'AGENT-DEFS': 'workflow-engine.list.agent-defs',
  },
} as const;

export const WORKFLOW_ENGINE_EVENT_CHANNELS = {
  STATE: { CHANGED: 'event:workflow-engine.state.changed' },
  RUN: {
    COMPLETED: 'event:workflow-engine.run.completed',
    ERROR: 'event:workflow-engine.run.error',
  },
} as const;

// ─── Templates Channels (absorbed from workflow-templates) ────

export const WORKFLOW_TEMPLATES_CHANNELS = {
  LIST: { ALL: 'workflow-templates.list.all' },
  GET: { TEMPLATE: 'workflow-templates.get.template' },
  CREATE: { TEMPLATE: 'workflow-templates.create.template' },
  UPDATE: { TEMPLATE: 'workflow-templates.update.template' },
  DELETE: { TEMPLATE: 'workflow-templates.delete.template' },
  DUPLICATE: { TEMPLATE: 'workflow-templates.duplicate.template' },
  SCAN: { ARTIFACTS: 'workflow-templates.scan.artifacts' },
  WRITE: { ARTIFACT: 'workflow-templates.write.artifact' },
} as const;

export const WORKFLOW_TEMPLATES_EVENT_CHANNELS = {
  TEMPLATE: {
    CREATED: 'event:workflow-templates.template.created',
    UPDATED: 'event:workflow-templates.template.updated',
    DELETED: 'event:workflow-templates.template.deleted',
  },
} as const;

// ─── Backwards-Compat Aliases ─────────────────────────────────

/** @deprecated Import from WORKFLOW_ENGINE_CHANNELS instead */
export const WORKFLOW_ENGINE = WORKFLOW_ENGINE_CHANNELS;
/** @deprecated Import from WORKFLOW_ENGINE_EVENT_CHANNELS instead */
export const WORKFLOW_ENGINE_EVENTS = WORKFLOW_ENGINE_EVENT_CHANNELS;
/** @deprecated Import from WORKFLOW_TEMPLATES_CHANNELS instead */
export const WORKFLOW_TEMPLATES = WORKFLOW_TEMPLATES_CHANNELS;
/** @deprecated Import from WORKFLOW_TEMPLATES_EVENT_CHANNELS instead */
export const WORKFLOW_TEMPLATES_EVENTS = WORKFLOW_TEMPLATES_EVENT_CHANNELS;
