/**
 * WorkflowEngine Verdict Schemas
 *
 * Zod schemas for structured QA and Guardian verdicts.
 *
 * Agents write verdicts as JSONL entries to their progress file.
 * The QA_GATE and GUARDIAN state handlers read these — no free-text
 * SendMessage interpretation. Structured verdicts are the only source
 * of truth for pass/fail decisions.
 *
 * QA verdict entry format:
 *   {"type":"qa.verdict","data":{...QaVerdict...}}
 *
 * Guardian verdict entry format:
 *   {"type":"guardian.verdict","data":{...GuardianVerdict...}}
 */

import { z } from 'zod';

// ─── QA Verdict ───────────────────────────────────────────────

export const QaIssueSchema = z.object({
  /** Acceptance criterion reference (e.g. "AC-3") or free text */
  criterion: z.string(),
  /** Human-readable description of the issue */
  detail: z.string(),
  /** Whether this issue blocks merge */
  blocking: z.boolean(),
});

export type QaIssue = z.infer<typeof QaIssueSchema>;

export const QaVerdictSchema = z.object({
  /** Whether the QA round passed (no blocking issues) */
  passed: z.boolean(),
  /** Task slug this verdict applies to */
  taskId: z.string().min(1),
  /** List of issues found during QA */
  issues: z.array(QaIssueSchema).default([]),
  /** QA round number (1-based) */
  round: z.number().int().min(1),
});

export type QaVerdict = z.infer<typeof QaVerdictSchema>;

/** JSONL progress entry wrapping a QA verdict */
export const QaVerdictEntrySchema = z.object({
  type: z.literal('qa.verdict'),
  data: QaVerdictSchema,
});

export type QaVerdictEntry = z.infer<typeof QaVerdictEntrySchema>;

// ─── Guardian Verdict ─────────────────────────────────────────

export const GuardianViolationSchema = z.object({
  /** Rule that was violated (e.g. "file-size", "no-raw-html") */
  rule: z.string(),
  /** File where the violation was found */
  file: z.string(),
  /** Human-readable detail */
  detail: z.string(),
  /** Severity: blocking violations prevent finalization */
  severity: z.enum(['blocking', 'warning']),
});

export type GuardianViolation = z.infer<typeof GuardianViolationSchema>;

export const GuardianRecommendationSchema = z.object({
  suggestion: z.string(),
  file: z.string().optional(),
});

export type GuardianRecommendation = z.infer<typeof GuardianRecommendationSchema>;

export const GuardianVerdictSchema = z.object({
  /** Whether the guardian pass is clean (no blocking violations) */
  passed: z.boolean(),
  /** All violations found across all tasks */
  violations: z.array(GuardianViolationSchema).default([]),
  /** Number of checks run by the guardian */
  checksRun: z.number().int().min(0),
  /** Non-blocking recommendations */
  recommendations: z.array(GuardianRecommendationSchema).default([]),
});

export type GuardianVerdict = z.infer<typeof GuardianVerdictSchema>;

/** JSONL progress entry wrapping a guardian verdict */
export const GuardianVerdictEntrySchema = z.object({
  type: z.literal('guardian.verdict'),
  data: GuardianVerdictSchema,
});

export type GuardianVerdictEntry = z.infer<typeof GuardianVerdictEntrySchema>;
