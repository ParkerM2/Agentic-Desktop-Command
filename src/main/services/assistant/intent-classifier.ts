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

import {
  createTimeParserService,
  type TimeParserService,
} from '../time-parser/time-parser-service';

import { classifyWithClaude } from './claude-classifier';

// ── Watch entity extraction helpers ─────────────────────────────

const TASK_ID_PATTERN = /task\s+#?(\d+)/i;
const TASK_NAME_PATTERN = /task\s+"([^"]+)"/i;
const FOLLOW_UP_PATTERN = /(?:,\s*and\s+(?:then\s+)?|,\s*and\s+I'?ll\s+)(.*)/i;

function extractTaskId(input: string): string {
  const idMatch = TASK_ID_PATTERN.exec(input);
  if (idMatch?.[1]) {
    return idMatch[1];
  }
  const nameMatch = TASK_NAME_PATTERN.exec(input);
  return nameMatch?.[1] ?? '';
}

function resolveWatchCondition(input: string): string {
  if (/(?:is\s+)?(?:done|complete|finished)/i.test(input)) {
    return 'done';
  }
  if (/(?:fails?|errors?|crashes?)/i.test(input)) {
    return 'error';
  }
  return 'changes';
}

// Lazy-initialized time parser service
let timeParserService: TimeParserService | null = null;

function getTimeParser(): TimeParserService {
  timeParserService ??= createTimeParserService();
  return timeParserService;
}

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
  // Watch creation: "tell me when...", "notify me if...", "watch task..."
  {
    pattern: /(?:tell|notify|alert|update|let)\s+me\s+(?:know|when)/i,
    type: 'watch',
    subtype: 'create',
    action: 'watch_create',
    confidence: 0.9,
    extractEntities: (input) => {
      const targetId = extractTaskId(input);
      const condition = resolveWatchCondition(input);
      const followUpMatch = FOLLOW_UP_PATTERN.exec(input);
      const followUp = followUpMatch?.[1]?.trim() ?? '';
      return { targetId, condition, followUp };
    },
  },
  {
    pattern: /(?:remind|ping)\s+me\s+(?:when|if)/i,
    type: 'watch',
    subtype: 'create',
    action: 'watch_create',
    confidence: 0.9,
    extractEntities: (input) => ({
      targetId: extractTaskId(input),
      condition: resolveWatchCondition(input),
    }),
  },
  {
    pattern: /(?:watch|monitor)\s+task\s+/i,
    type: 'watch',
    subtype: 'create',
    action: 'watch_create',
    confidence: 0.9,
    extractEntities: (input) => ({
      targetId: extractTaskId(input),
      condition: 'changes',
    }),
  },
  // Watch removal: "stop watching...", "cancel alert..."
  {
    pattern: /(?:stop|cancel|remove)\s+(?:watch(?:ing)?|notification|alert)/i,
    type: 'watch',
    subtype: 'remove',
    action: 'watch_remove',
    confidence: 0.9,
    extractEntities: (input) => ({
      targetId: extractTaskId(input),
    }),
  },
  // Watch listing: "what am I watching?", "list watches"
  {
    pattern: /(?:list|show)\s+(?:my\s+)?(?:watches|notifications|alerts)/i,
    type: 'watch',
    subtype: 'list',
    action: 'watch_list',
    confidence: 0.9,
    extractEntities: () => ({}),
  },
  {
    pattern: /what\s+(?:am\s+I|are\s+you)\s+watch/i,
    type: 'watch',
    subtype: 'list',
    action: 'watch_list',
    confidence: 0.9,
    extractEntities: () => ({}),
  },
  // Device queries: "what's running on my MacBook?", "show my devices"
  {
    pattern: /(?:what(?:'s|\s+is))\s+(?:running|happening)\s+on\s+(?:my\s+)?(\w+)/i,
    type: 'device_query',
    subtype: 'status',
    action: 'device_query',
    confidence: 0.9,
    extractEntities: (input, match) => ({
      deviceName: match[1],
      query: input,
    }),
  },
  {
    pattern: /(?:show|list)\s+(?:my\s+)?devices/i,
    type: 'device_query',
    subtype: 'list',
    action: 'device_query',
    confidence: 0.9,
    extractEntities: (input) => ({
      query: input,
    }),
  },
  {
    pattern: /(?:status|state)\s+(?:of\s+)?(?:all\s+)?devices/i,
    type: 'device_query',
    subtype: 'list',
    action: 'device_query',
    confidence: 0.9,
    extractEntities: (input) => ({
      query: input,
    }),
  },
  // Devices expanded: "what devices are online?"
  {
    pattern: /(?:what|which)\s+devices?\s+(?:are\s+)?online/i,
    type: 'device_query',
    subtype: 'list',
    action: 'device_query',
    confidence: 0.9,
    extractEntities: (input) => ({
      query: input,
    }),
  },
  // Fitness: log workout / query workouts / measurements
  {
    pattern: /(?:log|add|record)\s+(?:a\s+)?(?:workout|exercise|run|walk|gym)/i,
    type: 'fitness',
    subtype: 'log',
    action: 'fitness_log',
    confidence: 0.9,
    extractEntities: (input) => ({
      content: input,
    }),
  },
  {
    pattern: /(?:my|show|get)\s+(?:workouts?|fitness|exercise)/i,
    type: 'fitness',
    subtype: 'query',
    action: 'fitness_query',
    confidence: 0.85,
    extractEntities: (input) => ({
      query: input,
    }),
  },
  {
    pattern: /(?:my|show|get)\s+(?:weight|body|measurements?)/i,
    type: 'fitness',
    subtype: 'measurements',
    action: 'fitness_measurements',
    confidence: 0.85,
    extractEntities: (input) => ({
      query: input,
    }),
  },
  // Calendar: query events / create events
  {
    pattern: /(?:what(?:'s| is))\s+on\s+my\s+calendar/i,
    type: 'calendar',
    subtype: 'query',
    action: 'calendar_query',
    confidence: 0.9,
    extractEntities: (input) => ({
      query: input,
    }),
  },
  {
    pattern: /(?:schedule|book|create)\s+(?:a\s+)?(?:meeting|event|block)/i,
    type: 'calendar',
    subtype: 'create',
    action: 'calendar_create',
    confidence: 0.9,
    extractEntities: (input) => ({
      content: input,
    }),
  },
  // Briefing: daily briefing / catch me up
  {
    pattern: /(?:daily|morning)\s+(?:briefing|summary|update)/i,
    type: 'briefing',
    subtype: 'get',
    action: 'briefing_get',
    confidence: 0.9,
    extractEntities: () => ({}),
  },
  {
    pattern: /(?:brief|catch)\s+me\s+up/i,
    type: 'briefing',
    subtype: 'get',
    action: 'briefing_get',
    confidence: 0.9,
    extractEntities: () => ({}),
  },
  // Insights / Analytics
  {
    pattern: /(?:how\s+many|count|stats?|metrics?|analytics)/i,
    type: 'insights',
    subtype: 'query',
    action: 'insights_query',
    confidence: 0.85,
    extractEntities: (input) => ({
      query: input,
    }),
  },
  {
    pattern: /(?:completion|success)\s+rate/i,
    type: 'insights',
    subtype: 'query',
    action: 'insights_query',
    confidence: 0.85,
    extractEntities: (input) => ({
      query: input,
    }),
  },
  // Ideation: submit idea / list ideas
  {
    pattern: /(?:add|submit|propose)\s+(?:an?\s+)?idea/i,
    type: 'ideation',
    subtype: 'create',
    action: 'ideation_create',
    confidence: 0.9,
    extractEntities: (input) => ({
      content: input,
    }),
  },
  {
    pattern: /(?:show|list|get)\s+(?:my\s+)?ideas/i,
    type: 'ideation',
    subtype: 'query',
    action: 'ideation_query',
    confidence: 0.85,
    extractEntities: (input) => ({
      query: input,
    }),
  },
  // Milestones / Roadmap
  {
    pattern: /(?:milestone|roadmap|deadline)/i,
    type: 'milestones',
    subtype: 'query',
    action: 'milestones_query',
    confidence: 0.85,
    extractEntities: (input) => ({
      query: input,
    }),
  },
  {
    pattern: /(?:what(?:'s| is))\s+due/i,
    type: 'milestones',
    subtype: 'query',
    action: 'milestones_query',
    confidence: 0.85,
    extractEntities: (input) => ({
      query: input,
    }),
  },
  // Email: send / check queue
  {
    pattern: /(?:send|write|compose)\s+(?:an?\s+)?email/i,
    type: 'email',
    subtype: 'send',
    action: 'email_send',
    confidence: 0.9,
    extractEntities: (input) => ({
      content: input,
    }),
  },
  {
    pattern: /(?:check|show)\s+(?:email\s+)?queue/i,
    type: 'email',
    subtype: 'queue',
    action: 'email_queue',
    confidence: 0.85,
    extractEntities: () => ({}),
  },
  // GitHub: PRs / issues / notifications
  {
    pattern: /(?:show|list|get)\s+(?:my\s+)?(?:pull\s+requests?|PRs?)/i,
    type: 'github',
    subtype: 'prs',
    action: 'github_prs',
    confidence: 0.9,
    extractEntities: (input) => ({
      query: input,
    }),
  },
  {
    pattern: /(?:show|list|get)\s+(?:my\s+)?issues/i,
    type: 'github',
    subtype: 'issues',
    action: 'github_issues',
    confidence: 0.85,
    extractEntities: (input) => ({
      query: input,
    }),
  },
  {
    pattern: /(?:github|gh)\s+notifications?/i,
    type: 'github',
    subtype: 'notifications',
    action: 'github_notifications',
    confidence: 0.9,
    extractEntities: () => ({}),
  },
  // Planner: today / weekly review
  {
    pattern: /(?:what(?:'s| is))\s+(?:my\s+)?plan\s+(?:for\s+)?today/i,
    type: 'planner',
    subtype: 'today',
    action: 'planner_today',
    confidence: 0.9,
    extractEntities: () => ({}),
  },
  {
    pattern: /(?:weekly|week)\s+review/i,
    type: 'planner',
    subtype: 'weekly',
    action: 'planner_weekly',
    confidence: 0.85,
    extractEntities: () => ({}),
  },
  // Notes (expanded): search / list
  {
    pattern: /(?:find|search)\s+(?:my\s+)?notes?\s+(?:about|for|on)/i,
    type: 'notes',
    subtype: 'search',
    action: 'notes_search',
    confidence: 0.9,
    extractEntities: (input) => ({
      query: input,
    }),
  },
  {
    pattern: /^(?:show|list|get)\s+(?:my\s+)?notes/i,
    type: 'notes',
    subtype: 'list',
    action: 'notes_list',
    confidence: 0.85,
    extractEntities: () => ({}),
  },
  // Changelog
  {
    pattern: /(?:generate|create)\s+changelog/i,
    type: 'changelog',
    subtype: 'generate',
    action: 'changelog_generate',
    confidence: 0.9,
    extractEntities: (input) => ({
      content: input,
    }),
  },
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
    extractEntities: (input) => {
      // Extract time and message from reminder input
      // Patterns: "remind me tomorrow at 3pm to X" or "remind me in 2 hours to X"
      const stripped = stripPrefix(input, /^(remind|alert)\s+(me\s+)?/i);
      const parser = getTimeParser();

      // Try to parse time from the input
      const parsed = parser.parseTime(stripped);

      if (parsed) {
        // Extract the message after the time expression
        const timeText = parsed.text;
        const afterTime = stripped.slice(stripped.indexOf(timeText) + timeText.length);
        const message = afterTime.replace(/^\s*to\s+/i, '').trim();

        return {
          content: input,
          message: message || stripped,
          triggerAt: parsed.date.toISOString(),
          isRelative: String(parsed.isRelative),
        };
      }

      // Fallback: return raw content if parsing fails (no triggerAt)
      return {
        content: input,
        message: stripped,
        triggerAt: '',
        isRelative: 'false',
      };
    },
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
