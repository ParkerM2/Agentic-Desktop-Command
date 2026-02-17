/**
 * GitHub executor — handles PR, issue, and notification queries.
 */

import type { AssistantResponse } from '@shared/types';

import {
  buildActionResponse,
  buildErrorResponse,
  buildTextResponse,
  UNKNOWN_ERROR,
} from './response-builders';

import type { ClassifiedIntent } from '../intent-classifier';
import type { CommandExecutorDeps } from './types';

export async function executeGitHub(
  intent: ClassifiedIntent,
  deps: CommandExecutorDeps,
): Promise<AssistantResponse> {
  if (!deps.githubService) {
    return buildErrorResponse('GitHub service is not available. GitHub OAuth required.');
  }

  const subtype = intent.subtype ?? '';
  try {
    switch (subtype) {
      case 'prs': {
        return buildActionResponse(
          'To show pull requests, please specify a repository (owner/repo).',
          intent,
          'github_prs',
        );
      }
      case 'issues': {
        return buildActionResponse(
          'To show issues, please specify a repository (owner/repo).',
          intent,
          'github_issues',
        );
      }
      case 'notifications': {
        const notifications = await deps.githubService.getNotifications({});
        if (notifications.length === 0) {
          return buildTextResponse('No new GitHub notifications.');
        }
        const lines = notifications
          .slice(0, 5)
          .map((n) => `- [${n.type}] ${n.title} (${n.repoName})`);
        const moreText =
          notifications.length > 5 ? `\n...and ${String(notifications.length - 5)} more` : '';
        return buildActionResponse(
          `GitHub notifications (${String(notifications.length)}):\n${lines.join('\n')}${moreText}`,
          intent,
          'github_notifications',
        );
      }
      default:
        return buildTextResponse(
          'I understood that as a GitHub command, but could not determine the action.',
        );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;
    return buildErrorResponse(`GitHub command failed: ${message}`);
  }
}
