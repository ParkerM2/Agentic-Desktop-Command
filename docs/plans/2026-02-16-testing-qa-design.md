# Testing & QA Strategy — Production Hardening Design

> Tracker Key: `testing-qa` | Status: **APPROVED** | Created: 2026-02-16

**Scope**: Tier 1 critical path tests for hardening features + existing data-critical services

---

## Executive Summary

ADC has 137 passing tests across 5 test files, covering 3 of 37 services. The hardening phase introduces new infrastructure (ErrorCollector, health registry, atomic writes, error boundaries) that needs test coverage. This plan adds Tier 1 tests for **data-critical paths** — the areas where bugs cause data loss, security breaches, or app crashes.

**Target: ~13 new test files, ~150-200 new tests.**

---

## 1. Current Test Landscape

| Category | Files | Tests | Coverage |
|----------|-------|-------|----------|
| Unit (services) | 3 | 75 | project-service, task-service, hub-token-store |
| Integration (handlers) | 2 | 62 | project-handlers, task-handlers |
| E2E | 2 | 6 | app-launch, navigation |
| QA Scenarios | 3 | manual | project-management, task-creation, README |
| **Total** | **10** | **137 + 6 E2E** | **3 of 37 services** |

---

## 2. Tier 1 Test Plan — Critical Path

### 2a. New Hardening Infrastructure Tests

| Test File | What It Tests | Est. Tests |
|-----------|---------------|------------|
| `tests/unit/lib/safe-write-json.test.ts` | Atomic write, fsync, rename, failure recovery, original file integrity | 8-10 |
| `tests/unit/services/error-collector.test.ts` | Report, getLog, getStats, persistence, 7-day retention, severity filtering, capacity alert | 15-20 |
| `tests/unit/services/health-registry.test.ts` | Register, pulse, sweep, unhealthy detection, missed pulse counting | 10-12 |
| `tests/unit/services/agent-spawner.test.ts` | TaskId validation, env scrubbing, working dir validation, CLI flag assembly | 12-15 |

### 2b. Data-Critical Store Tests

| Test File | What It Tests | Est. Tests |
|-----------|---------------|------------|
| `tests/unit/services/settings-store.test.ts` | Read, write, atomic save, corruption recovery, backup on read, defaults | 12-15 |
| `tests/unit/services/settings-encryption.test.ts` | Encrypt, decrypt, safeStorage fallback, plaintext migration | 8-10 |
| `tests/unit/services/conversation-store.test.ts` | Read, write, backup, corruption recovery | 8-10 |
| `tests/unit/services/email-store.test.ts` | Read, write, backup, corruption recovery | 8-10 |
| `tests/unit/services/briefing-cache.test.ts` | Read, write, backup, corruption recovery | 8-10 |

### 2c. Integration Handler Tests

| Test File | What It Tests | Est. Tests |
|-----------|---------------|------------|
| `tests/integration/ipc-handlers/agent-handlers.test.ts` | Spawn, stop, list, status changes, taskId validation at handler level | 12-15 |
| `tests/integration/ipc-handlers/auth-handlers.test.ts` | Login, register, refresh token, error responses | 10-12 |
| `tests/integration/ipc-handlers/settings-handlers.test.ts` | Get, update, security settings, webhook settings | 10-12 |

### 2d. E2E Test Additions

Extend existing `app-launch.spec.ts` and `navigation.spec.ts`:

| Scenario | Validates |
|----------|-----------|
| Navigate to each route group | No white screens (baseline error boundary check) |
| Renderer process recovery | Kill renderer → window auto-recreates |
| Settings survive restart | Write setting → restart → setting persists |

---

## 3. Test Patterns for New Code

### ErrorCollector Tests

```
- report() creates entry with correct fields and UUID
- report() persists to error-log.json
- getLog() returns entries sorted by timestamp
- getLog(since) filters by date
- getStats() returns correct counts by tier, severity
- Entries older than 7 days are pruned on init
- Capacity alert emits at 50 entries in session
- Corruption in error-log.json doesn't crash init (starts fresh)
- Concurrent writes don't corrupt the file (atomic writes)
```

