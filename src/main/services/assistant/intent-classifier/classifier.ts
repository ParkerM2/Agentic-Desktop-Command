/**
 * Intent Classifier — Two-Tier System
 *
 * Tier 1: Synchronous, rule-based classification of user input into
 * intent types with extracted entities. No API calls needed.
 * First match wins — order of rules matters.
 *
 * Tier 2: Async fallback using Claude API for ambiguous inputs.
 * Only called when regex returns low-confidence 'conversation' default.
 */

import type { AssistantAction, IntentType } from '@shared/types';

import { classifyWithClaude } from '../claude-classifier';

import { ALL_INTENT_RULES } from './patterns';

import type { ClassifiedIntent } from './types';

/** Minimum regex confidence to skip Claude API fallback. */
const FAST_PATH_THRESHOLD = 0.85;

/**
 * Classify user input into an intent type with extracted entities.
 * Synchronous — no API calls. First matching rule wins.
 * Unknown inputs default to 'conversation' with confidence 0.5.
 */
export function classifyIntent(input: string): ClassifiedIntent {
  const normalized = input.trim();
  if (normalized.length === 0) {
    return {
      type: 'conversation',
      action: 'conversation',
      confidence: 0.5,
      extractedEntities: {},
      originalInput: input,
    };
  }

  for (const rule of ALL_INTENT_RULES) {
    const match = normalized.match(rule.pattern);
    if (match) {
      return {
        type: rule.type,
        subtype: rule.subtype,
        action: rule.action,
        confidence: rule.confidence,
        extractedEntities: rule.extractEntities(normalized, match),
        originalInput: input,
      };
    }
  }

  return {
    type: 'conversation',
    action: 'conversation',
    confidence: 0.5,
    extractedEntities: {},
    originalInput: input,
  };
}

/** Map Claude API action to IntentType. */
function actionToIntentType(action: AssistantAction): IntentType {
  switch (action) {
    case 'create_task':
      return 'task_creation';
    case 'create_time_block':
    case 'create_note':
    case 'create_reminder':
    case 'search':
    case 'spotify_control':
    case 'open_url':
      return 'quick_command';
    case 'watch_create':
    case 'watch_remove':
    case 'watch_list':
      return 'watch';
    case 'device_query':
      return 'device_query';
    case 'fitness_log':
    case 'fitness_query':
    case 'fitness_measurements':
      return 'fitness';
    case 'calendar_query':
    case 'calendar_create':
      return 'calendar';
    case 'briefing_get':
      return 'briefing';
    case 'insights_query':
      return 'insights';
    case 'ideation_create':
    case 'ideation_query':
      return 'ideation';
    case 'milestones_query':
      return 'milestones';
    case 'email_send':
    case 'email_queue':
      return 'email';
    case 'github_prs':
    case 'github_issues':
    case 'github_notifications':
      return 'github';
    case 'planner_today':
    case 'planner_weekly':
      return 'planner';
    case 'notes_search':
    case 'notes_list':
      return 'notes';
    case 'changelog_generate':
      return 'changelog';
    case 'conversation':
      return 'conversation';
    default:
      return 'conversation';
  }
}

/** Map Claude API action to subtype string. */
function actionToSubtype(action: AssistantAction): string | undefined {
  switch (action) {
    case 'create_task':
      return 'task';
    case 'create_time_block':
      return 'time_block';
    case 'create_note':
      return 'notes';
    case 'create_reminder':
      return 'reminder';
    case 'search':
      return 'search';
    case 'spotify_control':
      return 'spotify';
    case 'open_url':
      return 'launcher';
    case 'watch_create':
      return 'create';
    case 'watch_remove':
      return 'remove';
    case 'watch_list':
      return 'list';
    case 'device_query':
      return 'status';
    case 'fitness_log':
      return 'log';
    case 'fitness_query':
      return 'query';
    case 'fitness_measurements':
      return 'measurements';
    case 'calendar_query':
      return 'query';
    case 'calendar_create':
      return 'create';
    case 'briefing_get':
      return 'get';
    case 'insights_query':
      return 'query';
    case 'ideation_create':
      return 'create';
    case 'ideation_query':
      return 'query';
    case 'milestones_query':
      return 'query';
    case 'email_send':
      return 'send';
    case 'email_queue':
      return 'queue';
    case 'github_prs':
      return 'prs';
    case 'github_issues':
      return 'issues';
    case 'github_notifications':
      return 'notifications';
    case 'planner_today':
      return 'today';
    case 'planner_weekly':
      return 'weekly';
    case 'notes_search':
      return 'search';
    case 'notes_list':
      return 'list';
    case 'changelog_generate':
      return 'generate';
    case 'conversation':
      return;
  }
}

/**
 * Async two-tier intent classifier.
 *
 * 1. Tries regex fast path via classifyIntent().
 * 2. If regex returns high confidence (>= 0.85), returns immediately.
 * 3. If regex returns conversation (low confidence), calls Claude API.
 * 4. On Claude failure, falls back to conversation intent.
 */
export async function classifyIntentAsync(input: string): Promise<ClassifiedIntent> {
  const regexResult = classifyIntent(input);

  if (regexResult.confidence >= FAST_PATH_THRESHOLD) {
    return regexResult;
  }

  const claudeResult = await classifyWithClaude(input);

  if (claudeResult) {
    return {
      type: actionToIntentType(claudeResult.action),
      subtype: actionToSubtype(claudeResult.action),
      action: claudeResult.action,
      confidence: claudeResult.confidence,
      extractedEntities: claudeResult.entities,
      originalInput: input,
    };
  }

  return {
    type: 'conversation',
    action: 'conversation',
    confidence: 0.5,
    extractedEntities: {},
    originalInput: input,
  };
}
