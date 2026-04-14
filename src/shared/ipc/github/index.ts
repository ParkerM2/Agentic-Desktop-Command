/**
 * GitHub IPC — Barrel Export
 */

export { githubEvents, githubInvoke } from './contract';
export {
  GitHubAuthStatusSchema,
  GitHubIssueSchema,
  GitHubLabelSchema,
  GitHubNotificationSchema,
  GitHubPullRequestSchema,
  GitHubRepoSchema,
  PrDiffFileSchema,
} from './schemas';
export type { PrDiffFile } from './schemas';
