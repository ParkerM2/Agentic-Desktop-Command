# ADC Documentation Index

> Master reference for all project documentation. Start here to find anything.

---

## Quick Navigation

| I need to... | Read this |
|-------------|-----------|
| Understand the system | [ARCHITECTURE.md](architecture/ARCHITECTURE.md) |
| Trace data through the app | [DATA-FLOW.md](architecture/DATA-FLOW.md) |
| Find a feature/service/IPC channel | [FEATURES-INDEX.md](routing/FEATURES-INDEX.md) |
| Find every file for a domain | [AI-AGENT-ROUTING-INDEX.md](routing/AI-AGENT-ROUTING-INDEX.md) |
| Know where to put a new file | [CODEBASE-GUARDIAN.md](patterns/CODEBASE-GUARDIAN.md) |
| Follow code conventions | [PATTERNS.md](patterns/PATTERNS.md) |
| Fix a lint error | [LINTING.md](patterns/LINTING.md) |
| Use design system tokens | [DESIGN-SYSTEM.md](patterns/DESIGN-SYSTEM.md) |
| Run an agent team | [Implementing Features](prompts/implementing-features/README.md) |
| Check plan status | [tracker.json](tracker.json) |
| Update docs after a code change | [DOC-UPDATE-MAP.md](workflows/DOC-UPDATE-MAP.md) |

---

## Directory Map

### `architecture/` — System design
| File | Contents |
|------|----------|
| [ARCHITECTURE.md](architecture/ARCHITECTURE.md) | Layer diagram, IPC flow, service registry |
| [DATA-FLOW.md](architecture/DATA-FLOW.md) | Request/response, events, streaming, queries |
| [V2-REFACTOR.md](architecture/V2-REFACTOR.md) | Completed 9-phase refactor (xterm.js removed) |

### `contracts/` — External protocols
| File | Contents |
|------|----------|
| [hub-device-protocol.md](contracts/hub-device-protocol.md) | Hub REST API + WebSocket spec, auth flows |

### `features/` — Feature plans
| Feature | File |
|---------|------|
| [agent-dashboard-view](features/agent-dashboard-view/plan.md) | Headless agent chat UI |
| [command-palette](features/command-palette/plan.md) | Quick command palette |
| [devices-ui](features/devices-ui/plan.md) | Device management UI |
| [docs-sync](features/docs-sync/plan.md) | Documentation sync |
| [future-roadmap](features/future-roadmap/plan.md) | Roadmap tracking |
| [productivity-hub-restructure](features/productivity-hub-restructure/plan.md) | Productivity tabs |
| [sidebar-architecture-refactor](features/sidebar-architecture-refactor/plan.md) | Sidebar layouts |
| [user-scoped-storage](features/user-scoped-storage/plan.md) | Per-user data isolation |
| [visualization](features/visualization/plan.md) | Visual Map (React Flow graph) |
| [workspace-ui](features/workspace-ui/plan.md) | Workspace UI |

### `patterns/` — Code rules & conventions
| File | When to read |
|------|-------------|
| [CODEBASE-GUARDIAN.md](patterns/CODEBASE-GUARDIAN.md) | Adding/moving files, imports, naming |
| [DESIGN-SYSTEM.md](patterns/DESIGN-SYSTEM.md) | Styling, theme tokens, CSS architecture |
| [LINTING.md](patterns/LINTING.md) | ESLint errors, plugin conflicts |
| [PATTERNS.md](patterns/PATTERNS.md) | New features, route setup, folder structure |

### `routing/` — Code lookup tables
| File | When to read |
|------|-------------|
| [FEATURES-INDEX.md](routing/FEATURES-INDEX.md) | Find any feature, service, or IPC channel |
| [AI-AGENT-ROUTING-INDEX.md](routing/AI-AGENT-ROUTING-INDEX.md) | Trace a domain end-to-end (types → route) |

