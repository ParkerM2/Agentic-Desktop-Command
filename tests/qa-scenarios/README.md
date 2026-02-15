# QA Scenarios — Claude-UI

This directory contains test scenarios for the AI QA Agent to execute exploratory visual testing of the Claude-UI application.

## Overview

The QA Agent (Quinn) uses MCP Electron tools to interact with the running application, taking screenshots and verifying behavior against documented expectations.

## Prerequisites

### 1. Application Must Be Running

The QA agent interacts with a live running application. Start the app before running QA tests:

```bash
# Development mode (recommended for testing)
npm run dev

# Or production build for release testing
npm run build && npm run preview
```

### 2. MCP Electron Server Must Be Accessible

The MCP Electron server connects via Chrome DevTools Protocol on port 9222. Verify the app is accessible:

```bash
# Check if debugging port is listening
curl http://localhost:9222/json
```

### 3. Claude CLI Must Be Available

The QA agent runs via Claude CLI with access to MCP tools:

```bash
# Verify Claude CLI is installed
claude --version
```

## Available Scenarios

| Scenario | File | Description |
|----------|------|-------------|
| Task Creation | `task-creation.md` | Create tasks, validation, edge cases |
| Project Management | `project-management.md` | Add/remove/switch projects |

## How to Run QA Scenarios

### Option 1: Run All Scenarios (Automated)

```bash
# Start the app in test mode, then invoke QA agent
npm run test:qa
```

This script:
1. Builds the application
2. Starts it in test mode
3. Waits for app to be ready
4. Invokes the QA agent with all scenarios

### Option 2: Run Specific Scenario

```bash
# Start the app first
npm run dev

# In another terminal, run specific scenario
cat tests/qa-scenarios/task-creation.md | claude --agent qa-tester --input
```

### Option 3: Interactive QA Session

Start an interactive session with the QA agent for exploratory testing:

```bash
# Start the app
npm run dev

# Start interactive QA session
claude --agent qa-tester
```

Then provide natural language instructions:
```
Run the task creation scenario focusing on edge cases.
```

### Option 4: Direct MCP Tool Usage

For debugging or quick checks, you can use MCP tools directly in any Claude session:

```
Take a screenshot of the current app state and describe what you see.
```

## QA Agent Configuration

The QA agent is defined in `.claude/agents/qa-tester.md` and uses these MCP tools:

| Tool | Purpose |
|------|---------|
| `mcp__electron__take_screenshot` | Capture visual state |
| `mcp__electron__send_command_to_electron` | Interact with UI |
| `mcp__electron__get_electron_window_info` | Check window properties |
| `mcp__electron__read_electron_logs` | Read console output |

## Interpreting QA Reports

The QA agent produces structured reports with these sections:

### Summary Section

| Status | Meaning |
|--------|---------|
| **PASS** | All test cases passed, no issues found |
| **FAIL** | One or more test cases failed |
| **BLOCKED** | Could not complete testing (app not running, etc.) |

### Issue Severity

| Severity | Action Required |
|----------|-----------------|
| **Critical** | Must fix before release (security, crash, data loss) |
| **Major** | Should fix before release (feature broken) |
| **Minor** | Fix if time permits (edge case, minor UX) |
| **Cosmetic** | Low priority (visual polish) |

### Issue Types

| Type | Description |
|------|-------------|
| **Bug** | Functional defect, incorrect behavior |
| **UX Issue** | Confusing or frustrating user experience |
| **Accessibility** | Fails accessibility standards |
| **Performance** | Slow or unresponsive behavior |

## Writing New Scenarios

### Scenario File Structure

```markdown
# QA Scenario: [Feature Name]

## Objective
[What this scenario tests]

## Preconditions
- [Required app state]
- [Required data]

## Test Case 1: [Case Name]

### Steps
| # | Action | Method | Expected Result |
|---|--------|--------|-----------------|
| 1 | [action] | [MCP command] | [expected] |

### Expected Outcomes
- [bullet points]

## Test Case 2: ...

## Accessibility Checklist
- [ ] [accessibility requirement]

## Console Log Patterns to Watch For
- [error patterns that indicate failure]
```

### Best Practices

1. **Be Specific** — Include exact button text, selectors, or identifiers
2. **Include Test Data** — Provide specific strings to enter
3. **Define Expected Outcomes** — State what should happen, not just what to do
4. **Cover Edge Cases** — Empty inputs, long strings, special characters
5. **Include Accessibility** — Keyboard navigation, screen reader support
6. **Document Console Patterns** — What errors indicate failure

## Troubleshooting

### "BLOCKED: Application not running"

The QA agent cannot connect to the app:

1. Ensure `npm run dev` is running
2. Check the app window is visible and not minimized
3. Verify port 9222 is accessible: `curl http://localhost:9222/json`

### Screenshots Fail

MCP screenshot tool may fail if:

1. App window is minimized
2. App is on a different virtual desktop
3. System permissions not granted for screen capture

### Commands Fail

If `send_command_to_electron` fails:

1. Check if the element exists using `get_page_structure`
2. Verify selector or text is correct
3. Check if element is visible and not covered

### Console Logs Empty

If `read_electron_logs` returns nothing:

1. Console logs may be cleared or filtered
2. Try with `logType: "all"` parameter
3. Check if logging is enabled in app

## CI/CD Integration

QA scenarios are designed for manual/PR review use, not automated CI runs. For CI, use:

- **Unit tests**: `npm run test:unit`
- **Integration tests**: `npm run test:integration`
- **E2E tests**: `npm run test:e2e`

QA agent testing is best for:
- Pre-release verification
- PR review of UI changes
- Exploratory testing of new features
- Accessibility audits

## Related Documentation

- `.claude/agents/qa-tester.md` — QA agent definition
- `docs/plans/2026-02-14-test-suite-design.md` — Test architecture
- `.mcp.json` — MCP server configuration
