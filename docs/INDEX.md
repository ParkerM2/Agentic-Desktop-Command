<codebase-ref project="ADC" updated="2026-04-30" stack="electron39 react19 typescript zustand5 tanstack-router tanstack-query tanstack-table tailwindv4 xyflow12 drizzle-sqlite">

<src-map>
<main desc="Electron main process">
<bootstrap path="src/main/bootstrap" files="event-wiring.ts index.ts ipc-wiring.ts lifecycle.ts service-registry.ts" />
<features path="src/main/features" dirs="agent-dashboard alerts app assistant auth briefing bus changelog claude dashboard data-management docker email files fitness git github ideas insights integrations mcp merge notes notifications oauth peers planner progress projects qa runners security settings spotify terminals test-suite visualization workflow workspace" note="Feature Slice Design — each domain has schema.ts + service.ts + handlers.ts. agent-host runs in utilityProcess (not under features/)." />
<handlers suffix="-handlers.ts" note="Co-located inside src/main/features/<domain>/. test-suite splits handlers into src/main/features/test-suite/handlers/{analytics,auth,baseline,browser-view,config,data-run,export,run,schedule,screenshot,script,setup,shared-steps,watch}-handlers.ts" />
<tray path="src/main/tray" files="hotkey-manager.ts quick-input.ts tray-manager.ts" />
<lib path="src/main/lib" files="channel.ts hub-discovery-flag.ts lazy-service.ts logger.ts safe-write-json.ts shell-path.ts" />
<other path="src/main" dirs="agent-host auth bus db ipc mcp mcp-servers services" files="global.d.ts index.ts" />
</main>

<renderer desc="React renderer">
<features path="src/renderer/features" dirs="agent-dashboard agents alerts assistant briefing bus changelog dashboard diff-viewer files fitness git ideas insights integrations merge my-work notes onboarding peers personal planner planning productivity projects runners settings tasks terminals test-suite tools visualization workflow workflow-pipeline workspace" />
<ui-primitives path="src/renderer/shared/components/ui" files="alert-dialog badge breadcrumb button card checkbox collapsible container dialog dropdown-menu empty-state flex form grid icon inline-alert input label markdown-message metadata-list metric-card page-layout popover progress scroll-area search-input section-header select separator sidebar skeleton slider spinner stack status-badge status-indicator switch table tabs textarea thinking-indicator toast tooltip typography" suffix=".tsx" extra-dirs="composition data-display" />
<shared-components path="src/renderer/shared/components" files="AppUpdateNotification.tsx AuthNotification.tsx ConfirmDialog.tsx EventBridge.tsx IntegrationRequired.tsx MutationErrorToast.tsx RelativeTime.tsx WebhookNotification.tsx" extra-dirs="WorkspaceInitOverlay error-boundaries ui" note="EventBridge.tsx is central IPC event → React Query invalidation" />
<hooks path="src/renderer/shared/hooks" files="useAgentHostEvent useAuthPolling useClaudeAuth useClipboardCopy useDarkMode useDebounce useDialogWithMutation useFileLangMap useFilteredList useIpcEvent useIpcQuery useLayoutSync useLooseParams useModalFormState useModalWithEditState useMutationErrorToast useOAuthStatus useToday" />
<stores path="src/renderer/shared/stores" files="assistant-widget-store layout-store route-history-store theme-store toast-store" />
<lib path="src/renderer/shared/lib" files="ipc.ts utils.ts" />
<routes path="src/renderer/app/routes" files="assistant.routes.ts dashboard.routes.ts index.ts integrations.routes.ts misc.routes.ts personal.routes.ts productivity.routes.ts project.routes.ts settings.routes.ts" />
<layouts path="src/renderer/app/layouts" files="AppBreadcrumbs ChannelBadge ContentAreaContainer ContentHeader LayoutWrapper ProjectTabBar RootLayout TitleBar TitleBarScreenshot TopBar" extra-dirs="sidebar-layouts" />
</renderer>

<shared desc="IPC contracts and types">
<ipc-domains path="src/shared/ipc" dirs="agent-dashboard alerts app assistant briefing bus calendar changelog claude common dashboard data-management devices docker email files fitness git github hotkeys ideas insights integrations mcp merge notes notifications oauth peers planner progress projects qa runners screen security settings spotify terminals test-suite visualization voice webhook window workflow workflow-engine workflow-templates workspace workspaces" files="channel-builder.ts index.ts types.ts" pattern="{domain}/contract.ts + schemas.ts + channels.ts" />
<constants path="src/shared/constants" files="env.ts index.ts models.ts routes.ts themes.ts" />
<types path="src/shared/types" files="agent-dashboard agent-session-detail alert assistant assistant-watch briefing changelog channel claude data-dir data-management email fitness git github health idea index insights layout note notifications personal planner progress project project-setup screen security session-config settings task terminal test-suite tracker voice workspace" suffix=".ts" />
<other path="src/shared" files="ipc-contract.ts" extra-dirs="lib replication" />
</shared>

