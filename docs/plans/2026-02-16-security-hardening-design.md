# Security Hardening — Production Hardening Design

**Date**: 2026-02-16
**Status**: Approved design — ready for implementation
**Scope**: Agent sandboxing, IPC security, CSP, configurable security settings, remaining audit items

---

## Executive Summary

ADC has solid foundations (CSP, context isolation, credential encryption) but needs hardening in agent spawning (command injection, env leakage), IPC channel security, and CSP completeness. Critically, security settings should be **user-configurable** with agent prompt awareness so agents don't get stuck working around blocked resources.

**Key auth model:** ADC does NOT use Anthropic API keys directly. Users authenticate Claude CLI via `claude login`, and agents spawn with `--dangerously-skip-permissions` for autonomous operation.

---

## 1. Agent Spawn Security

### 1a. TaskId Sanitization

**Current:** `claude --task "${taskId}"\r` passed directly to PTY shell.
**Risk:** Shell metacharacter injection if taskId contains `"; rm -rf /`.

**Fix:**
- Validate taskId against allowlist: `/^[a-zA-Z0-9_-]+$/`
- Reject any taskId that doesn't match → throw error, don't spawn
- Apply to both `agent-spawner.ts` and `agent-orchestrator.ts` spawn paths

### 1b. Claude CLI Flags

**Current:** `claude --task "${taskId}"\r` or `claude\r` — no permission bypass flag.
**Problem:** Agents get stuck on interactive permission prompts.

**Fix:**
- Default spawn command: `claude --dangerously-skip-permissions --task "${taskId}"`
- Flags configurable in Settings → Security → "Agent Spawn Flags"
- Per-project override in Project Settings → "Agent Configuration"

**Global default flags:**
```
--dangerously-skip-permissions
```

**Per-project overrides** (in Project Settings):
- Additional flags (e.g., `--model`, `--max-turns`)
- Can override global flags for a specific project
- Stored in `project.agentConfig.spawnFlags` in project settings

### 1c. Configurable Agent Environment

**Settings page → Security tab → "Agent Environment" section:**

**Mode toggle:**
- **Sandboxed (default):** Uses env var blocklist. Blocked vars listed and editable.
- **Unrestricted:** Full `process.env` passed through. Warning banner displayed.

**Default blocklist (Sandboxed mode):**
- `HUB_*` — Hub server credentials
- `SMTP_*` — Email server credentials
- `SLACK_*` — Slack API tokens
- `WEBHOOK_*` — Webhook secrets
- `GITHUB_TOKEN` — GitHub personal access token
- Database connection strings (`DATABASE_*`, `DB_*`, `MONGO_*`, `REDIS_*`)

**Always passed through (non-removable):**
- `PATH` — required for tool resolution
- `HOME` / `USERPROFILE` — required for Claude CLI auth (`~/.claude/`)
- `TERM`, `COLORTERM` — terminal rendering
- `SHELL` / `COMSPEC` — shell detection
- `LANG`, `LC_*` — locale

**User can:**
- Remove items from the default blocklist (e.g., if agent needs `GITHUB_TOKEN` for git)
- Add custom patterns (e.g., `AWS_*`, `AZURE_*`)
- Switch to Unrestricted mode to pass everything

### 1d. Agent Prompt Awareness

When security settings change, agents are made aware:

**Environment variable `SECURITY_CONTEXT`** set on every agent process:
```
SECURITY_CONTEXT=sandboxed; blocked: HUB_*, SMTP_*, SLACK_*; cwd_restricted: true
```

**Team-lead orchestrator prompt injection:**
When the orchestrator spawns, its initial prompt includes:
```
Security context: The following env vars are blocked by security settings: [list].
Do not attempt to use tools/APIs that depend on these. If you need a blocked
variable, report it as a blocker rather than trying to work around it.
```

**Assistant service awareness:**
- The assistant's prompt context includes the active security posture
- When users ask "why can't my agent access GitHub?" → assistant can explain the blocked var

### 1e. Working Directory Validation

**Current:** `existsSync(workDir)` check only.

**Fix:**
- Resolve to absolute path (`path.resolve`)
- Verify it's a directory (not a file)
- **Restricted mode (default):** Must be under home directory or a registered project path
- **Unrestricted mode:** Any existing directory
- Configurable in Security settings

---

## 2. IPC Channel Security

### 2a. Preload Channel Allowlist

**Current:** `ipcRenderer.invoke(channel, input)` accepts any channel string.

**Fix:** Validate against the IPC contract before forwarding:

```typescript
import { invokeChannels, eventChannels } from '@shared/ipc-contract';

const ALLOWED_INVOKE = new Set(invokeChannels);
const ALLOWED_EVENTS = new Set(eventChannels);

invoke(channel, input) {
  if (!ALLOWED_INVOKE.has(channel)) {
    return Promise.resolve({ success: false, error: `Unknown channel: ${channel}` });
  }
  return ipcRenderer.invoke(channel, input);
}

on(channel, handler) {
  if (!ALLOWED_EVENTS.has(channel)) {
    return () => {}; // noop unsubscribe
  }
  // ... existing listener code
}
```

