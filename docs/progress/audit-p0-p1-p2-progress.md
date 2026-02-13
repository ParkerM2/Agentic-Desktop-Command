# Feature: Audit P0-P1-P2 Implementation

**Status**: IN_PROGRESS
**Team**: audit-security-wiring
**Base Branch**: master
**Feature Branch**: feature/audit-p0-p1-p2
**Design Doc**: docs/plans/2026-02-13-full-codebase-audit.md
**Started**: 2026-02-13 12:00
**Last Updated**: 2026-02-13 14:30
**Updated By**: team-lead (P0 complete)

---

## Scope

Implementing audit items P0 (Security), P1 (Wiring Gaps), and P2 (Setup/Onboarding) from the full codebase audit.

### P0 — Security (6 items)
1. Encrypt OAuth credentials via safeStorage
2. Encrypt webhook secrets via safeStorage
3. Protect Hub bootstrap endpoint
4. Add rate limiting to Hub
5. Fix CORS to explicit origins
6. Fix WebSocket auth

### P1 — Wiring Gaps (5 items)
7. Wire Slack/Discord action buttons to MCP tools
8. Wire DailyStats tasksCompleted to real query
9. Wire Claude CLI auth check into app startup
10. Add listeners for 4 emitted-but-unlistened events
11. Wire Calendar overlay into Planner view

### P2 — Setup & Onboarding (5 items)
12. Build first-run onboarding wizard
13. Add webhook setup instructions + test/ping button
14. Add OAuth credential validation before saving
15. Create `.env.example` with all supported variables
16. Hub connection pre-save validation

---

## Agent Registry

| Agent Name | Role | Worktree Branch | Task ID | Status | QA Round | Notes |
|------------|------|-----------------|---------|--------|----------|-------|
| security-eng-1 | Security Engineer | audit/encrypt-secrets | #1 | COMPLETE | 1/3 | QA passed first round |
| hub-security-eng | Hub Security Engineer | audit/hub-security | #2 | COMPLETE | 2/3 | Fixed timing attack on QA round 1 |
| hub-security-eng-2 | Hub Security Engineer | audit/cors-ws-fix | #3-4 | COMPLETE | 1/3 | Combined CORS + WS auth |

---

## Task Progress

### Phase: P0 Security

#### Task #1: Encrypt secrets with safeStorage [COMPLETE]
- **Scope**: P0.1 + P0.2 — OAuth creds + webhook secrets
- **Agent**: TBD
- **Worktree**: feature/audit-p0-p1-p2/encrypt-secrets
- **Files to Modify**:
  - `src/main/services/settings/settings-service.ts`
  - `src/main/auth/providers/*.ts` (OAuth provider configs)
- **Steps**:
  - Step 1: Identify all plaintext secret storage locations ⬜
  - Step 2: Create encryption/decryption helpers using safeStorage ⬜
  - Step 3: Migrate OAuth credentials to encrypted storage ⬜
  - Step 4: Migrate webhook secrets to encrypted storage ⬜
  - Step 5: Update read/write paths to use encryption ⬜
- **QA Status**: NOT STARTED
- **QA Report**: —

#### Task #2: Protect Hub bootstrap + rate limiting [COMPLETE]
- **Scope**: P0.3 + P0.4
- **Agent**: TBD
- **Worktree**: feature/audit-p0-p1-p2/hub-security
- **Files to Modify**:
  - `hub/src/routes/auth.ts`
  - `hub/src/app.ts`
  - `hub/package.json` (add @fastify/rate-limit)
- **Steps**:
  - Step 1: Add environment variable for bootstrap passphrase ⬜
  - Step 2: Require passphrase for POST /api/auth/generate-key ⬜
  - Step 3: Install and configure @fastify/rate-limit ⬜
  - Step 4: Apply rate limiting to all routes ⬜
- **QA Status**: NOT STARTED
- **QA Report**: —

#### Task #3: Fix CORS origins [COMPLETE]
- **Scope**: P0.5
- **Agent**: TBD
- **Worktree**: feature/audit-p0-p1-p2/cors-fix
- **Files to Modify**:
  - `hub/src/app.ts`
