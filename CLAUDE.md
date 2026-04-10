# Task #12: Integrations Domain — Renderer
Workbranch: work/codebase-upgrade-test-suite/integrations-domain-renderer
Team: codebase-upgrade-test-suite. Leader: team-lead.

Physically consolidate integration renderer features into src/renderer/features/integrations/.
Build IntegrationsPage with tabbed layout. Move from communications (already has tabs), github, calendar.
The existing Communications page has 4 tabs — extend to include GitHub and Calendar.
Delete old directories after moving.

Read .claude/progress/codebase-upgrade-test-suite/tasks/task-12.md for full details.
Use @ui primitives only. PageHeader compound component.
Run npm run lint + npm run typecheck + npm run build before reporting.
Commit on the workbranch. Report to team-lead via SendMessage.
