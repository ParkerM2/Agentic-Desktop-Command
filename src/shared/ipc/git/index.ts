/**
 * Git IPC — Barrel Export
 */

export { gitEvents, gitInvoke } from './contract';
export {
  GitBranchSchema,
  GitCommitInputSchema,
  GitCommitOutputSchema,
  GitCommitSchema,
  GitConflictStrategySchema,
  GitCreatePrInputSchema,
  GitCreatePrOutputSchema,
  GitPushInputSchema,
  GitPushOutputSchema,
  GitResolveConflictInputSchema,
  GitResolveConflictOutputSchema,
  GitStatusSchema,
  RepoStructureSchema,
  WorktreeSchema,
} from './schemas';
export type { GitCommit } from './schemas';
