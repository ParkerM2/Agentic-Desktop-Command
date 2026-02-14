/**
 * Token Parser — Extract token usage from Claude CLI output
 *
 * @deprecated Part of the legacy agent system. The new workflow/task-launcher.ts
 * delegates token tracking to the Hub backend. Kept for backward compatibility.
 *
 * Parses various output formats from Claude CLI to extract
 * input/output token counts and cost information.
 *
 * @deprecated Part of the legacy agent service. Will be replaced by workflow launcher.
 */

import { TOKEN_USAGE_PATTERNS, MODEL_PRICING } from '@shared/constants';
import type { TokenUsage } from '@shared/types';

interface ParsedTokens {
  inputTokens?: number;
  outputTokens?: number;
  cost?: number;
}

/**
 * Parse a number from a string, handling commas.
 */
function parseNumber(str: string): number {
  return parseInt(str.replaceAll(',', ''), 10);
}

/**
 * Parse a single line of CLI output for token information.
 */
export function parseTokenLine(line: string): ParsedTokens {
  const result: ParsedTokens = {};

  // Try combined patterns first (e.g., "tokens: 1000 / 500")
  for (const pattern of TOKEN_USAGE_PATTERNS.combined) {
    const match = line.match(pattern);
    if (match?.[1] && match[2]) {
      result.inputTokens = parseNumber(match[1]);
      result.outputTokens = parseNumber(match[2]);
      return result;
    }
  }

  // Try individual input token patterns
  for (const pattern of TOKEN_USAGE_PATTERNS.inputTokens) {
    const match = line.match(pattern);
    if (match?.[1] !== undefined) {
      result.inputTokens = parseNumber(match[1]);
      break;
    }
  }

  // Try individual output token patterns
  for (const pattern of TOKEN_USAGE_PATTERNS.outputTokens) {
    const match = line.match(pattern);
    if (match?.[1] !== undefined) {
      result.outputTokens = parseNumber(match[1]);
      break;
    }
  }

  // Try cost patterns
  for (const pattern of TOKEN_USAGE_PATTERNS.cost) {
    const match = line.match(pattern);
    if (match?.[1] !== undefined) {
      result.cost = parseFloat(match[1]);
      break;
    }
  }

  return result;
}

/**
 * Estimate cost based on token counts and model pricing.
 */
export function estimateCost(
  inputTokens: number,
  outputTokens: number,
  model: keyof typeof MODEL_PRICING = 'default',
): number {
  const pricing = MODEL_PRICING[model];
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  return Math.round((inputCost + outputCost) * 10000) / 10000; // Round to 4 decimal places
}

/**
 * Create an empty token usage object.
 */
export function createEmptyUsage(): TokenUsage {
  return {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    estimatedCostUsd: 0,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Update token usage with parsed values.
 * Adds to existing counts (accumulates over session).
 */
export function updateTokenUsage(
  current: TokenUsage,
  parsed: ParsedTokens,
  model: keyof typeof MODEL_PRICING = 'default',
): TokenUsage {
  const inputTokens = current.inputTokens + (parsed.inputTokens ?? 0);
  const outputTokens = current.outputTokens + (parsed.outputTokens ?? 0);
  const totalTokens = inputTokens + outputTokens;

  // Use parsed cost if available, otherwise estimate
  const estimatedCostUsd =
    parsed.cost === undefined
      ? estimateCost(inputTokens, outputTokens, model)
      : current.estimatedCostUsd + parsed.cost;

  return {
    inputTokens,
    outputTokens,
    totalTokens,
    estimatedCostUsd,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Check if a line might contain token information.
 * Quick check before running full regex parsing.
 */
export function mightContainTokenInfo(line: string): boolean {
  const lowerLine = line.toLowerCase();
  return (
    lowerLine.includes('token') ||
    lowerLine.includes('input') ||
    lowerLine.includes('output') ||
    lowerLine.includes('cost') ||
    lowerLine.includes('usage') ||
    lowerLine.includes('$')
  );
}
