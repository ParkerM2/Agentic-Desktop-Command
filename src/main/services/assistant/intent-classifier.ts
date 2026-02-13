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

import { classifyWithClaude } from './claude-classifier';

export interface ClassifiedIntent {
  type: IntentType;
  subtype?: string;
  action?: AssistantAction;
  confidence: number;
  extractedEntities: Record<string, string>;
  originalInput: string;
}

interface IntentRule {
  pattern: RegExp;
  type: IntentType;
  subtype: string;
  action: AssistantAction;
  confidence: number;
  extractEntities: (input: string, match: RegExpMatchArray) => Record<string, string>;
}

function stripPrefix(input: string, pattern: RegExp): string {
  return input.replace(pattern, '').trim();
}

const INTENT_RULES: IntentRule[] = [
  // Notes: "note: ..." or "remember ..."
  {
    pattern: /^(note[:\s]|remember\s)/i,
    type: 'quick_command',
    subtype: 'notes',
    action: 'create_note',
    confidence: 0.95,
    extractEntities: (input) => ({
      content: stripPrefix(input, /^(note[:\s]|remember\s)/i),
    }),
  },
  // Standup: "#standup ..."
  {
    pattern: /^#standup\s/i,
    type: 'quick_command',
    subtype: 'standup',
    action: 'create_note',
    confidence: 0.95,
    extractEntities: (input) => ({
      raw: input,
    }),
  },
  // Task creation: "create task ...", "add task ...", "build ...", "implement ...", "fix ..."
  {
    pattern: /^(create task|add task|build|implement|fix)\s/i,
    type: 'task_creation',
    subtype: 'task',
    action: 'create_task',
    confidence: 0.9,
    extractEntities: (input) => ({
      title: stripPrefix(input, /^(create task|add task)[:\s]?/i),
    }),
  },
  // Spotify: "play ...", "pause", "skip", "next", "previous", "volume ..."
  {
    pattern: /^(play|pause|skip|next|previous|volume)\s?/i,
    type: 'quick_command',
    subtype: 'spotify',
    action: 'spotify_control',
    confidence: 0.9,
    extractEntities: (input) => {
      const parts = input.split(/\s/);
      return {
        action: (parts[0] ?? '').toLowerCase(),
        query: parts.slice(1).join(' '),
      };
    },
  },
  // Reminders: "remind ..." or "alert ..."
  {
    pattern: /^(remind|alert)\s/i,
    type: 'quick_command',
    subtype: 'reminder',
    action: 'create_reminder',
    confidence: 0.85,
    extractEntities: (input) => ({
      content: input,
    }),
  },
  // Launcher: "open ..." or "launch ..."
  {
    pattern: /^(open|launch)\s/i,
    type: 'quick_command',
    subtype: 'launcher',
    action: 'open_url',
    confidence: 0.9,
    extractEntities: (input) => ({
      target: stripPrefix(input, /^(open|launch)\s/i),
    }),
  },
];

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

  for (const rule of INTENT_RULES) {
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

  // Default: conversation (send to Claude API)
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
  // Tier 1: Try regex fast path
  const regexResult = classifyIntent(input);

  // If regex matched with sufficient confidence, use it
  if (regexResult.confidence >= FAST_PATH_THRESHOLD) {
    return regexResult;
  }

  // Tier 2: Call Claude API for ambiguous input
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

  // Claude failed — fall back to conversation
  return {
    type: 'conversation',
    action: 'conversation',
    confidence: 0.5,
    extractedEntities: {},
    originalInput: input,
  };
}
