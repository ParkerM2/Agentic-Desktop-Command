<docs-index project="ADC" total-files="47">

<architecture desc="system design">
<doc path="architecture/ARCHITECTURE.md" tags="layers ipc service-registry" />
<doc path="architecture/DATA-FLOW.md" tags="request-response events streaming queries" />
<doc path="architecture/V2-REFACTOR.md" tags="v2 migration xterm-removed stream-json" />
</architecture>

<contracts desc="external protocols">
<doc path="contracts/hub-device-protocol.md" tags="hub rest-api websocket auth" />
</contracts>

<features desc="feature plans" pattern="{name}/plan.md">
<doc path="features/agent-dashboard-view/plan.md" tags="agent-chat headless-ui" />
<doc path="features/command-palette/plan.md" tags="command-palette quick-actions" />
<doc path="features/devices-ui/plan.md" tags="devices registration" />
<doc path="features/docs-sync/plan.md" tags="docs synchronization" />
<doc path="features/future-roadmap/plan.md" tags="roadmap milestones" />
<doc path="features/productivity-hub-restructure/plan.md" tags="productivity tabs" />
<doc path="features/sidebar-architecture-refactor/plan.md" tags="sidebar layouts" />
<doc path="features/user-scoped-storage/plan.md" tags="per-user data-isolation" />
<doc path="features/visualization/plan.md" tags="visual-map react-flow dagre graph" />
<doc path="features/workspace-ui/plan.md" tags="workspace agents" />
</features>

<patterns desc="code rules and conventions">
<doc path="patterns/CODEBASE-GUARDIAN.md" tags="file-placement naming imports boundaries" priority="always" />
<doc path="patterns/DESIGN-SYSTEM.md" tags="css tokens tailwind themes styling" />
<doc path="patterns/LINTING.md" tags="eslint plugins violations fixes" />
<doc path="patterns/PATTERNS.md" tags="conventions feature-scaffold routes lazy-loading" />
</patterns>

<routing desc="code lookup tables">
<doc path="routing/FEATURES-INDEX.md" tags="find-feature find-service find-ipc" note="30 features 33 services 28 IPC domains" />
<doc path="routing/AI-AGENT-ROUTING-INDEX.md" tags="trace-domain types-to-route end-to-end" />
</routing>

<specs desc="design specifications">
<doc path="specs/2026-04-02-workspace-and-assistant-redesign.md" tags="workspace assistant ux-design" />
<doc path="specs/2026-04-03-full-ux-ui-audit.md" tags="ux-audit ui-audit comprehensive" />
<doc path="specs/2026-04-03-progress-tracking-design.md" tags="progress tracking visualization" />
<doc path="specs/2026-04-04-adc-brand-design.md" tags="brand identity colors typography" />
</specs>

<plans desc="implementation roadmaps">
<doc path="plans/2026-04-03-p0-critical-fixes.md" tags="p0 critical bugs urgent" />
<doc path="plans/2026-04-03-plan-2-core-ux-hardening.md" tags="p2 ux hardening" />
<doc path="plans/2026-04-03-plan-3-ai-connectivity-engine.md" tags="p3 ai connectivity sessions" />
<doc path="plans/2026-04-03-plan-4-assistant-copilot.md" tags="p4 assistant copilot" />
<doc path="plans/2026-04-03-plan-5-polish-and-enhancement.md" tags="p5 polish enhancement" />
<doc path="plans/2026-04-04-adc-brand-suite.md" tags="brand suite topbar" />
</plans>

<research desc="technical analysis">
<doc path="research/2026-02-14-ag-grid-evaluation.md" tags="ag-grid data-tables evaluation" />
<doc path="research/2026-03-30-agent-dashboard-gap-analysis.md" tags="agent-dashboard gaps" />
<doc path="research/2026-03-30-headless-agent-architecture.md" tags="headless agents architecture" />
<doc path="research/2026-04-01-claude-code-source-leak-analysis.md" tags="claude-code patterns npm" />
<doc path="research/agent-system-comparison.md" tags="agent-systems kanban orchestration" />
</research>

<workflows desc="processes and templates">
<doc path="workflows/AGENT-WORKFLOW.md" tags="agent-pipeline stages intake-to-integration" />
<doc path="workflows/TASK-PLANNING-PIPELINE.md" tags="task-lifecycle local-first" />
<doc path="workflows/WORKTREE-BOOTSTRAP.md" tags="git worktree setup isolation" />
<doc path="workflows/PLAN-TRACKING.md" tags="plan-status lifecycle" />
<doc path="workflows/DOC-UPDATE-MAP.md" tags="doc-updates which-docs-to-change" />
</workflows>

<prompts desc="agent playbooks">
<doc path="prompts/implementing-features/README.md" tags="team-lead playbook orchestration" />
<doc path="prompts/implementing-features/AGENT-SPAWN-TEMPLATES.md" tags="agent-spawn coder architect tester" />
<doc path="prompts/implementing-features/PROGRESS-FILE-TEMPLATE.md" tags="progress jsonl crash-safe" />
<doc path="prompts/implementing-features/QA-CHECKLIST-TEMPLATE.md" tags="qa verification checklist" />
</prompts>

<ui desc="interface documentation">
<doc path="ui/user-interface-flow.md" tags="navigation routes screens" />
</ui>

<meta>
<doc path="tracker.json" tags="plan-lifecycle status source-of-truth" />
</meta>

</docs-index>
