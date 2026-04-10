/**
 * Workflow IPC — Barrel Export
 *
 * Unified workflow domain, absorbing workflow-engine and workflow-templates.
 */

export { workflowEvents, workflowInvoke } from './contract';

export {
  WORKFLOW,
  WORKFLOW_ENGINE_CHANNELS,
  WORKFLOW_ENGINE_EVENT_CHANNELS,
  WORKFLOW_EVENTS,
  WORKFLOW_TEMPLATES_CHANNELS,
  WORKFLOW_TEMPLATES_EVENT_CHANNELS,
} from './channels';

export {
  // Engine schemas
  AgentDefinitionSchema,
  GuardianRecommendationSchema,
  GuardianVerdictEntrySchema,
  GuardianVerdictSchema,
  GuardianViolationSchema,
  QaIssueSchema,
  QaVerdictEntrySchema,
  QaVerdictSchema,
  WorkflowApplyInputSchema,
  WorkflowCompletedEventSchema,
  WorkflowEngineRecordSchema,
  WorkflowErrorEventSchema,
  WorkflowRunConfigSchema,
  WorkflowStateChangedEventSchema,
  WorkflowStateSchema,
  // Template schemas
  ArtifactTypeSchema,
  PluginArtifactSchema,
  SummarySpecSchema,
  WorkflowBranchingSchema,
  WorkflowGuardianSchema,
  WorkflowModeSchema,
  WorkflowPermissionsSchema,
  WorkflowPhaseSchema,
  WorkflowQaSchema,
  WorkflowTeamSchema,
  WorkflowTemplateSchema,
} from './schemas';

export type {
  // Engine types
  AgentDefinition,
  GuardianRecommendation,
  GuardianVerdict,
  GuardianVerdictEntry,
  GuardianViolation,
  QaIssue,
  QaVerdict,
  QaVerdictEntry,
  // Template types
  PluginArtifact,
  SummarySpec,
  WorkflowBranching,
  WorkflowGuardian,
  WorkflowMode,
  WorkflowPermissions,
  WorkflowPhase,
  WorkflowQa,
  WorkflowTeam,
  WorkflowTemplate,
} from './schemas';
