/**
 * Intent Classifier Types
 *
 * Shared types for rule-based intent classification.
 */

import type { AssistantAction, IntentType } from '@shared/types';

export interface ClassifiedIntent {
  type: IntentType;
  subtype?: string;
  action?: AssistantAction;
  confidence: number;
  extractedEntities: Record<string, string>;
  originalInput: string;
}

export interface IntentRule {
  pattern: RegExp;
  type: IntentType;
  subtype: string;
  action: AssistantAction;
  confidence: number;
  extractEntities: (input: string, match: RegExpMatchArray) => Record<string, string>;
}
