<codebase-ref project="ADC" stack="electron39 react19 typescript zustand5 tanstack-router tanstack-query tanstack-table tailwindv4 xyflow12">

<src-map>
<main desc="Electron main process">
<bootstrap files="index.ts service-registry.ts lifecycle.ts ipc-wiring.ts event-wiring.ts" />
<services dirs="agent-manager alerts app assistant auth briefing calendar changelog claude dashboard data-management device docker email file-tree fitness git github health hub ideas insights merge milestones notes notifications planner progress project qa screen session-jsonl settings spotify team-watcher terminal time-parser tracker visualization voice workflow workspace" note="agent-host/ runs in utilityProcess; old tasks/ dir deleted; progress is sole task authority" />
<ipc-handlers files="agent-dashboard alert app app-update assistant auth briefing calendar changelog claude dashboard data-management device docker email error files fitness git github hotkey hub ideas insights mcp merge milestones notes notification oauth planner progress project qa screen security settings spotify task terminal time tracker visualization voice webhook-settings window workflow workspace" suffix="-handlers.ts" />
<tray files="hotkey-manager.ts quick-input.ts tray-manager.ts" />
<lib files="logger.ts safe-write-json.ts" />
</main>

<renderer desc="React renderer">
<features dirs="agent-dashboard agents alerts assistant auth briefing changelog communications dashboard devices diff-viewer file-explorer fitness github health hub-setup ideation insights merge my-work notes onboarding planner productivity projects roadmap screen settings tasks terminals visualization voice workflow workflow-pipeline workspace workspaces" />
<ui-primitives path="shared/components/ui" files="alert-dialog badge breadcrumb button card checkbox collapsible container dialog dropdown-menu empty-state flex form grid input label page-layout popover progress scroll-area select separator sidebar skeleton slider spinner stack switch tabs textarea toast tooltip typography" suffix=".tsx" />
<hooks path="shared/hooks" files="useClaudeAuth useHubEvents useIpcEvent useIpcQuery useLayoutSync useLooseParams useMutationErrorToast useOAuthStatus useThemeSync" />
<stores path="shared/stores" files="assistant-widget-store layout-store route-history-store theme-store toast-store" />
<components path="shared/components" files="EventBridge.tsx" note="Central IPC event → React Query invalidation" />
<lib path="shared/lib" files="ipc.ts utils.ts" />
<routes path="app/routes" files="auth.routes.tsx communication.routes.ts dashboard.routes.ts misc.routes.ts productivity.routes.ts project.routes.ts settings.routes.ts" />
<layouts path="app/layouts" files="AppBreadcrumbs ContentHeader LayoutWrapper ProjectTabBar RootLayout Sidebar TitleBar TopBar UserMenu" />
</renderer>

<shared desc="IPC contracts and types">
<ipc-domains dirs="agent-dashboard agents app assistant auth briefing claude common dashboard data-management docker email files fitness git github health hub misc notifications oauth planner projects qa security settings spotify tasks terminals tracker visualization window workflow workspace" pattern="{domain}/contract.ts + schemas.ts" />
<constants files="index.ts models.ts routes.ts task-files.ts themes.ts" />
<types files="agent-dashboard alert assistant assistant-watch auth briefing changelog claude data-management email fitness git github health hub-connection hub-events hub-protocol idea index insights layout milestone note notifications planner project project-setup screen security settings task terminal tracker voice workspace" suffix=".ts" />
</shared>

<preload files="index.ts" desc="contextBridge: window.api.invoke + window.api.on" />
</src-map>

