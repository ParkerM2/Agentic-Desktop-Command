# /resume-feature — Checkpoint Recovery

> Resume a previously interrupted feature implementation from its last checkpoint. Reads progress context, identifies where the previous agent stopped, and continues from that point.

**Usage:** Called by the orchestrator with progress context injected into the prompt.

---

## Phase 1: Understand Context

You have been spawned to resume work that a previous agent started but did not finish.

1. **Read the progress context** provided in your prompt (JSONL entries from the previous session)
2. **Identify the original task** from the "Original task:" line in your prompt
3. **Determine the phase** — was the previous agent planning or executing?

---

## Phase 2: Load Project Context

Read these files to understand the system:

```
MANDATORY READS:
1. CLAUDE.md                       — Project rules, tech stack, patterns
2. ai-docs/ARCHITECTURE.md         — System architecture, IPC flow
3. ai-docs/PATTERNS.md             — Code conventions, component patterns
```

---

## Phase 3: Analyze Previous Progress

Parse the JSONL entries to understand what happened:

### Tool Use Entries (`type: "tool_use"`)
- What tools were used? (Read, Write, Edit, Bash, etc.)
- This tells you what files were being worked on

### Phase Change Entries (`type: "phase_change"`)
- What phase was the agent in when it stopped?
- How far through the total phases did it get?

### Agent Stopped Entries (`type: "agent_stopped"`)
- Why did the agent stop? (completed, error, killed, timeout)
- This helps determine if work was partially done

### Error Entries (`type: "error"`)
- Were there errors? What kind?
- This helps avoid repeating the same mistakes

---

## Phase 4: Assess Current State

Before resuming work:

1. **Check git status** — Are there uncommitted changes from the previous session?
   ```bash
   git status
   git diff --stat
   ```

2. **Check for partial work** — Look for files that were being edited:
   ```bash
   git diff --name-only
   ```

3. **Run verification** to see current state:
   ```bash
   npm run typecheck 2>&1 | tail -20
   npm run lint 2>&1 | tail -20
   ```

4. **Determine resume point:**
   - If the previous agent completed some tasks cleanly, skip those
   - If work was partially done on a file, review and continue from there
   - If there were errors, understand the root cause before retrying

---

## Phase 5: Resume Work

Based on your analysis:

### If resuming a planning phase:
- Check if a plan file was partially written
- If yes, review and complete it
- If no, start the planning process fresh using the `/plan-feature` approach
- Write the plan to `docs/features/<feature-slug>/plan.md`

### If resuming an execution phase:
- Identify which tasks from the plan are complete vs incomplete
- Start working on the first incomplete task
- Follow the same patterns and conventions as the original agent

### General resume guidelines:
- Do NOT redo work that was already completed successfully
- Do NOT revert changes that look correct
- If you find broken/partial changes, fix them rather than starting over
- Commit working checkpoints frequently

---

## Phase 6: Verification

Before claiming work is complete, run the full verification suite:

```bash
npm run lint && npm run typecheck && npm run test && npm run build && npm run check:docs
```

All five commands must pass. This is mandatory and non-skippable.

---

## Important Notes

- You are continuing someone else's work. Respect their approach unless it was clearly wrong.
- If the previous agent's approach was fundamentally flawed, explain why and take a different approach.
- Always check for uncommitted changes before starting — the previous session may have left work in progress.
- If you cannot determine what the previous agent was doing, treat this as a fresh start but note what you found.
