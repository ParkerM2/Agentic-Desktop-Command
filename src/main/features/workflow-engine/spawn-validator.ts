/**
 * Spawn Validator — validates agent spawn prompts before execution
 *
 * Prevents the session 1e5c9e27 failure mode where agents were spawned
 * with bare ~300-token task descriptions and no project rules, no workflow
 * phase protocol, and no communication instructions.
 *
 * All three required references MUST appear in every spawn prompt:
 *   - "CLAUDE.md"            — agent references project rules
 *   - "AGENT-WORKFLOW-PHASES" — agent knows the 4-phase protocol
 *   - "SendMessage"           — agent knows communication rules
 *
 * Missing any reference is a HARD FAIL — the workflow transitions to ERROR.
 * This is intentional: a malformed prompt produces unusable agent output
 * (proven by incident 1e5c9e27), so failing early is cheaper than
 * letting agents run and produce waste.
 */

// ─── Required references ──────────────────────────────────────

/** Strings that MUST appear in every agent spawn prompt. */
const REQUIRED_PROMPT_REFS = [
  'CLAUDE.md',
  'AGENT-WORKFLOW-PHASES',
  'SendMessage',
] as const;

// ─── Validator ────────────────────────────────────────────────

/**
 * Validates that a spawn prompt contains all required references.
 *
 * Throws a descriptive error listing every missing reference so the
 * team leader can diagnose which part of context injection failed.
 *
 * @throws Error if any required reference is absent
 */
export function validateSpawnPrompt(prompt: string, taskSlug: string): void {
  const missing = REQUIRED_PROMPT_REFS.filter((ref) => !prompt.includes(ref));

  if (missing.length > 0) {
    const list = missing.map((ref) => `  - "${ref}"`).join('\n');
    throw new Error(
      `SPAWN VALIDATION FAIL for task "${taskSlug}": ` +
        `spawn prompt is missing required references:\n${list}\n\n` +
        `Every agent prompt must contain CLAUDE.md (project rules), ` +
        `AGENT-WORKFLOW-PHASES (4-phase protocol), and SendMessage (comms). ` +
        `Check that context-builder ran correctly for this task.`,
    );
  }
}
