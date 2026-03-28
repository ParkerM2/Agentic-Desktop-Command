# Future Roadmap

> Tracker Key: `future-roadmap` | Status: **TRACKING** | Created: 2026-02-16 | Updated: 2026-02-26

---

## Prioritized Roadmap

All items below are tracked individually in `docs/tracker.json`. Items marked with a slug link to their plan file in `docs/features/<slug>/plan.md`.

### P0 — Fix Now (Blocking Quality)

| Slug | Title | Type | Effort | Plan |
|------|-------|------|--------|------|
| `sidebar-architecture-refactor` | Sidebar/Navigation Architecture Refactor | Refactor | ~3 days | [plan](../sidebar-architecture-refactor/plan.md) |
| `docs-sync` | Documentation Sync Pass | Docs | ~2 days | [plan](../docs-sync/plan.md) |

**Why P0:** The sidebar has 2,491 lines of 95% duplicated code across 16 files. Any nav change touches all 16. The docs have 47 stale items that will cause agents to produce incorrect code.

### P1 — High Impact Features

| Slug | Title | Type | Effort | Plan |
|------|-------|------|--------|------|
| `command-palette` | Global Command Palette | Feature | ~2 days | [plan](../command-palette/plan.md) |
| `workspace-ui` | Workspaces Management UI | Feature | ~1 day | [plan](../workspace-ui/plan.md) |
| `devices-ui` | Devices Management Page | Feature | ~1 day | [plan](../devices-ui/plan.md) |
| `productivity-hub-restructure` | Productivity Hub Restructure | Refactor | ~2 days | [plan](../productivity-hub-restructure/plan.md) |

**Why P1:** Workspaces and devices backends are fully wired with zero UI. Command palette transforms navigation UX. Productivity hub is cramped with 5 features in tabs.

### P2 — Medium Impact

| Slug | Title | Type | Effort |
|------|-------|------|--------|
| `favorites-pinning` | Favorites & Pinning System | Feature | ~2 days |
| `task-bulk-ops` | Bulk Task Operations | Feature | ~2 days |
| `agent-dashboard-enhanced` | Enhanced Agent Dashboard | Feature | ~2 days |
| `insights-analytics` | Insights Analytics Upgrade | Feature | ~3 days |
| `health-dashboard` | Service Health Dashboard | Feature | ~1 day |

### P3 — Polish & Infrastructure

| Slug | Title | Type | Effort |
|------|-------|------|--------|
| `ci-cd-pipeline` | GitHub Actions CI/CD Pipeline | Infra | ~1 day |
| `e2e-test-expansion` | E2E Test Suite Expansion | Tests | ~3 days |
| `accessibility-audit` | WCAG Accessibility Audit | Quality | ~2 days |
| `offline-resilience` | Offline Mode / Graceful Degradation | Feature | ~3 days |
| `eslint-warnings-cleanup` | Clean ESLint Warnings | Cleanup | ~1 hr |

---

## Archived — Previously Tracked (Now Separate Entries)

The following items from the original hardening brainstorm are now tracked as individual entries:

- **Layout Uplevel** → Superseded by `sidebar-architecture-refactor` + `productivity-hub-restructure`
- **GitHub CI/CD Pipeline** → Tracked as `ci-cd-pipeline`
- **Tier 2-3 Tests** → Tracked as `e2e-test-expansion`
- **Database migration system** → Deferred (no immediate need)
- **Offline mode resilience** → Tracked as `offline-resilience`
- **Memory leak detection** → Deferred (not yet a reported issue)
- **Startup performance** → Deferred (not yet a reported issue)
- **Accessibility audit** → Tracked as `accessibility-audit`
