/**
 * Claude CLI output patterns for parsing agent status.
 *
 * These patterns are matched against CLI stdout to detect
 * status changes, progress updates, and errors.
 */

/** Patterns that indicate the agent has started working */
export const STATUS_RUNNING_PATTERNS = ['Starting task'] as const;

/** Patterns that indicate the agent completed successfully */
export const STATUS_COMPLETED_PATTERNS = ['Task completed', '\u2713 Done'] as const;

/** Patterns that indicate the agent encountered an error */
export const STATUS_ERROR_PATTERNS = ['Error:', '\u2717 Failed'] as const;

/** Patterns that indicate progress updates */
export const PROGRESS_PATTERNS = ['Phase:', 'Step:'] as const;

/**
 * Patterns for extracting token usage from Claude CLI output.
 * Claude CLI outputs usage in various formats depending on version and mode.
 */
export const TOKEN_USAGE_PATTERNS = {
  /** Match "X input tokens" or "input: X" */
  inputTokens: [/(\d[\d,]*)\s*input\s*tokens?/i, /input[:\s]+(\d[\d,]*)/i],
  /** Match "X output tokens" or "output: X" */
  outputTokens: [/(\d[\d,]*)\s*output\s*tokens?/i, /output[:\s]+(\d[\d,]*)/i],
  /** Match "tokens: X / Y" or "X in / Y out" format */
  combined: [
    /tokens?[:\s]+(\d[\d,]*)\s*\/\s*(\d[\d,]*)/i,
    /(\d[\d,]*)\s*in\s*\/\s*(\d[\d,]*)\s*out/i,
  ],
  /** Match cost patterns like "$0.05" or "cost: $0.05" */
  cost: [/\$(\d+\.?\d*)/i, /cost[:\s]+\$?(\d+\.?\d*)/i],
} as const;

/**
 * Model pricing per 1M tokens (approximate as of 2025)
 * Used for cost estimation when only token counts are available.
 */
export const MODEL_PRICING = {
  'claude-3-opus': { input: 15.0, output: 75.0 },
  'claude-3-sonnet': { input: 3.0, output: 15.0 },
  'claude-3-haiku': { input: 0.25, output: 1.25 },
  'claude-3.5-sonnet': { input: 3.0, output: 15.0 },
  'claude-3.5-haiku': { input: 0.8, output: 4.0 },
  'claude-opus-4': { input: 15.0, output: 75.0 },
  'claude-sonnet-4': { input: 3.0, output: 15.0 },
  default: { input: 3.0, output: 15.0 },
} as const;

export type ModelName = keyof typeof MODEL_PRICING;
