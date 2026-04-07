/**
 * Workflow Template Schemas
 *
 * Zod schemas for workflow template definitions.
 * Templates describe how an /agent-team workflow should be configured:
 * branching strategy, team composition, execution mode, QA policy,
 * permissions, and guardian rules.
 */

import { z } from 'zod';

// ─── Sub-schemas ──────────────────────────────────────────────

export const WorkflowBranchingSchema = z.object({
  /** Prefix for feature branches (e.g. "feature", "feat") */
  featurePrefix: z.string().min(1),
  /** Prefix for work branches created per task (e.g. "work") */
  workPrefix: z.string().min(1),
  /** Whether agents run in git worktrees */
  useWorktrees: z.boolean(),
});

export const WorkflowTeamSchema = z.object({
  /** Maximum number of coding agents spawned concurrently per wave */
  maxConcurrentAgents: z.number().int().min(1).max(20),
  /** Whether to spawn a dedicated QA agent after each coding task */
  spawnQaPerTask: z.boolean(),
  /** Whether a guardian agent runs after all waves complete */
  enableGuardian: z.boolean(),
  /**
   * Agent role slugs to include in the team (e.g. "schema-designer", "component-engineer").
   * Corresponds to .claude/agents/<slug>.md definition files.
   * An empty array means no restriction — all available roles are eligible.
   */
  roles: z.array(z.string()).default([]),
});

export const WorkflowModeSchema = z.enum([
  'standard',
  'fast-prototype',
  'research',
  'pr-review',
]);

export const WorkflowQaSchema = z.object({
  /** Run lint before marking a task complete */
  runLint: z.boolean(),
  /** Run typecheck before marking a task complete */
  runTypecheck: z.boolean(),
  /** Run build before marking a task complete */
  runBuild: z.boolean(),
  /** Run unit tests before marking a task complete */
  runTests: z.boolean(),
  /** Maximum QA rounds per task before escalating to team leader */
  maxRounds: z.number().int().min(1).max(10),
});

export const WorkflowPermissionsSchema = z.object({
  /** Allow agents to push branches to remote */
  allowPush: z.boolean(),
  /** Allow agents to create pull requests */
  allowCreatePr: z.boolean(),
  /** Allow agents to delete branches */
  allowDeleteBranch: z.boolean(),
  /** Allow agents to run arbitrary shell commands */
  allowShellExec: z.boolean(),
});

export const WorkflowGuardianSchema = z.object({
  /** Rules that trigger a blocking violation */
  blockingRules: z.array(z.string()),
  /** Rules that trigger a warning (non-blocking) */
  warningRules: z.array(z.string()),
  /** Maximum file size in lines before a blocking violation */
  maxFileSizeLines: z.number().int().min(1),
});

// ─── Root Template Schema ────────────────────────────────────

export const WorkflowTemplateSchema = z.object({
  /** Unique identifier (UUID or slug) */
  id: z.string().min(1),
  /** Human-readable name */
  name: z.string().min(1),
  /** Short description shown in the template picker */
  description: z.string(),
  /** Execution mode preset */
  mode: WorkflowModeSchema,
  /** Branching strategy configuration */
  branching: WorkflowBranchingSchema,
  /** Team composition configuration */
  team: WorkflowTeamSchema,
  /** QA policy configuration */
  qa: WorkflowQaSchema,
  /** Agent permission policy */
  permissions: WorkflowPermissionsSchema,
  /** Guardian review configuration */
  guardian: WorkflowGuardianSchema,
  /** Whether this is a built-in template (cannot be deleted) */
  isBuiltin: z.boolean().default(false),
  /** ISO 8601 creation timestamp */
  createdAt: z.string(),
  /** ISO 8601 last-updated timestamp */
  updatedAt: z.string(),
});

// ─── Derived Types ────────────────────────────────────────────

export type WorkflowTemplate = z.infer<typeof WorkflowTemplateSchema>;
export type WorkflowBranching = z.infer<typeof WorkflowBranchingSchema>;
export type WorkflowTeam = z.infer<typeof WorkflowTeamSchema>;
export type WorkflowMode = z.infer<typeof WorkflowModeSchema>;
export type WorkflowQa = z.infer<typeof WorkflowQaSchema>;
export type WorkflowPermissions = z.infer<typeof WorkflowPermissionsSchema>;
export type WorkflowGuardian = z.infer<typeof WorkflowGuardianSchema>;
