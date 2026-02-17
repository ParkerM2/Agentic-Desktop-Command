/**
 * Projects IPC — Barrel Export
 *
 * Re-exports all project-related schemas, git schemas, merge schemas,
 * and contract definitions.
 */

export {
  ChildRepoSchema,
  GitBranchSchema,
  GitStatusSchema,
  MergeDiffFileSchema,
  MergeDiffSummarySchema,
  MergeResultSchema,
  ProjectSchema,
  RepoDetectionResultSchema,
  RepoStructureSchema,
  RepoTypeSchema,
  SubProjectSchema,
  WorktreeSchema,
} from './schemas';

export { gitInvoke, mergeInvoke, projectsEvents, projectsInvoke } from './contract';
