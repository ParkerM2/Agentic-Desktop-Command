# Task #20: Dead Directory Cleanup
Workbranch: work/codebase-upgrade-test-suite/dead-directory-cleanup
Team: codebase-upgrade-test-suite. Leader: team-lead.

Delete all emptied old domain directories from main/features, shared/ipc, and renderer/features.
Verify no remaining imports reference old paths. Update any remaining barrel exports.

Main directories to check and delete if orphaned:
- notes/, ideas/, milestones/, alerts/, captures/, changelog/, planner/, briefing/, fitness/
- email/, notifications/, spotify/, github/, calendar/
- health/, docker/, window/, hotkeys/, voice/, screen/, security/, device/
- workflow-engine/, workflow-templates/
- data-management/, webhook-settings/
- communications/ (renderer)

Also check shared/ipc/ for orphaned domain directories.
Also check renderer/features/ for orphaned directories (devices/, screen/, voice/, health/).

IMPORTANT: Before deleting, grep for imports referencing old paths. If imports still exist, update them first.
Run npm run typecheck as the authority — if it passes, all imports are resolved.
Run npm run lint + npm run typecheck + npm run build before reporting.

Read .claude/progress/codebase-upgrade-test-suite/tasks/task-20.md for full details.
Commit on the workbranch. Report to team-lead via SendMessage.
