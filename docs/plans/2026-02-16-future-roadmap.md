# Future Roadmap — Deferred Items from Hardening Brainstorm

> Tracker Key: `future-roadmap` | Status: **TRACKING** | Created: 2026-02-16

---

## From Hardening Brainstorm

### Layout Uplevel — Personal & Workspaces with Breadcrumbs (Major Feature)

Top-level navigation restructure that introduces **Personal** and **Workspaces** as distinct areas with breadcrumb navigation:

- **Workspaces:** Projects, tasks, agents, terminals, GitHub, workflow — the existing work features grouped under workspace context with breadcrumb trails (Workspace > Project > Tasks)
- **Personal:** Calendar, fitness, todos, journal, weekly planner — personal features with their own dashboard and breadcrumb trails (Personal > Planner > Weekly Review)
- **Breadcrumb system:** Persistent breadcrumb bar below the title bar showing the user's current location in the hierarchy, with clickable segments for navigation
- **Personal dashboard:** Customizable widget grid (week/day schedule planner view):
  - Fitness tracker widget
  - Calendar widget (small + full planner view)
  - Google Calendar integration with multi-email account support (personal + work calendars)
  - Add, edit, RSVP for events populated via Google Calendar and other services
  - Error notification header for personal feature errors
- **No code separation** — this is a UX/UI distinction between feature categories, not a codebase restructure. Features remain in `features/` as-is, the layout/routing layer groups them.
- **Personal error handling:** Left sidebar (for now), tied into the unified toast + assistant system
- **Update VISION.md** to reflect this layout structure

### GitHub CI/CD Pipeline

GitHub Actions workflow design:
- Run on push and PR
- Jobs: lint, typecheck, test (unit + integration), build, E2E
- Electron + Playwright E2E in CI (headless)
- Coverage reporting with minimum thresholds
- Caching for node_modules and Electron binaries
- PR status checks (required passing before merge)

### Tier 2 Tests

- IPC handler response shape tests for all 38 handler files
- Hub API client request/response tests
- Agent orchestrator session lifecycle tests
- Service health registry edge cases

### Tier 3 Tests

- Component rendering tests (React Testing Library)
- Full E2E feature flows:
  - Create project → add tasks → run agent → view results
  - Settings persistence across restart
  - Error boundary recovery flows
- Coverage reporting integration

### Additional Hardening (Lower Priority)

- **Database migration system** — if JSON stores evolve, need versioned migrations
- **Offline mode resilience** — graceful degradation when Hub is unreachable
- **Memory leak detection** — long-running app monitoring
- **Startup performance** — profiling and optimization for cold start
- **Accessibility audit** — full a11y pass beyond what jsx-a11y catches