<preload files="index.ts" desc="contextBridge: window.api.invoke + window.api.on" />
</src-map>

<docs-map>
<architecture>
<doc path="architecture/ARCHITECTURE.md" tags="layers ipc service-registry" />
<doc path="architecture/DATA-FLOW.md" tags="request-response events streaming queries" />
<doc path="architecture/TEST-SUITE.md" tags="test-suite playwright recorder runner" />
<doc path="architecture/channels.md" tags="channels dev local prod isolation" />
<doc path="architecture/security-assessment.md" tags="security threat-model audit" />
</architecture>
<peers>
<doc path="peers/phase1-dev-harness.md" tags="peers p2p hub dev-harness" />
</peers>
<contracts>
<doc path="contracts/hub-device-protocol.md" tags="hub rest-api websocket auth" />
</contracts>
<patterns>
<doc path="patterns/CACHING-LAYER-QUICKGUIDE.md" tags="react-query eventbridge zustand caching invalidation" priority="always" />
<doc path="patterns/CODEBASE-GUARDIAN.md" tags="file-placement naming imports boundaries" priority="always" />
<doc path="patterns/DESIGN-SYSTEM.md" tags="css tokens tailwind themes" />
<doc path="patterns/LINTING.md" tags="eslint plugins violations fixes" />
<doc path="patterns/PATTERNS.md" tags="conventions feature-scaffold routes" />
</patterns>
<routing>
<doc path="routing/AI-AGENT-ROUTING-INDEX.md" tags="trace-domain types-to-route" />
<doc path="routing/FEATURES-INDEX.md" tags="find-feature find-service find-ipc" />
</routing>
<specs>
<doc path="specs/2026-04-02-workspace-and-assistant-redesign.md" tags="workspace assistant" />
<doc path="specs/2026-04-03-full-ux-ui-audit.md" tags="ux-audit ui-audit" />
<doc path="specs/2026-04-03-progress-tracking-design.md" tags="progress tracking" />
<doc path="specs/2026-04-04-adc-brand-design.md" tags="brand identity colors" />
<doc path="specs/2026-04-08-command-bus-design.md" tags="command-bus design" />
</specs>
<superpowers>
<doc path="superpowers/specs/2026-04-17-test-suite-gap-closure-design.md" tags="test-suite design gap-closure" />
<doc path="superpowers/specs/2026-04-17-test-suite-recording-workflow-design.md" tags="test-suite recording workflow" />
<doc path="superpowers/specs/2026-04-21-layout-preset-simplification-design.md" tags="layout preset simplification" />
<doc path="superpowers/specs/2026-04-23-hub-auto-discovery-design.md" tags="hub auto-discovery design" />
<doc path="superpowers/specs/2026-04-24-p2p-sync-design.md" tags="p2p sync design" />
<doc path="superpowers/plans/2026-04-15-full-gap-closure.md" tags="gap-closure sprint" />
<doc path="superpowers/plans/2026-04-15-test-suite-feature.md" tags="test-suite feature plan" />
<doc path="superpowers/plans/2026-04-15-sprint-a-fix-whats-broken.md" tags="sprint-a fixes" />
<doc path="superpowers/plans/2026-04-15-sprint-b-analytics-intelligence.md" tags="sprint-b analytics" />
<doc path="superpowers/plans/2026-04-15-sprint-c-developer-experience.md" tags="sprint-c dx" />
<doc path="superpowers/plans/2026-04-15-sprint-d-visual-testing.md" tags="sprint-d visual" />
<doc path="superpowers/plans/2026-04-15-sprint-e-power-features.md" tags="sprint-e power" />
<doc path="superpowers/plans/2026-04-16-project-runners.md" tags="runners projects" />
<doc path="superpowers/plans/2026-04-16-viewport-profiles.md" tags="viewport profiles" />
<doc path="superpowers/plans/2026-04-17-test-suite-gap-closure.md" tags="test-suite gap-closure" />
<doc path="superpowers/plans/2026-04-18-test-suite-compositional-audit.md" tags="test-suite audit" />
<doc path="superpowers/plans/2026-04-18-test-suite-phase2-scale.md" tags="test-suite phase2" />
<doc path="superpowers/plans/2026-04-18-test-suite-phase3-enterprise.md" tags="test-suite phase3" />
<doc path="superpowers/plans/2026-04-18-test-suite-phase4-differentiation.md" tags="test-suite phase4" />
<doc path="superpowers/plans/2026-04-18-test-suite-standards-cleanup.md" tags="test-suite cleanup" />
<doc path="superpowers/plans/2026-04-19-screenshot-and-assertion-pipeline.md" tags="screenshot assertion pipeline" />
<doc path="superpowers/plans/2026-04-19-test-suite-phase1-structural-renames.md" tags="test-suite renames" />
<doc path="superpowers/plans/2026-04-19-test-suite-phase2-type-unification.md" tags="test-suite types" />
<doc path="superpowers/plans/2026-04-19-test-suite-phase3-query-key-cleanup.md" tags="test-suite query-keys" />
<doc path="superpowers/plans/2026-04-19-test-suite-phase4-handler-thinning-ui-compliance.md" tags="test-suite handlers ui" />
<doc path="superpowers/plans/2026-04-21-agent-project-display-cleanup.md" tags="agent display cleanup" />
<doc path="superpowers/plans/2026-04-21-layout-preset-simplification.md" tags="layout preset" />
<doc path="superpowers/plans/2026-04-21-raw-html-followup-cleanup.md" tags="raw-html cleanup" />
<doc path="superpowers/plans/2026-04-21-raw-html-to-ui-primitives.md" tags="raw-html ui-primitives" />
<doc path="superpowers/plans/2026-04-22-three-channel-isolation.md" tags="channels isolation" />
<doc path="superpowers/plans/2026-04-23-hub-auto-discovery.md" tags="hub discovery" />
<doc path="superpowers/plans/2026-04-24-p2p-sync-phase1.md" tags="p2p sync phase1" />
<doc path="superpowers/plans/2026-04-24-p2p-sync-phase2.md" tags="p2p sync phase2" />
<doc path="superpowers/plans/2026-04-24-p2p-sync-phase3.md" tags="p2p sync phase3" />
<doc path="superpowers/plans/2026-04-24-p2p-sync-phase3b.md" tags="p2p sync phase3b" />
<doc path="superpowers/plans/2026-04-24-p2p-sync-phase4.md" tags="p2p sync phase4" />
<doc path="superpowers/plans/2026-04-25-p2p-sync-phase5.md" tags="p2p sync phase5" />
<doc path="superpowers/plans/2026-04-26-peers-audit-fixes.md" tags="peers audit fixes" />
</superpowers>
<research>
<doc path="research/2026-02-14-ag-grid-evaluation.md" tags="ag-grid tables" />
<doc path="research/2026-03-30-agent-dashboard-gap-analysis.md" tags="agent-dashboard gaps" />
<doc path="research/2026-03-30-headless-agent-architecture.md" tags="headless agents" />
<doc path="research/2026-04-01-claude-code-source-leak-analysis.md" tags="claude-code patterns" />
<doc path="research/2026-04-16-test-suite-competitor-scan.md" tags="test-suite competitor research" />
<doc path="research/agent-system-comparison.md" tags="agent-systems orchestration" />
</research>
<workflows>
<doc path="workflows/AGENT-WORKFLOW.md" tags="agent-pipeline stages" />
<doc path="workflows/DOC-UPDATE-MAP.md" tags="doc-updates" />
<doc path="workflows/PLAN-TRACKING.md" tags="plan-status" />
<doc path="workflows/TASK-PLANNING-PIPELINE.md" tags="task-lifecycle" />
<doc path="workflows/WORKTREE-BOOTSTRAP.md" tags="git worktree" />
</workflows>
<prompts>
<doc path="prompts/implementing-features/AGENT-SPAWN-TEMPLATES.md" tags="agent-spawn" />
<doc path="prompts/implementing-features/QA-CHECKLIST-TEMPLATE.md" tags="qa checklist" />
<doc path="prompts/implementing-features/README.md" tags="team-lead playbook" />
</prompts>
<cleanup>
<doc path="cleanup/codebase-cleanup-plan.md" tags="cleanup plan" />
<doc path="cleanup/item-1-component-structure-audit.md" tags="components audit" />
<doc path="cleanup/item-2-chat-ux-research.md" tags="chat ux research" />
<doc path="cleanup/item-3-icon-button-research.md" tags="icon button research" />
<doc path="cleanup/item-4-spacing-research.md" tags="spacing research" />
</cleanup>
<decisions>
<doc path="decisions/2026-04-14-category-5-scope-decisions.md" tags="scope decisions" />
</decisions>
<qa>
<doc path="qa/2026-04-16-test-suite-runners/findings.md" tags="qa test-suite runners findings" note="directory also contains numbered PNG screenshots" />
</qa>
<testing>
<doc path="testing/E2E-TEST-SUITE.md" tags="e2e playwright" />
</testing>
<ui>
<doc path="ui/user-interface-flow.md" tags="navigation routes screens" />
</ui>
<diagrams>
<doc path="diagrams/architecture.d2" tags="architecture diagram d2" />
</diagrams>
<root>
<doc path="QA-Feature-Research.md" tags="qa feature research" />
<doc path="tracker.json" tags="plan-lifecycle status" />
<doc path="test-suite-enterprise-release.html" tags="test-suite release html" />
</root>
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
<service>src/main/features/visualization/visualization-service.ts</service>
<handler>src/main/features/visualization/visualization-handlers.ts</handler>
<feature>src/renderer/features/visualization/</feature>
<route>/projects/$projectId/visualization</route>
</example>
</domain-trace>

</codebase-ref>
