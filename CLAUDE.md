# Task #10: Integrations Domain — Main Process
Workbranch: work/codebase-upgrade-test-suite/integrations-domain-main-process
Team: codebase-upgrade-test-suite. Leader: team-lead.

Physically consolidate 5 integration domains into src/main/features/integrations/.
Move from email(9), notifications(9), spotify(2), github(2), calendar(2) into sub-modules.
Email and notifications are large — keep as sub-directories. Smaller ones as single files.
Create unified createIntegrationsService().

Read the full task file at .claude/progress/codebase-upgrade-test-suite/tasks/task-10.md for complete details.
Run npm run lint + npm run typecheck + npm run build before reporting.
Commit on the workbranch. Report to team-lead via SendMessage.
