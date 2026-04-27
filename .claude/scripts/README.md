# .claude/scripts/

Claude-generated automation scripts. Each script runs on specific file patterns
defined in `.claude/automate.json` → `onEdit[].scripts`.

## How to add a new script

1. Ask Claude to create the script here as `{name}.mjs`
2. Add an entry to `.claude/automate.json` `onEdit[]`:
   ```json
   {
     "glob": "src/renderer/features/*/index.ts",
     "scripts": ["your-script-name"],
     "description": "What this checks"
   }
   ```
3. Script receives `FILE_PATH`, `REL_PATH`, `PROJECT_DIR` as environment variables
4. Script must exit 0 (warnings only — never block edits)
5. Output is injected into Claude's context as a warning

## Scripts in this directory

| Script | Fires on | What it checks |
|--------|----------|----------------|
| `check-barrel-exports.mjs` | `src/renderer/features/*/index.ts` | Missing exports for components and hooks |

## Script contract

```javascript
// Receives via env:
const filePath = process.env.FILE_PATH;    // absolute path
const relPath  = process.env.REL_PATH;     // project-relative path
const root     = process.env.PROJECT_DIR;  // project root

// Output warnings to stdout (injected into Claude context)
// Always exit 0 — these are warnings, not blockers
process.exit(0);
```
