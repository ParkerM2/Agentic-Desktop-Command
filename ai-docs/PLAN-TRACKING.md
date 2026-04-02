# Plan Tracking Protocol — MANDATORY

**Every plan, feature, or design doc MUST be tracked.** No exceptions — ad-hoc plans, on-the-fly features, and formal design docs all follow the same convention.

## The Naming Convention

One **slug** (lowercase, hyphen-separated) used everywhere:

| Artifact | Location |
|----------|----------|
| Tracker entry key | `docs/tracker.json` → `plans.<slug>` |
| Plan/design doc | `docs/features/<slug>/plan.md` |
| Feature branch | `feature/<slug>` |
| Runtime progress | `.claude/progress/<slug>/` (gitignored, workflow plugin) |

## When Creating a New Plan or Feature

1. **Choose a slug** — short, descriptive, hyphenated: `custom-theme-editor`, `tracking-consolidation`
2. **Create the folder**: `docs/features/<slug>/`
3. **Write the plan**: `docs/features/<slug>/plan.md`
4. **Add to tracker**: Add an entry to `docs/tracker.json` with the slug as key
5. **Create the branch**: `feature/<slug>`

## Tracker Entry Format (v2)

```json
{
  "<slug>": {
    "title": "Human-Readable Title",
    "status": "DRAFT | APPROVED | IN_PROGRESS | IMPLEMENTED | ARCHIVED | TRACKING",
    "planFile": "docs/features/<slug>/plan.md",
    "created": "YYYY-MM-DD",
    "statusChangedAt": "YYYY-MM-DD",
    "branch": "feature/<slug>",
    "pr": null,
    "tags": ["category"]
  }
}
```

## Rules

- **No plan without a tracker entry.** If you create `docs/features/X/plan.md`, add `X` to `docs/tracker.json`.
- **No feature branch without a tracker entry.** If you create `feature/X`, add `X` to tracker.
- **Slug = folder = key = branch suffix.** They MUST match. `docs/features/foo/` + tracker key `foo` + branch `feature/foo`.
- **`npm run validate:tracker`** catches orphan folders (in `docs/features/` but not in tracker) and missing plan files.
- **On-the-fly plans** still need a tracker entry with status `DRAFT` or `IN_PROGRESS` — you can skip the plan.md file by setting `planFile: null`, but the entry MUST exist.
