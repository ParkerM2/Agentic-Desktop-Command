/**
 * Shared response builder utilities for command executors.
 *
 * Every executor imports these instead of duplicating response construction.
 */

import type { AssistantResponse } from '@shared/types';

import type { ClassifiedIntent } from '../intent-classifier';

export const UNKNOWN_ERROR = 'Unknown error';

export function buildErrorResponse(message: string): AssistantResponse {
  return {
    type: 'error',
    content: message,
  };
}

export function buildTextResponse(content: string): AssistantResponse {
  return {
    type: 'text',
    content,
  };
}

export function buildActionResponse(
  content: string,
  intent: ClassifiedIntent,
  action?: string,
): AssistantResponse {
  return {
    type: 'action',
    content,
    intent: intent.type,
    action: intent.action,
    metadata: {
      subtype: intent.subtype ?? '',
      executedAction: action ?? intent.subtype ?? '',
      ...intent.extractedEntities,
    },
  };
}
