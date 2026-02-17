/**
 * Email executor — handles email composition and queue queries.
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

export function executeEmail(
  intent: ClassifiedIntent,
  deps: CommandExecutorDeps,
): AssistantResponse {
  if (!deps.emailService) {
    return buildErrorResponse('Email service is not available.');
  }

  const subtype = intent.subtype ?? '';
  try {
    switch (subtype) {
      case 'send': {
        if (!deps.emailService.isConfigured()) {
          return buildErrorResponse('Email is not configured. Please set up SMTP settings first.');
        }
        return buildActionResponse(
          'Ready to compose an email. Please provide recipient, subject, and body.',
          intent,
          'email_send',
        );
      }
      case 'queue': {
        const queued = deps.emailService.getQueuedEmails();
        if (queued.length === 0) {
          return buildTextResponse('Email queue is empty.');
        }
        const lines = queued
          .slice(0, 5)
          .map((e) => `- To: ${e.email.to.join(', ')} — "${e.email.subject}" (${e.status})`);
        return buildActionResponse(
          `Queued emails (${String(queued.length)}):\n${lines.join('\n')}`,
          intent,
          'email_queue',
        );
      }
      default:
        return buildTextResponse(
          'I understood that as an email command, but could not determine the action.',
        );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;
    return buildErrorResponse(`Email command failed: ${message}`);
  }
}
