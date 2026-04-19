// ── Schema Barrel ──────────────────────────────────────────
// All table definitions live in per-feature schema files.
// This barrel re-exports everything so existing imports continue to work.

export * from '../features/settings/schema';
export * from '../features/dashboard/schema';
export * from '../features/notes/schema';
export * from '../features/alerts/schema';
export * from '../features/ideas/schema';
export * from '../features/planner/schema';
export * from '../features/fitness/schema';
export * from '../features/briefing/schema';
export * from '../features/notifications/schema';
export * from '../features/progress/schema';
export * from '../features/workflow/engine/workflow-agents-schema';
export * from '../features/workflow/engine/schema';
export * from '../features/auth/schema';
export * from '../features/email/schema';
export * from '../features/changelog/schema';
export * from '../features/progress/session-logs-schema';
export * from '../bus/schema';
export * from '../features/assistant/schema';
export * from '../features/test-suite/schema';
export * from '../features/workspace/workspaces-schema';
export * from '../features/runners/schema';