### `specs/` — Design specifications
| File | Topic |
|------|-------|
| [2026-04-02-workspace-and-assistant-redesign.md](specs/2026-04-02-workspace-and-assistant-redesign.md) | Workspace + assistant UX |
| [2026-04-03-full-ux-ui-audit.md](specs/2026-04-03-full-ux-ui-audit.md) | Full UX/UI audit |
| [2026-04-03-progress-tracking-design.md](specs/2026-04-03-progress-tracking-design.md) | Progress tracking design |
| [2026-04-04-adc-brand-design.md](specs/2026-04-04-adc-brand-design.md) | Brand identity & design |

### `plans/` — Implementation roadmaps
| File | Phase |
|------|-------|
| [2026-04-03-p0-critical-fixes.md](plans/2026-04-03-p0-critical-fixes.md) | P0: Critical fixes |
| [2026-04-03-plan-2-core-ux-hardening.md](plans/2026-04-03-plan-2-core-ux-hardening.md) | P2: Core UX hardening |
| [2026-04-03-plan-3-ai-connectivity-engine.md](plans/2026-04-03-plan-3-ai-connectivity-engine.md) | P3: AI connectivity |
| [2026-04-03-plan-4-assistant-copilot.md](plans/2026-04-03-plan-4-assistant-copilot.md) | P4: Assistant copilot |
| [2026-04-03-plan-5-polish-and-enhancement.md](plans/2026-04-03-plan-5-polish-and-enhancement.md) | P5: Polish |
| [2026-04-04-adc-brand-suite.md](plans/2026-04-04-adc-brand-suite.md) | Brand suite |

### `research/` — Technical analysis
| File | Topic |
|------|-------|
| [2026-02-14-ag-grid-evaluation.md](research/2026-02-14-ag-grid-evaluation.md) | AG-Grid evaluation |
| [2026-03-30-agent-dashboard-gap-analysis.md](research/2026-03-30-agent-dashboard-gap-analysis.md) | Agent dashboard gaps |
| [2026-03-30-headless-agent-architecture.md](research/2026-03-30-headless-agent-architecture.md) | Headless agent arch |
| [2026-04-01-claude-code-source-leak-analysis.md](research/2026-04-01-claude-code-source-leak-analysis.md) | Claude Code patterns |
| [agent-system-comparison.md](research/agent-system-comparison.md) | Agent system comparison |

### `workflows/` — Processes & templates
| File | When to read |
|------|-------------|
| [AGENT-WORKFLOW.md](workflows/AGENT-WORKFLOW.md) | Agent pipeline stages |
| [TASK-PLANNING-PIPELINE.md](workflows/TASK-PLANNING-PIPELINE.md) | Task lifecycle |
| [WORKTREE-BOOTSTRAP.md](workflows/WORKTREE-BOOTSTRAP.md) | Git worktree setup |
| [PLAN-TRACKING.md](workflows/PLAN-TRACKING.md) | Plan status management |
| [DOC-UPDATE-MAP.md](workflows/DOC-UPDATE-MAP.md) | Which docs to update per change |

### `prompts/implementing-features/` — Agent playbooks
| File | When to read |
|------|-------------|
| [README.md](prompts/implementing-features/README.md) | Team Lead playbook |
| [AGENT-SPAWN-TEMPLATES.md](prompts/implementing-features/AGENT-SPAWN-TEMPLATES.md) | Agent spawn templates |
| [PROGRESS-FILE-TEMPLATE.md](prompts/implementing-features/PROGRESS-FILE-TEMPLATE.md) | Progress JSONL format |
| [QA-CHECKLIST-TEMPLATE.md](prompts/implementing-features/QA-CHECKLIST-TEMPLATE.md) | QA checklist |

### `ui/` — Interface documentation
| File | Contents |
|------|----------|
| [user-interface-flow.md](ui/user-interface-flow.md) | Complete UI navigation flow |

### Other files
| File | Contents |
|------|----------|
| [tracker.json](tracker.json) | Plan lifecycle status (source of truth) |
