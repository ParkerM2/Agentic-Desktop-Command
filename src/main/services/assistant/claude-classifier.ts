/**
 * Claude API Intent Classifier
 *
 * Uses the `claude` CLI with `--print -p` to classify ambiguous user input
 * into structured actions. Called as a Tier 2 fallback when regex rules
 * return low confidence. Returns null on any failure so the caller can
 * gracefully fall back to conversation mode.
 */

import { execFile } from 'node:child_process';
import { platform } from 'node:os';

import type { AssistantAction } from '@shared/types';

const CLASSIFIER_TIMEOUT_MS = 10_000;
const CLASSIFIER_MAX_BUFFER = 262_144; // 256 KB

const VALID_ACTIONS: ReadonlySet<string> = new Set<string>([
  'create_task',
  'create_time_block',
  'create_note',
  'create_reminder',
  'search',
  'spotify_control',
  'open_url',
  'conversation',
]);

const CLASSIFIER_SYSTEM_PROMPT = `You are an intent classifier for a developer productivity app.
Classify the user's input into exactly one action. Respond with JSON only, no markdown.

Available actions:
- create_task: Create a task for a project (extract: title, description?)
- create_time_block: Add to today's schedule (extract: label, startTime, endTime, type)
- create_note: Save a note (extract: title, content, tags?)
- create_reminder: Set a reminder (extract: message, triggerAt?)
- search: Search across tasks/notes/projects (extract: query, scope?)
- spotify_control: Control music playback (extract: action, query?)
- open_url: Open a URL or application (extract: target)
- conversation: General question that needs a conversational answer

Respond with exactly:
{"action": "...", "entities": {...}, "confidence": 0.0-1.0}`;

export interface ClaudeClassification {
  action: AssistantAction;
  entities: Record<string, string>;
  confidence: number;
}

function buildPrompt(input: string): string {
  return `${CLASSIFIER_SYSTEM_PROMPT}\n\nUser input: "${input}"`;
}

function parseClassification(raw: string): ClaudeClassification | null {
  try {
    // Try to extract JSON from the response (in case of surrounding text)
    const jsonMatch = /\{[\s\S]*\}/.exec(raw);
    if (!jsonMatch) {
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]) as unknown;
    if (typeof parsed !== 'object' || parsed === null) {
      return null;
    }

    const obj = parsed as Record<string, unknown>;

    // Validate action
    const action = typeof obj.action === 'string' ? obj.action : '';
    if (!VALID_ACTIONS.has(action)) {
      return null;
    }

    // Validate entities
    const rawEntities =
      typeof obj.entities === 'object' && obj.entities !== null ? obj.entities : {};
    const entities: Record<string, string> = {};
    for (const [key, value] of Object.entries(rawEntities as Record<string, unknown>)) {
      entities[key] = typeof value === 'string' ? value : String(value);
    }

    // Validate confidence
    const confidence = typeof obj.confidence === 'number' ? obj.confidence : 0.7;

    return {
      action: action as AssistantAction,
      entities,
      confidence: Math.max(0, Math.min(1, confidence)),
    };
  } catch {
    return null;
  }
}

function runClaudeClassifier(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      'claude',
      ['--print', '-p', prompt],
      {
        timeout: CLASSIFIER_TIMEOUT_MS,
        maxBuffer: CLASSIFIER_MAX_BUFFER,
        shell: platform() === 'win32',
      },
      (error, stdout, stderr) => {
        if (error) {
          const detail = stderr.trim() || error.message;
          reject(new Error(detail));
          return;
        }
        resolve(stdout.trim());
      },
    );
  });
}

/**
 * Classify user input using Claude CLI.
 * Returns a structured classification or null on any failure.
 */
export async function classifyWithClaude(input: string): Promise<ClaudeClassification | null> {
  try {
    const prompt = buildPrompt(input);
    const raw = await runClaudeClassifier(prompt);
    const result = parseClassification(raw);

    if (result) {
      console.log(
        `[ClaudeClassifier] Classified "${input}" as ${result.action} (confidence: ${String(result.confidence)})`,
      );
    } else {
      console.warn(
        `[ClaudeClassifier] Failed to parse response for "${input}":`,
        raw.slice(0, 200),
      );
    }

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ClaudeClassifier] Classification failed:', message);
    return null;
  }
}
