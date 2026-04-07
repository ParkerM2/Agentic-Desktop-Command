# Assistant Popover Refactor — Stub

> **Status**: QUEUED (after Agent Harness + Sidenav Restructure)
> **Priority**: P2
> **Created**: 2026-04-06

## Problem

`WidgetPanel` is a fully custom fixed-position popup with manual animation, hardcoded `bg-card`, and inline `style={{ left }}` positioning. This violates the project rule of using `@ui` primitives.

## Solution

Replace `WidgetPanel` with the `Popover` primitive from `@ui/popover` (Radix-based).

### Changes

**File: `src/renderer/features/assistant/components/WidgetPanel.tsx`**
- Replace the `fixed` positioned `<div>` with `<PopoverContent>` from `@ui/popover`
- Uses `bg-popover text-popover-foreground` theme tokens (not `bg-card`)
- Built-in open/close animations via Radix data attributes
- Portaled automatically — no z-index management needed

**File: `src/renderer/features/assistant/components/AssistantWidget.tsx`**
- Wrap with `<Popover open={mode === 'popup'} onOpenChange={...}>`
- The trigger is the sidebar button (already exists as `SidebarAssistantButton`)
- Wire Zustand store's `mode` state to Radix's `open` prop

**File: `src/renderer/features/assistant/components/SidebarAssistantButton.tsx`**
- Wrap the collapsed-mode button with `<PopoverTrigger asChild>`
- When clicked in collapsed sidebar, opens the popover anchored to the button
- Inline mode stays unchanged (not a popover)

### Considerations
- `PopoverContent` needs `side="top"` and `align="start"` to position above/right of the sidebar button
- Width override: `w-[380px]` on `PopoverContent` (same as current)
- Min/max height: `min-h-[40vh] max-h-[70vh]` carried over
- Focus management handled by Radix automatically (currently manual in `useEffect`)
- Escape to close handled by Radix (currently manual keydown listener)
