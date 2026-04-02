# ADC Electron IPC Skill

ADC uses a **domain-based typed IPC contract** as the single source of truth for all main↔renderer communication.

## Directory Structure

```
src/shared/ipc/
├── <domain>/
│   ├── schemas.ts    # Zod schemas for types
│   ├── contract.ts   # invoke + event channel definitions
│   └── index.ts      # barrel re-exports
├── index.ts          # root barrel — merges all domains into ipcInvokeContract / ipcEventContract
└── types.ts          # InvokeChannel, InvokeInput, InvokeOutput, EventChannel, EventPayload
src/shared/ipc-contract.ts  # thin backward-compat re-export (do not modify)
```

## Adding a New IPC Channel (Step by Step)

### 1. Schemas — `src/shared/ipc/<domain>/schemas.ts`
```typescript
import { z } from 'zod';
export const WidgetSchema = z.object({ id: z.string(), name: z.string() });
```

### 2. Contract — `src/shared/ipc/<domain>/contract.ts`
```typescript
import { z } from 'zod';
import { WidgetSchema } from './schemas';

export const widgetsInvoke = {
  'widgets.list':   { input: z.object({}),                    output: z.array(WidgetSchema) },
  'widgets.create': { input: z.object({ name: z.string() }), output: WidgetSchema },
} as const;

export const widgetsEvents = {
  'event:widget.updated': { payload: z.object({ widgetId: z.string() }) },
} as const;
```

### 3. Barrel — `src/shared/ipc/<domain>/index.ts`
```typescript
export { WidgetSchema } from './schemas';
export { widgetsEvents, widgetsInvoke } from './contract';
```

### 4. Root barrel — `src/shared/ipc/index.ts`
Add import and spread into `ipcInvokeContract` / `ipcEventContract`:
```typescript
import { widgetsEvents, widgetsInvoke } from './widgets';
// in ipcInvokeContract:
  ...widgetsInvoke,
// in ipcEventContract:
  ...widgetsEvents,
```

### 5. Handler — `src/main/ipc/handlers/widget-handlers.ts`
```typescript
import type { IpcRouter } from '../router';
import type { WidgetService } from '../../services/widgets/widget-service';

export function registerWidgetHandlers(router: IpcRouter, service: WidgetService): void {
  router.handle('widgets.list',   ()           => Promise.resolve(service.listWidgets()));
  router.handle('widgets.create', ({ name })   => Promise.resolve(service.createWidget(name)));
}
```

Register in `src/main/ipc/ipc-wiring.ts` (or equivalent bootstrap file).

### 6. Service — `src/main/services/widgets/widget-service.ts`
Local services return **synchronous values**; handlers wrap in `Promise.resolve`:
```typescript
export class WidgetService {
  listWidgets(): Widget[] { return this.store.getAll(); }
  createWidget(name: string): Widget { ... }
}
```
Exception: Electron dialog calls (`selectDirectory`) and Hub API proxy services are async.

### 7. Renderer hook — `src/renderer/features/widgets/api/useWidgets.ts`
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ipc } from '@renderer/shared/lib/ipc';
import { widgetKeys } from './queryKeys';

export function useWidgets() {
  return useQuery({
    queryKey: widgetKeys.list(),
    queryFn:  () => ipc('widgets.list', {}),
    staleTime: 60_000,
  });
}

export function useCreateWidget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name }: { name: string }) => ipc('widgets.create', { name }),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: widgetKeys.lists() }); },
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
Throws `IpcError` on failure. Always use this in query functions, not `window.api.invoke` directly.

## Emitting Events (main → renderer)

```typescript
// In a handler or service:
router.emit('event:widget.updated', { widgetId: id });
```

## Consuming Events (renderer)

```typescript
import { useIpcEvent } from '@renderer/shared/hooks/useIpcEvent';

useIpcEvent('event:widget.updated', ({ widgetId }) => {
  void queryClient.invalidateQueries({ queryKey: widgetKeys.detail(widgetId) });
});
```

## Path Aliases

| Alias | Target |
|-------|--------|
| `@shared/*` | `src/shared/*` |
| `@main/*` | `src/main/*` |
| `@renderer/*` | `src/renderer/*` |
| `@features/*` | `src/renderer/features/*` |

## Key Rules

- Channel names: `domain.action` for invoke, `event:domain.action` for events
- Input/output shapes defined once in contract — TypeScript propagates everywhere
- Never call `window.api.invoke` directly in components — always use `ipc()`
- Sync services → async handlers (wrap in `Promise.resolve`)
- Import types with `import type` (ESLint enforces `consistent-type-imports`)
