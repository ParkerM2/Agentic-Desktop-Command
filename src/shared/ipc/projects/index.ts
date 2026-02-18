/**
 * Projects IPC — Barrel Export
 *
 * Re-exports project-related schemas and contract definitions.
 * Git and merge operations are in their own domain folders.
 */

export {
  ChildRepoSchema,
  ProjectSchema,
  RepoDetectionResultSchema,
  RepoTypeSchema,
  SubProjectSchema,
} from './schemas';

export { projectsEvents, projectsInvoke } from './contract';
