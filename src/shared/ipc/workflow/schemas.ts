/**
 * Workflow IPC Schemas
 *
 * Unified schema exports for the workflow domain, absorbing all schemas
 * previously in workflow-engine/ and workflow-templates/.
 */

// ─── Engine Schemas ──────────────────────────────────────────

export {
  AgentDefinitionSchema,
  WorkflowApplyInputSchema,
  WorkflowCompletedEventSchema,
  WorkflowEngineRecordSchema,
  WorkflowErrorEventSchema,
  WorkflowRunConfigSchema,
  WorkflowStateChangedEventSchema,
  WorkflowStateSchema,
} from '../workflow-engine/schemas';

export type { AgentDefinition } from '../workflow-engine/schemas';

export {
  GuardianRecommendationSchema,
  GuardianVerdictEntrySchema,
  GuardianVerdictSchema,
  GuardianViolationSchema,
  QaIssueSchema,
  QaVerdictEntrySchema,
  QaVerdictSchema,
} from '../workflow-engine/verdict-schemas';

export type {
  GuardianRecommendation,
  GuardianVerdict,
  GuardianVerdictEntry,
  GuardianViolation,
  QaIssue,
  QaVerdict,
  QaVerdictEntry,
} from '../workflow-engine/verdict-schemas';

// ─── Template Schemas ─────────────────────────────────────────

export {
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
} from '../workflow-templates/schemas';

export type {
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
} from '../workflow-templates/schemas';
