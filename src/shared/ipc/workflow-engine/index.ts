/**
 * WorkflowEngine IPC — Barrel Export
 *
 * @deprecated All workflow-engine channels and schemas have been absorbed
 * into src/shared/ipc/workflow/. Import from there instead.
 * These re-exports exist for backwards compatibility only.
 */

export {
  AgentDefinitionSchema,
  WorkflowApplyInputSchema,
  WorkflowCompletedEventSchema,
  WorkflowEngineRecordSchema,
  WorkflowErrorEventSchema,
  WorkflowRunConfigSchema,
  WorkflowStateChangedEventSchema,
  WorkflowStateSchema,
} from './schemas';

export type { AgentDefinition } from './schemas';

export { workflowEngineEvents, workflowEngineInvoke } from './contract';

export {
  GuardianRecommendationSchema,
  GuardianVerdictEntrySchema,
  GuardianVerdictSchema,
  GuardianViolationSchema,
  QaIssueSchema,
  QaVerdictEntrySchema,
  QaVerdictSchema,
} from './verdict-schemas';

export type {
  GuardianRecommendation,
  GuardianVerdict,
  GuardianVerdictEntry,
  GuardianViolation,
  QaIssue,
  QaVerdict,
  QaVerdictEntry,
} from './verdict-schemas';
