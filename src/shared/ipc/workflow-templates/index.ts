/**
 * WorkflowTemplates IPC — Barrel Export
 *
 * @deprecated All workflow-templates channels and schemas have been absorbed
 * into src/shared/ipc/workflow/. Import from there instead.
 * These re-exports exist for backwards compatibility only.
 */

export { workflowTemplatesEvents, workflowTemplatesInvoke } from './contract';
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
} from './schemas';
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
} from './schemas';