- **Steps**:
  - Step 1: Define allowed origins list (localhost, Electron app) ⬜
  - Step 2: Replace `origin: true` with explicit origin validation ⬜
  - Step 3: Add environment variable for additional allowed origins ⬜
- **QA Status**: NOT STARTED
- **QA Report**: —

#### Task #4: Fix WebSocket auth [COMPLETE]
- **Scope**: P0.6
- **Agent**: TBD
- **Worktree**: feature/audit-p0-p1-p2/ws-auth
- **Files to Modify**:
  - `hub/src/app.ts`
  - `src/main/services/hub/hub-service.ts` (client side)
- **Steps**:
  - Step 1: Implement first-message auth protocol for WebSocket ⬜
  - Step 2: Remove API key from query string ⬜
  - Step 3: Update Electron client to send auth in first message ⬜
  - Step 4: Add auth timeout (reject if no auth within 5s) ⬜
- **QA Status**: NOT STARTED
- **QA Report**: —

### Phase: P1 Wiring Gaps

#### Task #5: Wire Slack/Discord MCP buttons [PENDING]
- **Scope**: P1.7
- **Blocked By**: Task #1-4 (P0 complete)

#### Task #6: Wire DailyStats tasksCompleted [PENDING]
- **Scope**: P1.8
- **Blocked By**: Task #1-4

#### Task #7: Wire Claude CLI auth check [PENDING]
- **Scope**: P1.9
- **Blocked By**: Task #1-4

#### Task #8: Wire event listeners [PENDING]
- **Scope**: P1.10
- **Blocked By**: Task #1-4

#### Task #9: Wire Calendar-Planner overlay [PENDING]
- **Scope**: P1.11
- **Blocked By**: Task #1-4

### Phase: P2 Setup & Onboarding

#### Task #10: First-run onboarding wizard [PENDING]
- **Scope**: P2.12
- **Blocked By**: Task #5-9 (P1 complete)

#### Task #11: Webhook setup instructions [PENDING]
- **Scope**: P2.13
- **Blocked By**: Task #5-9

#### Task #12: OAuth validation before save [PENDING]
- **Scope**: P2.14
- **Blocked By**: Task #5-9

#### Task #13: Create .env.example [PENDING]
- **Scope**: P2.15
- **Blocked By**: Task #5-9

#### Task #14: Hub connection validation [PENDING]
- **Scope**: P2.16
- **Blocked By**: Task #5-9

---

## Dependency Graph

```
P0 Security (can parallelize Tasks 1-4):
#1 Encrypt Secrets ─┐
#2 Hub Bootstrap ───┼──▶ P1 Wiring ──▶ P2 Onboarding
#3 CORS Fix ────────┤
#4 WS Auth ─────────┘

P1 Wiring (can parallelize):
#5 Slack/Discord ───┐
#6 DailyStats ──────┤
#7 Claude CLI ──────┼──▶ P2 Onboarding
#8 Event Listeners ─┤
#9 Calendar-Planner ┘

P2 Onboarding (mostly sequential):
#10 Onboarding Wizard ──▶ #11 Webhook Instructions ──▶ #12 OAuth Validation
                                                              │
#13 .env.example ◀──────────────────────────────────────────┘
#14 Hub Validation ◀────────────────────────────────────────┘
```

---

## QA Results

(Will be populated as tasks complete)

---

## Blockers

| Blocker | Affected Task | Reported By | Status | Resolution |
|---------|---------------|-------------|--------|------------|
| None | | | | |

---

## Integration Checklist

- [ ] All P0 tasks COMPLETE with QA PASS
- [ ] All P1 tasks COMPLETE with QA PASS
- [ ] All P2 tasks COMPLETE with QA PASS
- [ ] `npm run lint` passes on feature branch
- [ ] `npx tsc --noEmit` passes on feature branch
- [ ] `npm run build` passes on feature branch
- [ ] Documentation updated after each merge
- [ ] Progress file status set to COMPLETE
- [ ] Audit doc items marked as DONE

---

## Recovery Notes

If this feature is resumed by a new session:

1. Read this file for current state
2. Run `git worktree list` to check active worktrees
3. Check which tasks are COMPLETE vs IN_PROGRESS
4. Resume from the first non-COMPLETE task
5. Update "Last Updated" and "Updated By" fields
