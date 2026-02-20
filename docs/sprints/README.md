# Sprint Planning Overview

## Sprint Roadmap

| Sprint | Theme | Status |
|--------|-------|--------|
| [Sprint 0.5](./sprint-0.5-design-system.md) | Design System Foundation (UI primitives + forms) | COMPLETE |
| [Sprint 1](./sprint-1-core-hardening.md) | Core Hardening (install → task → PR) | COMPLETE |
| [Sprint 2](./sprint-2-feature-hardening.md) | Feature Hardening (P0 UX fixes) | P0 COMPLETE |
| [Sprint 3](./sprint-3-ux-ui.md) | UX/UI (layout decomposition + themes) | NOT STARTED |
| [Sprint 4](./sprint-4-touch-up.md) | Touch Up (custom assets + beta testing) | NOT STARTED |

## Why Sprint 0.5 Comes First

The codebase audit revealed the `ui/` directory is **completely empty** — zero reusable primitives. Despite having 18 Radix packages and CVA installed, every feature component hand-builds its own buttons, inputs, cards, and dialogs from raw HTML + inline Tailwind. The numbers:

- 81 raw `<input>` elements, 16 raw `<select>`, 18 raw `<textarea>`
- 71+ manually styled buttons with duplicated Tailwind
- 102 identical spinner patterns across 46 files
- 17 of 18 Radix packages unused (only Dialog imported, in 3 files)
- CVA installed but never called

Building Sprint 0.5 first means Sprint 1/2 hardening uses the final component architecture from day one — no double work. Sprint 3 becomes layout-only (the component system is already done). Sprint 4 can iterate fast because everything is plug-and-play.
