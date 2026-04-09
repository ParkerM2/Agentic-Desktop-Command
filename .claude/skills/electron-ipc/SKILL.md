# ADC Electron IPC Skill

ADC uses a **domain-based typed IPC contract** with **channel constants** and a **command bus** for SQLite tracking.

## Architecture Overview

```
Renderer                    Preload              Main Process
─────────                   ───────              ────────────
ipc(CHANNEL, input)  →  contextBridge  →  IpcRouter.handle()
                                              │
                                              ├─ Zod validation
                                              ├─ bus.dispatch() → SQLite log
                                              └─ handler() → result
```

Every IPC call is tracked in SQLite via the command bus. Source attribution, duration, and status are recorded automatically.

## Directory Structure (Feature Slice Design)

```
src/shared/ipc/<domain>/
├── channels.ts   # Channel constants (DOMAIN.VERB.NOUN)
├── schemas.ts    # Zod schemas for types
├── contract.ts   # invoke + event channel definitions using constants
└── index.ts      # barrel re-exports

src/main/features/<domain>/
├── schema.ts           # Drizzle SQLite table definition
├── *-service.ts        # Business logic factory
├── *-handlers.ts       # IPC handler registration
└── [sub-modules]       # Domain-specific helpers

src/renderer/features/<domain>/
├── api/           # React Query hooks + queryKeys
├── components/    # UI components
├── hooks/         # Event hooks (useIpcEvent)
└── index.ts       # barrel
```

## Adding a New IPC Channel (Step by Step)

### 1. Channel Constants — `src/shared/ipc/<domain>/channels.ts`

```typescript
import { domain, events } from '../channel-builder';

export const WIDGETS = domain('widgets', {
  LIST: ['all'],
  CREATE: ['widget'],
  DELETE: ['widget'],
});

export const WIDGETS_EVENTS = events('widgets', {
  WIDGET: ['changed'],
});
// WIDGETS.CREATE.WIDGET = "widgets.create.widget" (literal type)
// WIDGETS_EVENTS.WIDGET.CHANGED = "event:widgets.widget.changed"
```

**NEVER use hardcoded strings.** Always import constants from channels.ts.

### 2. Schemas — `src/shared/ipc/<domain>/schemas.ts`

```typescript
import { z } from 'zod';
export const WidgetSchema = z.object({ id: z.string(), name: z.string() });
```

### 3. Contract — `src/shared/ipc/<domain>/contract.ts`

```typescript
import { z } from 'zod';
import { WIDGETS, WIDGETS_EVENTS } from './channels';
import { WidgetSchema } from './schemas';

export const widgetsInvoke = {
  [WIDGETS.LIST.ALL]:      { input: z.object({}), output: z.array(WidgetSchema) },
  [WIDGETS.CREATE.WIDGET]: { input: z.object({ name: z.string() }), output: WidgetSchema },
  [WIDGETS.DELETE.WIDGET]: { input: z.object({ id: z.string() }), output: z.object({ success: z.boolean() }) },
} as const;

export const widgetsEvents = {
  [WIDGETS_EVENTS.WIDGET.CHANGED]: { payload: z.object({ widgetId: z.string() }) },
} as const;
```

### 4. Barrel — `src/shared/ipc/<domain>/index.ts`

```typescript
export { WIDGETS, WIDGETS_EVENTS } from './channels';
export { WidgetSchema } from './schemas';
export { widgetsEvents, widgetsInvoke } from './contract';
```

### 5. Root barrel — `src/shared/ipc/index.ts`

```typescript
import { widgetsEvents, widgetsInvoke } from './widgets';
// in ipcInvokeContract:
  ...widgetsInvoke,
// in ipcEventContract:
  ...widgetsEvents,
```

### 6. Schema — `src/main/features/<domain>/schema.ts`

```typescript
import { index, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const widgets = sqliteTable('widgets', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: text('created_at').notNull(),
});
```

Re-export from `src/main/db/schema.ts` barrel.

### 7. Handler — `src/main/features/<domain>/<name>-handlers.ts`

```typescript
import { WIDGETS } from '@shared/ipc/widgets/channels';
import type { WidgetService } from './widget-service';
import type { IpcRouter } from '../../ipc/router';

export function registerWidgetHandlers(router: IpcRouter, service: WidgetService): void {
  router.handle(WIDGETS.LIST.ALL, () => Promise.resolve(service.listWidgets()));
  router.handle(WIDGETS.CREATE.WIDGET, ({ name }) => Promise.resolve(service.createWidget(name)));
  router.handle(WIDGETS.DELETE.WIDGET, ({ id }) => Promise.resolve(service.deleteWidget(id)));
}
```

### 8. Service — `src/main/features/<domain>/<name>-service.ts`

```typescript
import { desc, eq } from 'drizzle-orm';
import { WIDGETS_EVENTS } from '@shared/ipc/widgets/channels';
import { widgets } from './schema';
import type { AdcDatabase } from '../../db';
import type { IpcRouter } from '../../ipc/router';

export function createWidgetService(deps: { db: AdcDatabase; router: IpcRouter }) {
  const { db, router } = deps;
  return {
    listWidgets: () => db.select().from(widgets).orderBy(desc(widgets.createdAt)).all(),
    createWidget: (name: string) => { /* insert + emit event */ },
    deleteWidget: (id: string) => { /* delete + emit event */ },
  };
}
```

### 9. Renderer hook — `src/renderer/features/<domain>/api/useWidgets.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { WIDGETS } from '@shared/ipc/widgets/channels';
import { ipc } from '@renderer/shared/lib/ipc';
import { widgetKeys } from './queryKeys';

export function useWidgets() {
  return useQuery({
    queryKey: widgetKeys.list(),
    queryFn: () => ipc(WIDGETS.LIST.ALL, {}),
    staleTime: 60_000,
  });
}
```

## The `ipc()` Helper

`src/renderer/shared/lib/ipc.ts` — unwraps the `{ success, data, error }` envelope:
```typescript
import type { InvokeChannel, InvokeInput, InvokeOutput } from '@shared/ipc-contract';

export async function ipc<T extends InvokeChannel>(
  channel: T,
  input: InvokeInput<T>,
): Promise<InvokeOutput<T>>
```
Throws `IpcError` on failure. Always use this — never `window.api.invoke` directly.

## Command Bus

Every IPC call flows through the command bus for SQLite tracking. The bus wraps the router — no extra code needed in handlers.

- Source attribution recorded automatically (`ui`, `agent`, or `system`)
- Duration and status logged per command
- Query history: `BUS.QUERY.COMMANDS`, `BUS.QUERY.EVENTS`
- Session lifecycle: `BUS.LIST.SESSIONS`, `BUS.SPAWN.SESSION`, `BUS.KILL.SESSION`

## Path Aliases

| Alias | Target |
|-------|--------|
| `@shared/*` | `src/shared/*` |
| `@main/*` | `src/main/*` |
| `@renderer/*` | `src/renderer/*` |
| `@features/*` | `src/renderer/features/*` |
| `@ui/*` | `src/renderer/shared/components/ui/*` |

## Key Rules

- Channel names use constants: `DOMAIN.VERB.NOUN` — never string literals
- Input/output shapes defined once in contract — TypeScript propagates everywhere
- Never call `window.api.invoke` directly — always use `ipc()`
- Services use Drizzle ORM for SQLite persistence
- Import types with `import type` (ESLint enforces)
- Services + handlers co-located in `src/main/features/<domain>/`