<docs-map>
<architecture>
<doc path="architecture/ARCHITECTURE.md" tags="layers ipc service-registry" />
<doc path="architecture/DATA-FLOW.md" tags="request-response events streaming queries" />
<doc path="architecture/V2-REFACTOR.md" tags="v2 xterm-removed stream-json" />
</architecture>
<contracts>
<doc path="contracts/hub-device-protocol.md" tags="hub rest-api websocket auth" />
</contracts>
<features pattern="{name}/plan.md">
<doc path="features/agent-dashboard-view/plan.md" tags="agent-chat headless-ui" />
<doc path="features/command-palette/plan.md" tags="command-palette" />
<doc path="features/devices-ui/plan.md" tags="devices registration" />
<doc path="features/docs-sync/plan.md" tags="docs sync" />
<doc path="features/future-roadmap/plan.md" tags="roadmap milestones" />
<doc path="features/productivity-hub-restructure/plan.md" tags="productivity tabs" />
<doc path="features/sidebar-architecture-refactor/plan.md" tags="sidebar layouts" />
<doc path="features/user-scoped-storage/plan.md" tags="per-user data-isolation" />
<doc path="features/visualization/plan.md" tags="visual-map react-flow dagre" />
<doc path="features/workspace-ui/plan.md" tags="workspace agents" />
</features>
<patterns>
<doc path="patterns/CACHING-LAYER-QUICKGUIDE.md" tags="react-query eventbridge zustand caching invalidation" priority="always" />
<doc path="patterns/CODEBASE-GUARDIAN.md" tags="file-placement naming imports boundaries" priority="always" />
<doc path="patterns/DESIGN-SYSTEM.md" tags="css tokens tailwind themes" />
<doc path="patterns/LINTING.md" tags="eslint plugins violations fixes" />
<doc path="patterns/PATTERNS.md" tags="conventions feature-scaffold routes" />
</patterns>
<routing>
<doc path="routing/FEATURES-INDEX.md" tags="find-feature find-service find-ipc" />
<doc path="routing/AI-AGENT-ROUTING-INDEX.md" tags="trace-domain types-to-route" />
</routing>
<specs>
<doc path="specs/2026-04-02-workspace-and-assistant-redesign.md" tags="workspace assistant" />
<doc path="specs/2026-04-03-full-ux-ui-audit.md" tags="ux-audit ui-audit" />
<doc path="specs/2026-04-03-progress-tracking-design.md" tags="progress tracking" />
<doc path="specs/2026-04-04-adc-brand-design.md" tags="brand identity colors" />
</specs>
<plans>
<doc path="plans/2026-04-03-p0-critical-fixes.md" tags="p0 critical" />
<doc path="plans/2026-04-03-plan-2-core-ux-hardening.md" tags="p2 ux" />
<doc path="plans/2026-04-03-plan-3-ai-connectivity-engine.md" tags="p3 ai" />
<doc path="plans/2026-04-03-plan-4-assistant-copilot.md" tags="p4 assistant" />
<doc path="plans/2026-04-03-plan-5-polish-and-enhancement.md" tags="p5 polish" />
<doc path="plans/2026-04-04-adc-brand-suite.md" tags="brand topbar" />
</plans>
<research>
<doc path="research/2026-02-14-ag-grid-evaluation.md" tags="ag-grid tables" />
<doc path="research/2026-03-30-agent-dashboard-gap-analysis.md" tags="agent-dashboard gaps" />
<doc path="research/2026-03-30-headless-agent-architecture.md" tags="headless agents" />
<doc path="research/2026-04-01-claude-code-source-leak-analysis.md" tags="claude-code patterns" />
<doc path="research/agent-system-comparison.md" tags="agent-systems orchestration" />
</research>
<workflows>
<doc path="workflows/AGENT-WORKFLOW.md" tags="agent-pipeline stages" />
<doc path="workflows/TASK-PLANNING-PIPELINE.md" tags="task-lifecycle" />
<doc path="workflows/WORKTREE-BOOTSTRAP.md" tags="git worktree" />
<doc path="workflows/PLAN-TRACKING.md" tags="plan-status" />
<doc path="workflows/DOC-UPDATE-MAP.md" tags="doc-updates" />
</workflows>
<prompts>
<doc path="prompts/implementing-features/README.md" tags="team-lead playbook" />
<doc path="prompts/implementing-features/AGENT-SPAWN-TEMPLATES.md" tags="agent-spawn" />
<doc path="prompts/implementing-features/PROGRESS-FILE-TEMPLATE.md" tags="progress jsonl" />
<doc path="prompts/implementing-features/QA-CHECKLIST-TEMPLATE.md" tags="qa checklist" />
</prompts>
<ui>
<doc path="ui/user-interface-flow.md" tags="navigation routes screens" />
</ui>
<meta>
<doc path="tracker.json" tags="plan-lifecycle status" />
</meta>
</docs-map>

<path-aliases>
<alias name="@ui" target="src/renderer/shared/components/ui" />
<alias name="@features" target="src/renderer/features" />
<alias name="@shared" target="src/shared" />
<alias name="@main" target="src/main" />
<alias name="@renderer" target="src/renderer" />
</path-aliases>

<domain-trace pattern="domain → types → ipc-contract → service → handler → feature → route">
<example domain="visualization">
<types>src/shared/types/agent-dashboard.ts</types>
<contract>src/shared/ipc/visualization/contract.ts</contract>
<schemas>src/shared/ipc/visualization/schemas.ts</schemas>
<service>src/main/services/visualization/index.ts</service>
<handler>src/main/ipc/handlers/visualization-handlers.ts</handler>
<feature>src/renderer/features/visualization/</feature>
<route>/projects/$projectId/visualization</route>
</example>
</domain-trace>

</codebase-ref>