Defense-in-depth — the IPC router already validates, but catching at preload is earlier.

Configurable: Security settings → "IPC Channel Allowlist" toggle (default: enabled).

### 2b. IPC Throttling for Expensive Operations

Simple debounce guards on high-cost IPC handlers:

| Channel | Throttle |
|---------|----------|
| `agents.spawn` | Max 1 per 5 seconds |
| `email.send` | Max 1 per 2 seconds |
| `qa.runFull` | Max 1 per 10 seconds |
| `orchestrator.spawn` | Max 1 per 5 seconds |

Applied in the handler files, not the router (keeps the router clean).

---

## 3. CSP Hardening

### Current CSP

```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'
```

### Updated CSP (Strict mode — default)

```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline';
connect-src 'self';
img-src 'self' data: blob:;
font-src 'self';
media-src 'none';
object-src 'none';
frame-src 'none';
```

### Relaxed mode (configurable)

```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline';
connect-src 'self' *;
img-src 'self' data: blob: *;
font-src 'self' *;
media-src 'self';
object-src 'none';
frame-src 'none';
```

Relaxed mode allows `connect-src *` for plugins/integrations that need to reach external APIs.

**Note:** `style-src 'unsafe-inline'` is required for Tailwind v4's runtime style injection. Documented and acceptable — `script-src 'self'` is the critical XSS protection.

**Configuration:** Security settings → "Content Security Policy" → Strict / Relaxed toggle.

CSP is set via `<meta>` tag in `index.html`. Changing it requires the main process to update the HTML before loading — this means CSP changes take effect on next app restart.

---

## 4. Security Settings Tab

### Location

Settings page → new "Security" tab (alongside existing tabs)

### Sections

**1. Agent Environment**
- Mode: Sandboxed / Unrestricted toggle
- Blocked variables list (editable when Sandboxed)
- "Always passed through" reference list (read-only)

**2. Agent Spawn Configuration**
- Default Claude CLI flags (text input, default: `--dangerously-skip-permissions`)
- Working directory restriction: Project paths only / Any path

**3. IPC Security**
- Channel allowlist: Enabled / Disabled toggle
- Throttling: Enabled / Disabled toggle

**4. Content Security Policy**
- Mode: Strict / Relaxed toggle
- Note: "Changes take effect after restart"

**5. Export Security Audit**
- Button: "Export Security Configuration"
- Exports current security settings as JSON for review/backup

---

## 5. Remaining Audit Items

### 5a. API Key Rotation & Expiry (Audit Item 1g)

**Hub server changes:**
- Add `expires_at` column to API keys table (default: 90 days from creation)
- Add `POST /auth/rotate-key` endpoint:
  - Generates new key
  - Invalidates old key after a 5-minute grace period
  - Returns new key to client
- Add `GET /auth/key-status` endpoint (returns expiry date, days remaining)

**ADC client changes:**
- On 401 response, check if key is expired → prompt user to rotate
- Settings page → Hub section: show key expiry date, "Rotate Key" button
- Optional: warning notification when key expires within 7 days

### 5b. Docker Non-Root User (Audit Item 1h)

```dockerfile
# Create non-root user
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser

# Set ownership of app directory
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser
```

### 5c. .dockerignore (Audit Item 1i)

```
node_modules
.env
.env.*
certs/
data/
*.log
.git
.claude/
coverage/
dist/
out/
```

---

## 6. Implementation Order

| Phase | Components |
|-------|-----------|
| **Phase 1** | TaskId sanitization + Claude CLI flags (`--dangerously-skip-permissions`) |
| **Phase 2** | Agent environment scrubbing (configurable blocklist) |
| **Phase 3** | Security settings tab in Settings page |
| **Phase 4** | IPC channel allowlist in preload |
| **Phase 5** | CSP hardening (strict/relaxed modes) |
| **Phase 6** | Agent prompt awareness (SECURITY_CONTEXT, orchestrator prompts) |
| **Phase 7** | IPC throttling for expensive operations |
| **Phase 8** | Hub API key rotation + expiry |
| **Phase 9** | Docker hardening (.dockerignore, non-root user) |

---

## 7. Security Model Summary

```
User configures security posture in Settings → Security tab
    ↓
Agent spawner reads config at spawn time
    ↓
PTY process created with:
  - Sanitized taskId
  - Scrubbed or full env (based on mode)
  - Claude CLI with configured flags (--dangerously-skip-permissions default)
  - Validated working directory
  - SECURITY_CONTEXT env var describing restrictions
    ↓
Agent prompt includes security awareness
    ↓
IPC calls validated at preload (allowlist) and router (Zod schemas)
    ↓
CSP restricts renderer capabilities (no direct external network)
    ↓
All security events logged to ErrorCollector + structured logger
```
