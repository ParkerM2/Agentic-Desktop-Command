/**
 * WorkflowEngine Service — Barrel Export
 */

export { createWorkflowEngineService } from './workflow-engine';

export type {
  TaskEntry,
  WavePlan,
  WorkflowEngineDeps,
  WorkflowEngineRecord,
  WorkflowEngineService,
  WorkflowRunConfig,
  WorkflowRuntimeRecord,
  WorkflowStateChangedEvent,
  WorkflowCompletedEvent,
  WorkflowErrorEvent,
} from './types';

export { VALID_TRANSITIONS, WorkflowState } from './types';
