/**
 * Supported Claude model definitions
 */

export const CLAUDE_MODELS = [
  { id: 'claude-opus-4-6', label: 'Claude Opus 4.6', shortLabel: 'Opus 4.6' },
  { id: 'claude-sonnet-4-5-20250929', label: 'Claude Sonnet 4.5', shortLabel: 'Sonnet 4.5' },
  { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5', shortLabel: 'Haiku 4.5' },
] as const;

/** Map of model ID to short display label */
export const MODEL_SHORT_LABELS: Record<string, string> = Object.fromEntries(
  CLAUDE_MODELS.map((m) => [m.id, m.shortLabel]),
);
