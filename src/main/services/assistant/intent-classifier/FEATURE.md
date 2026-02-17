# Intent Classifier

Two-tier system for classifying user natural-language input into structured intents with extracted entities.

## Key Files

- **`classifier.ts`** — Core classification logic. `classifyIntent()` (sync, regex-based) and `classifyIntentAsync()` (async, falls back to Claude API for ambiguous input)
- **`types.ts`** — `ClassifiedIntent` and `IntentRule` interfaces
- **`helpers.ts`** — Shared utility functions for entity extraction
- **`index.ts`** — Barrel export of classifier functions and types

## Patterns Subfolder (`patterns/`)

13 domain-specific pattern files, each exporting an array of `IntentRule` objects:

`calendar`, `device`, `email`, `fitness`, `github`, `misc`, `notes`, `planner`, `quickcmd`, `spotify`, `task`, `watch` patterns + `index.ts` (merges all rules into `ALL_INTENT_RULES`)

Each rule defines a regex `pattern`, the resulting `IntentType`, a `confidence` score, and an `extractEntities` function.

## Classification Flow

1. **Tier 1** (sync): Regex rules matched in order, first match wins. High-confidence matches (>= 0.85) return immediately.
2. **Tier 2** (async): Low-confidence results fall back to the Claude API via `classifyWithClaude()` in `../claude-classifier.ts`.
