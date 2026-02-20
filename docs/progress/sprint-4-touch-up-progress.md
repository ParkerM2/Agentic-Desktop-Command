# Sprint 4: Touch Up — Progress Report

**Status**: IMPLEMENTED
**Branch**: `feature/sprint-4-touch-up`
**Date**: 2026-02-20

## Summary

Sprint 4 focused on visual polish and UX improvements across 4 tasks in 1 wave. All tasks completed with zero lint errors, zero typecheck errors, 156/156 tests passing, and successful builds.

## Wave 1 (All Parallel)

| Task | Description | Status | Files Changed |
|------|-------------|--------|---------------|
| T1 | Custom frameless title bar + window controls | DONE | 11 files (242 ins) |
| T2 | EmptyState UI primitive + 3 migrations | DONE | 7 files (218 ins) |
| T3 | Button/Input/Textarea micro-interactions | DONE | 4 files (23 ins) |
| T4 | Scrollbar dark mode color-mix fix | DONE | 1 file (2 ins, 11 del) |

## Key Deliverables

### T1: Custom Title Bar
- Set `frame: false` on BrowserWindow for frameless window
- Created new IPC domain: `src/shared/ipc/window/` (contract, schemas, index)
- Created `window-handlers.ts` with minimize, maximize, close, isMaximized handlers
- Created `TitleBar.tsx` (116 lines): 32px custom title bar with drag region, ADC branding, and window control buttons
- Integrated into RootLayout above the panel Group
- Uses `.electron-drag` class for window dragging

### T2: EmptyState Component
- Created `src/renderer/shared/components/ui/empty-state.tsx` (124 lines)
- CVA size variants: sm, md, lg
- Props: icon, title, description, action (button slot), size, className
- Migrated 3 inline implementations: BriefingPage, MyWorkPage, TerminalGrid
- Exported from `@ui` barrel

### T3: Micro-Interactions
- Button: `transition-all duration-150`, `active:scale-[0.98]`, `focus-visible:ring-offset-2`, `hover:shadow-sm` on primary/secondary
- Input: `transition-all duration-150`, `focus-visible:shadow-sm`
- Textarea: same as Input

### T4: Scrollbar Fix
- Removed `.dark ::-webkit-scrollbar-thumb` rules with hardcoded `rgba()` values
- Unified both modes with `color-mix(in srgb, var(--muted-foreground) 30%, transparent)`
- Now adapts to ALL themes automatically

## Verification

- **Lint**: 0 errors (27 warnings, pre-existing)
- **Typecheck**: clean
- **Tests**: 156/156 passing
- **Build**: success
- **Codebase Guardian**: PASS

## New Files Created

- `src/shared/ipc/window/contract.ts` — Window control IPC contract
- `src/shared/ipc/window/schemas.ts` — Zod schemas for window channels
- `src/shared/ipc/window/index.ts` — Domain barrel
- `src/main/ipc/handlers/window-handlers.ts` — Window control handlers
- `src/renderer/app/layouts/TitleBar.tsx` — Custom title bar component
- `src/renderer/shared/components/ui/empty-state.tsx` — EmptyState UI primitive
