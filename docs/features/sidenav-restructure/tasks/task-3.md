---
taskNumber: 3
taskName: "GitPage Feature Module"
taskSlug: "git-page"
agentRole: "component-engineer"
wave: 2
blockedBy: [1]
blocks: []
estimatedTokens: 17000
complexity: "MEDIUM"
status: "pending"
---

# Task #3: GitPage Feature Module

## Description
Create a `git-overview` feature module. GitPage has a single main view (GitHubPage) with a ChangelogSummary component embedded in the PageHeader. The ChangelogSummary shows the most recent entry inline, with buttons to expand (full popup via Dialog), copy full changelog to clipboard, and add a new entry.

## Acceptance Criteria
- [ ] `src/renderer/features/git-overview/` directory created with standard feature structure
- [ ] GitPage renders with PageHeader, title "Git", description "Source control and changelog"
- [ ] ChangelogSummary component in PageHeader.Actions area shows latest changelog entry
- [ ] Latest entry truncated to ~100 chars with ellipsis
- [ ] Expand button opens Dialog with full ChangelogPage rendered inside
- [ ] Copy button copies full changelog text to clipboard (navigator.clipboard.writeText)
- [ ] Main content area renders GitHubPage unchanged
- [ ] Uses `@ui` primitives only (PageLayout, PageHeader, PageContent, Dialog, Button, Text)
- [ ] Barrel export: `export { GitPage } from './components/GitPage'`
- [ ] `npm run typecheck` and `npm run lint` pass

## Files to Create
- `src/renderer/features/git-overview/index.ts` — Barrel export
- `src/renderer/features/git-overview/components/GitPage.tsx` — PageHeader + GitHubPage body
- `src/renderer/features/git-overview/components/ChangelogSummary.tsx` — Compact changelog in header

## Files to Read for Context
- `src/renderer/features/changelog/index.ts` — What's exported (ChangelogPage, hooks)
- `src/renderer/features/changelog/api/useChangelog.ts` — Query hook for changelog data (or check barrel)
- `src/renderer/features/github/index.ts` — GitHubPage export
- `src/renderer/features/tools/components/ToolsPage.tsx` — PageHeader pattern reference
- `src/renderer/shared/components/ui/dialog.tsx` — Dialog primitive for expand popup

## Implementation Notes
- Check `@features/changelog` barrel to see what query hooks are exported. If none, import directly from the api/ directory.
- ChangelogSummary should use TanStack Query to fetch changelog entries (reuse existing hook)
- For the expand dialog, render `<ChangelogPage />` inside `<DialogContent>` with appropriate sizing
- Copy button: `await navigator.clipboard.writeText(entries.map(e => e.text).join('\n'))`
- If no changelog entries exist, show a subtle "No entries yet" text with just the Update button
- The GitHubPage is the main content — it should fill the available space below the header
