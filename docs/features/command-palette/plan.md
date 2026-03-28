# Global Command Palette

> Tracker Key: `command-palette` | Status: **DRAFT** | Priority: **P1** | Created: 2026-02-26

---

## Problem

Navigation relies entirely on the sidebar. No way to quickly jump to a feature, project, task, or action without clicking through menus. Power users need keyboard-driven navigation.

## Goals

- `Cmd+K` / `Ctrl+K` opens a fuzzy-search command palette
- Search across: routes/pages, projects, tasks, recent items, actions
- Keyboard-driven: arrow keys to navigate, Enter to select, Esc to close
- Extensible: features can register their own commands

## Approach

### Component: `CommandPalette.tsx`

- Dialog overlay with search input + scrollable results list
- Grouped results: Navigation, Projects, Tasks, Actions
- Fuzzy matching (use `fuse.js` or similar lightweight fuzzy library)
- Recent items shown when input is empty
- Mounted at app root level (inside `LayoutWrapper` or `AppProviders`)

### Registry Pattern

```typescript
// Features register commands
commandRegistry.register({
  id: 'nav.dashboard',
  label: 'Go to Dashboard',
  group: 'Navigation',
  keywords: ['home', 'overview'],
  action: () => navigate({ to: '/dashboard' }),
});
```

- Static nav commands registered at mount
- Dynamic commands (projects, tasks) loaded on palette open via IPC
- Actions: theme toggle, sidebar toggle, settings sections

### Keyboard Handling

- Global `Ctrl+K` / `Cmd+K` listener (registered in app root)
- Arrow Up/Down to navigate results
- Enter to execute selected command
- Esc to close
- Type-ahead filtering with debounce

## Files

- `src/renderer/shared/components/CommandPalette.tsx` — Main component
- `src/renderer/shared/lib/command-registry.ts` — Registry + types
- `src/renderer/shared/hooks/useCommandPalette.ts` — Open/close state + keyboard handler
- Feature modules register commands in their barrel exports or route loaders

## Estimated Effort

~2 days
