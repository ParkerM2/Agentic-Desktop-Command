---
title: "Codebase Upgrade + Test Suite"
status: backlog
priority: high
tags: [architecture, testing, refactor, enterprise]
---

# Codebase Upgrade + Test Suite

Enterprise-readiness refactor of ADC across three sprints: architectural consolidation, compositional UI library + test hardening, and QA recorder feature (BrowserView + Claude + Playwright for automated website testing).

## Goal

Transform ADC from a 50-domain sprawl into a focused 18-domain two-app architecture (Workspace + Personal), with a compositional UI library that standardizes all pages, a hardened E2E test suite that survives refactors, and a new QA Recorder feature that uses Electron's webview + Playwright + Claude to automate website testing.

## Sprints

1. **Sprint 1 — Foundation** (Architecture): Domain consolidation (50 → 18), lazy service init, JSON store elimination, import enforcement, security gaps
2. **Sprint 2 — UI + Testing** (Components + Coverage): Compositional UI library (PageShell, DataGrid, FilterBar, etc.), POM conversion, broken test fixes, test infrastructure hardening, gap fills
3. **Sprint 3 — QA Recorder** (Product Feature): BrowserView + recorder preload + Playwright runner + Claude integration for automated website testing

## Key Docs

- `docs/architecture/DEFINITIVE-STRUCTURE.md` — Target architecture (v2)
- `docs/architecture/adc-architecture-explorer.html` — Current state interactive explorer
- `docs/architecture/enterprise-readiness-analysis.html` — Pro/con analysis
- `docs/testing/E2E-TEST-SUITE.md` — Current test coverage (136 tests, 15 specs)
- `docs/QA-Feature-Research.md` — QA Recorder feature research (on master, PR #109)