### Atomic Write Tests

```
- Normal write creates file with correct content
- Write uses .tmp file (verify temp file created during write)
- Original file untouched if rename fails (simulate failure)
- Backup file created on successful read
- Corruption detected → falls back to .bak file
- Both corrupted → falls back to defaults
- dataRecovery event emitted on fallback
```

### Agent Spawner Tests

```
- Valid taskId (alphanumeric, hyphens, underscores) passes
- TaskId with shell metacharacters (;, |, &, $, `, ", ') throws
- Empty taskId throws
- Sandboxed mode strips HUB_*, SMTP_*, SLACK_* from env
- Sandboxed mode preserves PATH, HOME, TERM, SHELL
- Unrestricted mode passes full process.env
- Custom blocklist patterns applied correctly
- Working directory must exist
- Working directory must be a directory (not a file)
- CLI flags assembled with --dangerously-skip-permissions by default
- Per-project flag overrides applied
```

### Store Backup/Recovery Pattern (Shared)

Each store test file follows the same pattern:

```
1. Write valid data → read back → matches
2. Write valid data → read succeeds → .bak file exists
3. Corrupt primary file → read falls back to .bak → correct data
4. Corrupt both files → read returns defaults
5. Recovery emits dataRecovery event with correct tier
6. Atomic write: crash during write → previous data intact
```

---

## 4. Test Infrastructure

### Mocks Needed

| Mock | Purpose | Location |
|------|---------|----------|
| `fs` mock | Simulate file corruption, write failures | `tests/setup/mocks/fs-mock.ts` (extend existing) |
| `safeStorage` mock | Simulate encryption/decryption | `tests/setup/mocks/electron-mock.ts` (extend existing) |
| `pty` mock | Simulate agent spawn without real process | `tests/setup/mocks/pty-mock.ts` (new) |

### Test Utilities

| Utility | Purpose |
|---------|---------|
| `createTempDir()` | Creates isolated temp directory for file tests, cleaned up after |
| `corruptFile(path)` | Writes garbage to a file to simulate corruption |
| `createStoreTestHarness(StoreClass)` | Shared test setup for store backup/recovery pattern |

---

## 5. Implementation Order

| Phase | Test Files | Rationale |
|-------|-----------|-----------|
| **Phase 1** | `safe-write-json.test.ts` | Foundation utility — other store tests depend on it |
| **Phase 2** | `error-collector.test.ts`, `health-registry.test.ts` | New hardening infrastructure |
| **Phase 3** | `settings-store.test.ts`, `settings-encryption.test.ts` | Most critical user data |
| **Phase 4** | `agent-spawner.test.ts` | Security-critical path |
| **Phase 5** | Store tests (conversation, email, briefing) | Data integrity |
| **Phase 6** | Handler integration tests (agent, auth, settings) | IPC contract validation |
| **Phase 7** | E2E additions | End-to-end resilience |

---

## 6. Success Criteria

| Metric | Before | After |
|--------|--------|-------|
| Test files | 5 | ~18 |
| Total tests | 137 | ~300-350 |
| Services with coverage | 3/37 | 10/37 (Tier 1 services) |
| Handler files with coverage | 2/38 | 5/38 (Tier 1 handlers) |
| Hardening code coverage | 0% | 100% of new infrastructure |
| E2E scenarios | 6 | ~10 |

---

## Future Roadmap Items (Not in This Plan)

- **GitHub CI/CD Pipeline** — GitHub Actions workflow to run lint, typecheck, test, build on push/PR. Includes E2E tests in CI with Electron + Playwright.
- **Tier 2 Tests** — IPC handler response shape tests for all 38 handlers, Hub API client tests, orchestrator lifecycle tests.
- **Tier 3 Tests** — Component rendering tests, full E2E feature flows (project → tasks → agent workflow).
- **Coverage Reporting** — Integrate `vitest --coverage` into CI with minimum coverage thresholds.
