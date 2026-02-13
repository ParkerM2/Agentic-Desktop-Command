/**
 * Task Decomposer — Uses Claude to break down complex tasks into subtasks.
 *
 * Leverages the ClaudeClient service to generate structured subtask suggestions
 * from natural language task descriptions.
 */

import type {
  EstimatedEffort,
  SuggestedPriority,
  TaskDecompositionResult,
  TaskSuggestion,
} from '@shared/types';

import type { ClaudeClient } from '../claude/claude-client';

// ── Interface ─────────────────────────────────────────────────

export interface TaskDecomposer {
  /** Check if the decomposer is configured (has API key). */
  isConfigured: () => boolean;

  /**
   * Decompose a task description into subtasks.
   * @param description - Natural language task description
   * @returns Array of suggested subtasks with effort and priority estimates
   */
  decompose: (description: string) => Promise<TaskDecompositionResult>;
}

// ── Constants ─────────────────────────────────────────────────

const DECOMPOSITION_SYSTEM_PROMPT = `You are a task decomposition assistant. Your job is to break down complex tasks into smaller, actionable subtasks.

When given a task description, analyze it and create 3-7 subtasks that:
1. Are concrete and actionable
2. Can be completed independently or in sequence
3. Together fully accomplish the original task

For each subtask, provide:
- A clear, concise title (under 80 characters)
- A brief description explaining what needs to be done
- An effort estimate: "small" (< 1 hour), "medium" (1-4 hours), or "large" (> 4 hours)
- A priority: "high" (blocking or critical path), "medium" (important but not blocking), or "low" (nice to have)

Respond ONLY with a valid JSON array of subtasks in this exact format:
[
  {
    "title": "Subtask title",
    "description": "Brief description of what to do",
    "estimatedEffort": "small" | "medium" | "large",
    "suggestedPriority": "low" | "medium" | "high"
  }
]

Do not include any other text, explanation, or markdown formatting. Just the JSON array.`;

// ── Validation ────────────────────────────────────────────────

const VALID_EFFORTS: EstimatedEffort[] = ['small', 'medium', 'large'];
const VALID_PRIORITIES: SuggestedPriority[] = ['low', 'medium', 'high'];

function isValidEffort(value: unknown): value is EstimatedEffort {
  return typeof value === 'string' && VALID_EFFORTS.includes(value as EstimatedEffort);
}

function isValidPriority(value: unknown): value is SuggestedPriority {
  return typeof value === 'string' && VALID_PRIORITIES.includes(value as SuggestedPriority);
}

function isValidSuggestion(obj: unknown): obj is TaskSuggestion {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const suggestion = obj as Record<string, unknown>;

  return (
    typeof suggestion.title === 'string' &&
    suggestion.title.length > 0 &&
    typeof suggestion.description === 'string' &&
    isValidEffort(suggestion.estimatedEffort) &&
    isValidPriority(suggestion.suggestedPriority)
  );
}

function parseDecompositionResponse(response: string): TaskSuggestion[] {
  // Try to extract JSON from the response (in case Claude adds any extra text)
  const jsonRegex = /\[[\s\S]*\]/;
  const jsonMatch = jsonRegex.exec(response);
  if (!jsonMatch) {
    throw new Error('Response does not contain a valid JSON array');
  }

  const [jsonString] = jsonMatch;
  const parsed: unknown = JSON.parse(jsonString);

  if (!Array.isArray(parsed)) {
    throw new Error('Response is not an array');
  }

  const suggestions: TaskSuggestion[] = [];
  for (const item of parsed) {
    if (isValidSuggestion(item)) {
      suggestions.push({
        title: item.title,
        description: item.description,
        estimatedEffort: item.estimatedEffort,
        suggestedPriority: item.suggestedPriority,
      });
    }
  }

  if (suggestions.length === 0) {
    throw new Error('No valid subtask suggestions in response');
  }

  return suggestions;
}

// ── Factory ───────────────────────────────────────────────────

export interface TaskDecomposerDeps {
  claudeClient: ClaudeClient;
}

export function createTaskDecomposer(deps: TaskDecomposerDeps): TaskDecomposer {
  const { claudeClient } = deps;

  // Conversation ID for decomposition requests (reused for efficiency)
  let conversationId: string | null = null;

  function ensureConversation(): string {
    // Use nullish coalescing assignment to create conversation if needed
    conversationId ??= claudeClient.createConversation('Task Decomposition');
    // Clear previous messages for a fresh context each time
    claudeClient.clearConversation(conversationId);
    return conversationId;
  }

  return {
    isConfigured() {
      return claudeClient.isConfigured();
    },

    async decompose(description) {
      if (!claudeClient.isConfigured()) {
        throw new Error(
          'Task decomposer is not configured. Please add your Anthropic API key in settings.',
        );
      }

      if (description.trim().length === 0) {
        throw new Error('Task description cannot be empty');
      }

      const convId = ensureConversation();

      try {
        const response = await claudeClient.sendMessage(convId, description, {
          systemPrompt: DECOMPOSITION_SYSTEM_PROMPT,
          maxTokens: 2048,
        });

        const suggestions = parseDecompositionResponse(response.message);

        return {
          originalDescription: description,
          suggestions,
        };
      } catch (error) {
        // Handle Claude client errors
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        // Check if it's a structured Claude error
        const { claudeError } = error as { claudeError?: { code: string; message: string } };
        if (claudeError) {
          throw new Error(`Decomposition failed: ${claudeError.message}`);
        }

        // Handle JSON parsing errors specifically
        if (errorMessage.includes('JSON') || errorMessage.includes('parse')) {
          throw new Error('Failed to parse Claude response. Please try again.');
        }

        throw new Error(`Decomposition failed: ${errorMessage}`);
      }
    },
  };
}
