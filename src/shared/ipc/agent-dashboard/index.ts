/**
 * Agent Dashboard IPC — Barrel Export
 *
 * Re-exports schemas and contract definitions for the agent dashboard domain.
 */

export {
  AgentChatMessageSchema,
  AgentDashboardStatusSchema,
  AgentErrorSchema,
  AgentErrorTypeSchema,
  AgentLayoutModeSchema,
  AgentPanelDataSchema,
  AgentPanelStateSchema,
  AgentSessionSchema,
  AgentSessionTypeSchema,
  AgentTokenUsageSchema,
  ChatMessageRoleSchema,
  ContentBlockSchema,
  FileChangeSchema,
  FileChangeStatusSchema,
  PhaseStatusSchema,
  QaDashboardSessionSchema,
  QaIssueSchema,
  QaIssueSeveritySchema,
  QaVerdictSchema,
  QaVerificationStatusSchema,
  QaVerificationSuiteSchema,
  StreamJsonEventSchema,
  StreamJsonEventTypeSchema,
  TaskCriterionSchema,
  TaskPhaseSchema,
  TaskProgressSchema,
  TeamConfigSchema,
  TeamMemberSchema,
  TextBlockSchema,
  ToolCallDisplaySchema,
  ToolResultBlockSchema,
  ToolUseBlockSchema,
  WorkflowTaskSchema,
} from './schemas';

export { agentDashboardEvents, agentDashboardInvoke } from './contract';
